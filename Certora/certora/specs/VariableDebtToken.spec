methods {
	getReserveNormalizedVariableDebt(address asset) returns (uint256) => ALWAYS(1000000000000000000000000000)
	setAdditionalData(address user, uint128 data) envfree 
}

definition ray() returns uint = 1000000000000000000000000000;

ghost sumAllBalance() returns uint256 {
    init_state axiom sumAllBalance() == 0;
}

hook Sstore _userState[KEY address a].balance uint128 balance (uint128 old_balance) STORAGE {
  havoc sumAllBalance assuming sumAllBalance@new() == sumAllBalance@old() + balance - old_balance;
}

invariant totalSupplyEqualsSumAllBalance(env e)
    totalSupply(e) <= sumAllBalance()


rule whoChangeTotalSupply(method f) filtered { f ->  !f.isView } {
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

rule balanceOfChange(address a, address b, method f) filtered { f ->  !f.isView }
{
	env e;
	require a != b;
	uint256 balanceABefore = balanceOf(e, a);
	uint256 balanceBBefore = balanceOf(e, b);
	 
	calldataarg arg;
    f(e, arg); 

	uint256 balanceAAfter = balanceOf(e, a);
	uint256 balanceBAfter = balanceOf(e, b);
	
	assert (balanceABefore == balanceAAfter || balanceBBefore == balanceBAfter);
}

rule nonceChangePermits(method f) filtered { f ->  !f.isView } {
    env e;
    address user;
    uint256 oldNonce = nonces(e, user);
    calldataarg args;
    f(e, args);
    uint256 newNonce = nonces(e, user);
    assert oldNonce != newNonce => f.selector == delegationWithSig(address, address, uint256, uint256, uint8, bytes32, bytes32).selector;
}

rule inverseMintBurn(address a, address delegatedUser, uint256 amount, uint256 index) {
	env e;
	uint256 balancebefore = balanceOf(e, a);
	mint(e, delegatedUser, a, amount, index);
	burn(e, a, amount, index);
	uint256 balanceAfter = balanceOf(e, a);
	assert balancebefore == balanceAfter, "burn is not the inverse of mint";
}

rule integrityDelegationWithSig(address delegator, address delegatee, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) {
    env e;
    uint256 oldNonce = nonces(e, delegator);
    delegationWithSig(e, delegator, delegatee, value, deadline, v, r, s);
    assert nonces(e, delegator) == oldNonce + 1 && borrowAllowance(e, delegator, delegatee) == value;
}

rule additiveBurn(address a, address b, uint256 x,  uint256 y) {
	env e;
	uint256 index = ray();
	require(a != b && balanceOf(e, a) == balanceOf(e, b));
	burn(e, a, x, index);
	burn(e, a, y, index);
	uint256 balanceScenario1 = balanceOf(e, a);
	uint256 t = x + y;
	burn(e, b, t, index);
	uint256 balanceScenario2 = balanceOf(e, b);
	assert balanceScenario1 == balanceScenario2, "burn is not additive";
}

// additiveMint

rule integrityMint(address a, uint256 x) {
	env e;
	address delegatedUser;
	uint256 index = ray();
	uint256 balancebefore = balanceOf(e,a);
	mint(e, delegatedUser, a, x, index);
	
	uint256 balanceAfter = balanceOf(e,a);
	assert balanceAfter == balancebefore+x;
}

rule burnZeroDoesntChangeBalance(address u, uint256 index) {
	env e;
	uint256 balanceBefore = balanceOf(e, u);
	invoke burn(e, u, 0, index);
	uint256 balanceAfter = balanceOf(e, u);
	assert balanceBefore == balanceAfter;
}

rule burnNoChangeToOther(address user, uint256 amount, uint256 index, address other) {
  
	require other != user;
	
	env e;
	uint256 otherBalanceBefore = balanceOf(e, other);
	
	burn(e, user, amount, index);
	
	uint256 otherBalanceAfter = balanceOf(e, other);

	assert otherBalanceBefore == otherBalanceAfter;
}

rule mintNoChangeToOther(address user, address onBehalfOf, uint256 amount, uint256 index, address other) {
	require other != user && other != onBehalfOf;

	env e;
	uint256 userBalanceBefore = balanceOf(e, user);
	uint256 otherBalanceBefore = balanceOf(e, other);

	mint(e, user, onBehalfOf, amount, index);

  	uint256 userBalanceAfter = balanceOf(e, user);
	uint256 otherBalanceAfter = balanceOf(e, other);

	if (user != onBehalfOf) {
		assert userBalanceBefore == userBalanceAfter ; 
	}

	assert otherBalanceBefore == otherBalanceAfter ;
}