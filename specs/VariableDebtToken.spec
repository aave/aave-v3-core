using LendingPoolHarnessForVariableDebtToken as POOL

/**
Checks that each possible opertaion changes the balance of at most one user.
*/
rule balanceOfChange(address a, address b, method f)
{
	env e;
	require a != b;
	uint256 balanceABefore = sinvoke balanceOf(e, a);
	uint256 balanceBBefore = sinvoke balanceOf(e, b);
	 
	calldataarg arg;
	sinvoke f(e, arg); 

	uint256 balanceAAfter = sinvoke balanceOf(e, a);
	uint256 balanceBAfter = sinvoke balanceOf(e, b);
	
	assert (balanceABefore == balanceAAfter || balanceBBefore == balanceBAfter);
}

/**
Checks that the change to total supply is coherent with the change to the balance due to an operation
(which is neither a burn nor a mint).
*/
rule integirtyBalanceOfTotalSupply(address a, method f)
{
	env e;
	
	uint256 balanceABefore = balanceOf(e, a);
	uint256 totalSupplyBefore = totalSupply(e);
	 
	calldataarg arg;
	sinvoke f(e, arg); 
	require (f.selector != burn(address, uint256, uint256).selector  &&
		f.selector != mint(address, address, uint256, uint256).selector);
	uint256 balanceAAfter = balanceOf(e, a);
	uint256 totalSupplyAfter = totalSupply(e);

	assert  (balanceAAfter != balanceABefore  => ( balanceAAfter - balanceABefore  == totalSupplyAfter - totalSupplyBefore));
}

/**
Checks that the change to total supply is coherent with the change to the balance due to a burn operation.
*/
rule integirtyBalanceOfTotalSupplyOnBurn(address a)
{
	env e;
	
	uint256 balanceABefore = balanceOf(e, a);
	uint256 totalSupplyBefore = totalSupply(e);
	 
	uint256 x;
	address asset;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e, asset);
	sinvoke burn(e, a, x, index); 
	uint256 balanceAAfter = balanceOf(e, a);
	uint256 totalSupplyAfter = totalSupply(e);
	assert (balanceAAfter != balanceABefore  => (balanceAAfter - balanceABefore  == totalSupplyAfter - totalSupplyBefore));
}

/**
Checks that the change to total supply is coherent with the change to the balance due to a mint operation.
*/
rule integirtyBalanceOfTotalSupplyOnMint(address u, address delegatedUser)
{
	env e;
	
	uint256 balanceUBefore = balanceOf(e, u);
	uint256 totalSupplyBefore = totalSupply(e);
	 
	uint256 x;
	address asset;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e, asset);
	sinvoke mint(e, delegatedUser, u, x, index); 
	uint256 balanceUAfter = balanceOf(e, u);
	uint256 totalSupplyAfter = totalSupply(e);
	assert (balanceUAfter != balanceUBefore  => (balanceUAfter - balanceUBefore  == totalSupplyAfter - totalSupplyBefore));
}

/**
Minting an amount of x tokens for user u increases her balance by x, up to rounding errors. 
{ b = balanceOf(u,t) } 
mint(delegatedUser, u, x, index) 
{ balanceOf(u,t) = b + x }.

Also, if the minting is done by a user delegatedUser different than u, the balance of delegatedUser
remains unchanged.
*/
rule integrityMint(address u, address delegatedUser, uint256 x) {
	env e;
	address asset;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e,asset);
	uint256 balanceUBefore = balanceOf(e, u);
	uint256 balanceDelegatedUBefore = balanceOf(e, delegatedUser);
	sinvoke mint(e, delegatedUser, u, x, index);
	
	uint256 balanceUAfter = balanceOf(e, u);
	uint256 balanceDelegatedUAfter = balanceOf(e, delegatedUser);
	
	assert balanceUAfter == balanceUBefore + x && (u != delegatedUser => (balanceDelegatedUAfter == balanceDelegatedUBefore));
}

/**
Mint is additive, namely it can performed either all at once or gradually:
mint(delegatedUser, u, x, index); mint(delegatedUser, u, y, index) ~ mint(delegatedUser, u, x+y, index) at the same timestamp.
*/
rule additiveMint(address a, address delegatedUser, uint256 x, uint256 y) {
	env e;
	address asset;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e, asset);
	storage initialStorage = lastStorage;
	sinvoke mint(e, delegatedUser, a, x, index);
	sinvoke mint(e, delegatedUser, a, y, index);
	uint256 balanceScenario1 = balanceOf(e, a);
	uint256 t = x + y;
	sinvoke mint(e, delegatedUser, a, t ,index) at initialStorage;

	uint256 balanceScenario2 = balanceOf(e, a);
	assert balanceScenario1 == balanceScenario2, "mint is not additive";
}

/** 
Burning an amount of x tokens for user u decreases her balance by x, up to rounding errors. 
{ bu = balanceOf(u) } 
	burn(u, x)
{ balanceOf(u) = bu - x }.
*/
rule integrityBurn(address a, uint256 x) {
	env e;
	address asset;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e, asset);
	uint256 balancebefore = balanceOf(e, a);
	sinvoke burn(e, a, x, index);
	
	uint256 balanceAfter = balanceOf(e, a);
	assert balanceAfter == balancebefore - x;
}
/**
Minting is additive, i.e., it can be performed either all at once or in steps:
burn(u, x); burn(u, y) ~ burn(u, x+y) at the same timestamp.
*/
rule additiveBurn(address a, uint256 x,  uint256 y) {
	env e;
	address asset;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e, asset);
	storage initialStorage = lastStorage;
	sinvoke burn(e, a, x, index);
	sinvoke burn(e, a, y, index);
	uint256 balanceScenario1 = balanceOf(e, a);
	uint256 t = x + y;
	sinvoke burn(e, a, t ,index) at initialStorage;

	uint256 balanceScenario2 = balanceOf(e, a);
	assert balanceScenario1 == balanceScenario2, "burn is not additive";
}

/**
Minting and burning are inverse operations:
{ bu = balanceOf(u) } 
mint(u,x); burn(u, u, x) 
{ balanceOf(u) = bu }.
*/
rule inverseMintBurn(address a, uint256 x) {
	env e;
	address asset;
	address delegatedUser;
	uint256 index = POOL.getReserveNormalizedVariableDebt(e, asset);
	uint256 balancebefore = balanceOf(e, a);
	sinvoke mint(e, delegatedUser, a, x, index);
	sinvoke burn(e, a, x, index);
	uint256 balanceAfter = balanceOf(e, a);
	assert balancebefore == balanceAfter, "burn is not the inverse of mint";
}