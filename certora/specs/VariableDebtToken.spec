methods {
	// summarization for elimination the raymul operation in balance of and totalSupply.
	getReserveNormalizedVariableDebt(address asset) returns (uint256) => gRNVB()
	setAdditionalData(address user, uint128 data) envfree
    handleAction(address, uint256, uint256) => NONDET
    scaledBalanceOfToBalanceOf(uint256) returns (uint256) envfree
    balanceOf(address) returns (uint256) envfree
}

definition ray() returns uint = 1000000000000000000000000000;
definition bound() returns uint = ((gRNVB() / ray()) + 1 ) / 2;
// summerization for scaledBlanaceOf -> regularBalanceOf + 0.5 (canceling the rayMul)
ghost gRNVB() returns uint256 {
	axiom gRNVB() == 7 * ray();
}
/*
Due to rayDiv and RayMul Rounding (+ 0.5) - blance could increase by (gRNI() / Ray() + 1) / 2.
*/
definition bounded_error_eq(uint x, uint y, uint scale) returns bool = x <= y + (bound() * scale) && x + (bound() * scale) >= y;



definition disAllowedFunctions(method f) returns bool = 
            f.selector == transfer(address, uint256).selector ||
            f.selector == allowance(address, address).selector ||
            f.selector == approve(address, uint256).selector ||
            f.selector == transferFrom(address, address, uint256).selector ||
            f.selector == increaseAllowance(address, uint256).selector ||
            f.selector == decreaseAllowance(address, uint256).selector;


ghost sumAllBalance() returns uint256 {
    init_state axiom sumAllBalance() == 0;
}

hook Sstore _userState[KEY address a].balance uint128 balance (uint128 old_balance) STORAGE {
  havoc sumAllBalance assuming sumAllBalance@new() == sumAllBalance@old() + balance - old_balance;
}

invariant totalSupplyEqualsSumAllBalance(env e)
    totalSupply(e) == scaledBalanceOfToBalanceOf(sumAllBalance())
    filtered { f -> !f.isView && !disAllowedFunctions(f) }
    {
        preserved mint(address user, address onBehalfOf, uint256 amount, uint256 index) with (env e2) {
            require index == gRNVB();
        }
        preserved burn(address from, uint256 amount, uint256 index) with (env e3) {
            require index == gRNVB();
        }
    }


// Only the pool with burn or mint operation can change the total supply. (assuming the getReserveNormalizedVariableDebt is not changed)
rule whoChangeTotalSupply(method f) 
    filtered { f ->  !f.isView && !disAllowedFunctions(f) } 
{
    env e;
    uint256 oldTotalSupply = totalSupply(e);
    calldataarg args;
    f(e, args);
    uint256 newTotalSupply = totalSupply(e);
    assert oldTotalSupply != newTotalSupply => 
           (e.msg.sender == POOL(e) && 
           (f.selector == burn(address, uint256, uint256).selector || 
            f.selector == mint(address, address, uint256, uint256).selector));
}

/*
Each operation of Variable Debt Token can change at most one user's balance.
*/
rule balanceOfChange(address a, address b, method f) 
    filtered { f ->  !f.isView && !disAllowedFunctions(f) }
{
	env e;
	require a != b;
	uint256 balanceABefore = balanceOf(a);
	uint256 balanceBBefore = balanceOf(b);
	 
	calldataarg arg;
    f(e, arg); 

	uint256 balanceAAfter = balanceOf(a);
	uint256 balanceBAfter = balanceOf(b);
	
	assert (balanceABefore == balanceAAfter || balanceBBefore == balanceBAfter);
}

// only delegationWithSig operation can change the nonce.
rule nonceChangePermits(method f) 
    filtered { f ->  !f.isView && !disAllowedFunctions(f) } 
{
    env e;
    address user;
    uint256 oldNonce = nonces(e, user);
    calldataarg args;
    f(e, args);
    uint256 newNonce = nonces(e, user);
    assert oldNonce != newNonce => f.selector == delegationWithSig(address, address, uint256, uint256, uint8, bytes32, bytes32).selector;
}

// minting and then buring Variable Debt Token should have no effect on the users balance
rule inverseMintBurn(address a, address delegatedUser, uint256 amount, uint256 index) {
	env e;
	uint256 balancebefore = balanceOf(a);
	mint(e, delegatedUser, a, amount, index);
	burn(e, a, amount, index);
	uint256 balanceAfter = balanceOf(a);
	assert balancebefore == balanceAfter, "burn is not the inverse of mint";
}

rule integrityDelegationWithSig(address delegator, address delegatee, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) {
    env e;
    uint256 oldNonce = nonces(e, delegator);
    delegationWithSig(e, delegator, delegatee, value, deadline, v, r, s);
    assert nonces(e, delegator) == oldNonce + 1 && borrowAllowance(e, delegator, delegatee) == value;
}

/**
Burning user u amount of amount tokens, decreases his balanceOf the user by amount. 
(balance is decreased by amount and not scaled amount because of the summarization to one ray)
*/
rule integrityOfBurn(address u, uint256 amount) {
	env e;
	uint256 index = gRNVB();
	uint256 balanceBeforeUser = balanceOf(u);
	uint256 totalSupplyBefore = totalSupply(e); 

	burn(e, u, amount, index);
	
	uint256 balanceAfterUser = balanceOf(u);
	uint256 totalSupplyAfter = totalSupply(e);

    assert bounded_error_eq(totalSupplyAfter, totalSupplyBefore - amount, 1), "total supply integrity"; // total supply reduced
    assert bounded_error_eq(balanceAfterUser, balanceBeforeUser - amount, 1), "integrity break";  // user burns ATokens to recieve underlying
}

/*
Burn is additive, can performed either all at once or gradually
burn(from,to,x,index); burn(from,to,y,index) ~ burn(from,to,x+y,index) at the same initial state
*/
rule additiveBurn(address user1, address user2, uint256 x, uint256 y) {
	env e;
	uint256 index = gRNVB();
    require (user1 != user2  && balanceOf(user1) == balanceOf(user2));
	require user1 != currentContract && user2 != currentContract;

    burn(e, user1, x, index);
	burn(e, user1, y, index);
	uint256 balanceScenario1 = balanceOf(user1);

	burn(e, user2, x+y, index);
	uint256 balanceScenario2 = balanceOf(user2);

    assert bounded_error_eq(balanceScenario1, balanceScenario2, 3), "burn is not additive";
	// assert balanceScenario1 == balanceScenario2, "burn is not additive";
}

/*
Mint is additive, can performed either all at once or gradually
mint(from,to,x,index); mint(from,to,y,index) ~ mint(from,to,x+y,index) at the same initial state
*/
rule additiveMint(address user1, address user2, address user3, uint256 x, uint256 y) {
	env e;
	uint256 index = gRNVB();
    require (user1 != user2  && balanceOf(user1) == balanceOf(user2));

    mint(e, user3, user1, x, index);
	mint(e, user3, user1, y, index);
	uint256 balanceScenario1 = balanceOf(user1);

	mint(e, user3, user2, x+y, index);
	uint256 balanceScenario2 = balanceOf(user2);

    assert bounded_error_eq(balanceScenario1, balanceScenario2, 3), "burn is not additive";
	// assert balanceScenario1 == balanceScenario2, "burn is not additive";
}

/**
Mint to user u amount of x tokens, increases his balanceOf the user by x. 
(balance is increased by x and not scaled x because of the summarization to one ray)
*/
rule integrityMint(address a, uint256 x) {
	env e;
	address delegatedUser;
	uint256 index = gRNVB();
	uint256 underlyingBalanceBefore = balanceOf(a);
	uint256 atokenBlanceBefore = scaledBalanceOf(e, a);
	uint256 totalATokenSupplyBefore = scaledTotalSupply(e);
	mint(e, delegatedUser, a, x, index);
	
	uint256 underlyingBalanceAfter = balanceOf(a);
	uint256 atokenBlanceAfter = scaledBalanceOf(e, a);
	uint256 totalATokenSupplyAfter = scaledTotalSupply(e);

	assert atokenBlanceAfter - atokenBlanceBefore == totalATokenSupplyAfter - totalATokenSupplyBefore;
	assert totalATokenSupplyAfter > totalATokenSupplyBefore;
    assert bounded_error_eq(underlyingBalanceAfter, underlyingBalanceBefore+x, 1);
    // assert balanceAfter == balancebefore+x;
}

// Buring zero amount of tokens should have no effect.
rule burnZeroDoesntChangeBalance(address u, uint256 index) {
	env e;
	uint256 balanceBefore = balanceOf(u);
	invoke burn(e, u, 0, index);
	uint256 balanceAfter = balanceOf(u);
	assert balanceBefore == balanceAfter;
}

/*
Burning one user atokens should have no effect on other users that are not involved in the action.
*/
rule burnNoChangeToOther(address user, uint256 amount, uint256 index, address other) {
  
	require other != user;
	
	env e;
	uint256 otherBalanceBefore = balanceOf(other);
	
	burn(e, user, amount, index);
	
	uint256 otherBalanceAfter = balanceOf(other);

	assert otherBalanceBefore == otherBalanceAfter;
}

/*
Minting ATokens for a user should have no effect on other users that are not involved in the action.
*/
rule mintNoChangeToOther(address user, address onBehalfOf, uint256 amount, uint256 index, address other) {
	require other != user && other != onBehalfOf;

	env e;
	uint256 userBalanceBefore = balanceOf(user);
	uint256 otherBalanceBefore = balanceOf(other);

	mint(e, user, onBehalfOf, amount, index);

  	uint256 userBalanceAfter = balanceOf(user);
	uint256 otherBalanceAfter = balanceOf(other);

	if (user != onBehalfOf) {
		assert userBalanceBefore == userBalanceAfter ; 
	}

	assert otherBalanceBefore == otherBalanceAfter ;
}

/*
Ensuring that the defined disallowed functions revert in any case.
*/
rule disallowedFunctionalities(method f)
    filtered { f -> disAllowedFunctions(f) }
{
    env e; calldataarg args;
    f@withrevert(e, args);
    assert lastReverted;
}