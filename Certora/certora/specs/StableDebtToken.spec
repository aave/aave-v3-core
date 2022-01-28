methods {
    calculateCompoundedInterest(uint256 r, uint40 l) returns (uint256) => symbolicCompundInterest(r, l)
	additionalData(address) returns uint128 envfree
	getAverageStableRate() returns uint256 envfree
	handleAction(address account, uint256 oldTotalSupply, uint128 oldAccountBalance) => NONDET
}

ghost symbolicCompundInterest(uint256, uint40) returns uint256 {
    axiom forall uint256 x. forall uint40 t. symbolicCompundInterest(x, t) >= 1;
}

// ghost symbolic_compund_interest(uint256, uint40, uint256) returns uint256 {
//     axiom forall uint256 x. forall uint40 t1. forall uint256 t2. symbolic_compund_interest(x, t1, t2) >= 10;
// }

ghost sumAllBalance() returns uint256 {
    init_state axiom sumAllBalance() == 0;
}

hook Sstore _userState[KEY address a].balance uint128 balance (uint128 old_balance) STORAGE {
  havoc sumAllBalance assuming sumAllBalance@new() == sumAllBalance@old() + balance - old_balance;
}
hook Sload uint128 balance _userState[KEY address a].balance  STORAGE {
  require sumAllBalance() >= balance;
}

invariant totalSupplyEqualsSumAllBalance(env e)
    totalSupply(e) <= sumAllBalance()



invariant principalLessThanBalance(env e, address user)
    principalBalanceOf(e, user) <= balanceOf(e, user)

rule integrityBurn(address a, uint256 x) {
	env e;
	require getIncentivesController(e) == 0;
	uint256 index;
	uint256 balancebefore = balanceOf(e, a);
	burn(e,a,x);
	
	uint256 balanceAfter = balanceOf(e, a);
	assert balanceAfter == balancebefore - x;
}

rule integrityMint(address a, uint256 x) {
	env e;
	address delegatedUser;
	require getIncentivesController(e) == 0;
	uint256 index;
	uint256 balancebefore = balanceOf(e,a);
	mint(e, delegatedUser, a, x, index);
	
	uint256 balanceAfter = balanceOf(e,a);
	assert balanceAfter == balancebefore+x;
}

rule integrityTimeStamp(address user, method f) filtered { f ->  !f.isView } {
	env e;
	require getUserLastUpdated(e, user) <= e.block.timestamp;
	calldataarg arg;
    f(e,arg);
	assert getUserLastUpdated(e, user) <= e.block.timestamp;
}

rule integrityDelegationWithSig(address delegator, address delegatee, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) {
    env e;
    uint256 oldNonce = nonces(e, delegator);
    delegationWithSig(e, delegator, delegatee, value, deadline, v, r, s);
    assert nonces(e, delegator) == oldNonce + 1 && borrowAllowance(e, delegator, delegatee) == value;
}

rule additiveBurn(address a, uint256 x,  uint256 y) {
	env e;
	storage initialStorage = lastStorage;
	burn(e, a, x);
	burn(e, a, y);
	uint256 balanceScenario1 = balanceOf(e, a);
	uint256 t = x + y;
	burn(e, a, t) at initialStorage;

	uint256 balanceScenario2 = balanceOf(e, a);
	assert balanceScenario1 == balanceScenario2, "burn is not additive";
}

rule inverseMintBurn(address a, address delegatedUser, uint256 amount, uint256 rate) {
	env e;
	uint256 balancebefore = balanceOf(e, a);
	mint(e, delegatedUser, a, amount, rate);
	burn(e, a, amount);
	uint256 balanceAfter = balanceOf(e, a);
	assert balancebefore == balanceAfter, "burn is not the inverse of mint";
}

rule whoChangeTotalSupply(method f) filtered { f ->  !f.isView } {
    env e;
    uint256 oldTotalSupply = totalSupply(e);
    calldataarg args;
    f(e, args);
    uint256 newTotalSupply = totalSupply(e);
    assert oldTotalSupply != newTotalSupply => 
           (e.msg.sender == POOL(e) && 
           (f.selector == burn(address, uint256).selector || 
            f.selector == mint(address, address, uint256, uint256).selector));
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

rule additiveMint(address a, uint256 x, uint256 y) {
	env e;
	address delegatedUser;
	require getIncentivesController(e) == 0;
	require getUserStableRate(e, a) == 0;
	uint256 index;
	storage initialStorage = lastStorage;
	mint(e, delegatedUser, a, x, index);
	mint(e, delegatedUser, a, y, index);
	uint256 balanceScenario1 = balanceOf(e, a);
	
	uint256 t = x + y;
	mint(e, delegatedUser, a, t ,index) at initialStorage;
	
	uint256 balanceScenario2 = balanceOf(e, a);
	assert balanceScenario1 == balanceScenario2, "mint is not additive";
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

rule burnZeroDoesntChangeBalance(address u) {
	env e;
	uint256 balanceBefore = balanceOf(e, u);
	burn(e, u, 0);
	uint256 balanceAfter = balanceOf(e, u);
	assert balanceBefore == balanceAfter;
}

rule burnNoChangeToOther(address user, uint256 amount, address other) {
  
	require other != user;
	
	env e;
	uint256 otherDataBefore = additionalData(other);
	uint256 otherBalanceBefore = balanceOf(e, other);
	
	burn(e, user, amount);
	
	uint256 otherDataAfter = additionalData(other);
	uint256 otherBalanceAfter = balanceOf(e, other);

	assert otherDataBefore == otherDataAfter && 
	       otherBalanceBefore == otherBalanceAfter;
}

rule mintNoChangeToOther(address user, address onBehalfOf, uint256 amount, uint256 rate, address other) {
	require other != user && other != onBehalfOf;

	env e;
	uint128 userDataBefore = additionalData(user);
	uint128 otherDataBefore = additionalData(other);
	uint256 userBalanceBefore = balanceOf(e, user);
	uint256 otherBalanceBefore = balanceOf(e, other);

	mint(e, user, onBehalfOf, amount, rate);

  uint128 userDataAfter = additionalData(user);
	uint128 otherDataAfter = additionalData(other);
	uint256 userBalanceAfter = balanceOf(e, user);
	uint256 otherBalanceAfter = balanceOf(e, other);

	if (user != onBehalfOf) {
		assert userBalanceBefore == userBalanceAfter && userDataBefore == userDataAfter; 
	}

	assert otherBalanceBefore == otherBalanceAfter && otherDataBefore == otherDataAfter;
}


/*
By finding a violation, this rule checks that one can burn when there totalSupply is zero.
It is commented out since it should fail 
rule canBurnAtZero() {
	env e;
	address user;
	require totalSupply(e) == 0;
	uint256 userRate = additionalData(user);
	uint256 previousPrincipalBalance;
    uint256 newPrincipalBalance;
    uint256 diff;
	previousPrincipalBalance, newPrincipalBalance, diff =  _calculateBalanceIncrease(e,user);
	uint256 amount; 
	invoke burn(e,user,amount);
	assert amount>0 => lastReverted;
}
*/