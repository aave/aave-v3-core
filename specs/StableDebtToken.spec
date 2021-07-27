methods {
	getUserLastUpdated(address) returns uint40 envfree
}

rule integrityTimeStamp(address user, method f) {
	env e;
	require sinvoke getIncentivesController(e) == 0;
	require getUserLastUpdated(user) <= e.block.timestamp;
	calldataarg arg;
	sinvoke f(e,arg);
	assert getUserLastUpdated(user) <= e.block.timestamp;
}

/**
TotalSupply is the sum of all users’ balances
	
totalSupply(t) = Σaddress u. balanceOf(u,t).

Checks that each possible operation changes the balance of at most one user.
*/
rule balanceOfChange(address a, address b, method f)
{
	env e;
	require a!=b;
	require sinvoke getIncentivesController(e) == 0;
	uint256 balanceABefore = sinvoke balanceOf(e, a);
	uint256 balanceBBefore = sinvoke balanceOf(e, b);
	 
	calldataarg arg;
	sinvoke f(e, arg); 

	uint256 balanceAAfter = sinvoke balanceOf(e, a);
	uint256 balanceBAfter = sinvoke balanceOf(e, b);
	
	assert (balanceABefore == balanceAAfter || balanceBBefore == balanceBAfter );
}

/**
Checks that the change to total supply is coherent with the change to user balance due to an operation
(which is not burn).
*/
rule integirtyBalanceOfTotalSupply(address a, method f )
{
	env e;
	require sinvoke getIncentivesController(e) == 0;
	uint256 balanceABefore = sinvoke balanceOf(e, a);
	uint256 totalSupplyBefore = sinvoke totalSupply(e);
	 
	calldataarg arg;
	sinvoke f(e, arg); 
	require (f.selector != burn(address, uint256).selector);
	uint256 balanceAAfter = sinvoke balanceOf(e, a);
	uint256 totalSupplyAfter = sinvoke totalSupply(e);

	assert  (balanceAAfter != balanceABefore  => (balanceAAfter - balanceABefore  == totalSupplyAfter - totalSupplyBefore));
}


/**
Checks that the change to total supply is coherent with the change to user balance due to a burn operation.
*/
rule integirtyBalanceOfTotalSupplyOnBurn(address a, uint256 x)
{
	env e;
	require sinvoke getIncentivesController(e) == 0;
	
	uint256 balanceABefore = sinvoke balanceOf(e, a);
	
	uint256 totalSupplyBefore = sinvoke totalSupply(e);
	uint256 averageStableRateBefore = sinvoke getAverageStableRate(e);
	uint256 debtSupplyBefore = sinvoke rayWadMul(e, averageStableRateBefore, totalSupplyBefore);
	
	uint256 stableRateA = sinvoke getUserStableRate(e, a);
	uint256 repaidDebtA = sinvoke rayWadMul(e, stableRateA, x);
	
	
	sinvoke burn(e, a, x); 
	uint256 balanceAAfter = sinvoke balanceOf(e, a);
	uint256 totalSupplyAfter = sinvoke totalSupply(e);

	if(totalSupplyBefore > x) {
	    /* The amount being burned (x) is smaller than the total supply */
		if(repaidDebtA >= debtSupplyBefore) {
			/*
			The user debt being repaid is at least the debt supply.
			The total supply becomes 0.
			*/
			assert(totalSupplyAfter == 0);
		}
		else {
			assert(balanceAAfter != balanceABefore  =>
			(balanceAAfter - balanceABefore  == totalSupplyAfter - totalSupplyBefore));
		}
	}
	else {
	/* The amount being burned (x) is at least the total supply.
	   The total supply becomes 0.
	*/
		assert (totalSupplyAfter == 0);
	}
}

/**
Mint increases the balanceOf user a as expected.
*/
rule integrityMint(address a, uint256 x) {
	env e;
	address delegatedUser;
	require sinvoke getIncentivesController(e) == 0;
	uint256 index;
	uint256 balancebefore = sinvoke balanceOf(e,a);
	sinvoke mint(e, delegatedUser, a, x, index);
	
	uint256 balanceAfter = sinvoke balanceOf(e,a);
	assert balanceAfter == balancebefore+x;
}

/**
Mint is additive, namely it can performed either all at once or gradually:
mint(u, x); mint(u, y) ~ mint(u, x+y) at the same timestamp.

Note: We assume that the stable rate of the user is 0.
The case where the rate is non-zero takes much more time to prove,
and therefore it is currently excluded from the CI.
*/
rule additiveMint(address a, uint256 x, uint256 y) {
	env e;
	address delegatedUser;
	require sinvoke getIncentivesController(e) == 0;
	require getUserStableRate(e, a) == 0;
	uint256 index;
	storage initialStorage = lastStorage;
	sinvoke mint(e, delegatedUser, a, x, index);
	sinvoke mint(e, delegatedUser, a, y, index);
	uint256 balanceScenario1 = sinvoke balanceOf(e, a);
	
	uint256 t = x + y;
	sinvoke mint(e, delegatedUser, a, t ,index) at initialStorage;
	
	uint256 balanceScenario2 = sinvoke balanceOf(e, a);
	assert balanceScenario1 == balanceScenario2, "mint is not additive";
}

rule integrityBurn(address a, uint256 x) {
	env e;
	require sinvoke getIncentivesController(e) == 0;
	uint256 index;
	uint256 balancebefore = sinvoke balanceOf(e, a);
	sinvoke burn(e,a,x);
	
	uint256 balanceAfter = sinvoke balanceOf(e, a);
	assert balanceAfter == balancebefore - x;
}

rule additiveBurn(address a, uint256 x,  uint256 y) {
	env e;
	require sinvoke getIncentivesController(e) == 0;
	storage initialStorage = lastStorage;
	sinvoke burn(e, a, x);
	sinvoke burn(e, a, y);
	uint256 balanceScenario1 = balanceOf(e, a);
	uint256 t = x + y;
	sinvoke burn(e, a, t) at initialStorage;

	uint256 balanceScenario2 = balanceOf(e, a);
	assert balanceScenario1 == balanceScenario2, "burn is not additive";
}


/**
Mint and burn are inverse operations.
Therefore, both totalSupply and BalanceOf user are back to the initial state.
*/
rule inverseMintBurn(address a, uint256 x) {
	env e;
	address delegatedUser;
	require sinvoke getIncentivesController(e) == 0;
	uint256 index;
	uint256 balancebefore = sinvoke balanceOf(e, a);
	sinvoke mint(e, delegatedUser, a, x, index);
	sinvoke burn(e, a, x);
	uint256 balanceAfter = sinvoke balanceOf(e, a);
	assert balancebefore == balanceAfter, "burn is not the inverse of mint";
}