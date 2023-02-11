methods {
    calculateCompoundedInterest(uint256 r, uint40 t0, uint256 t1) returns (uint256) => calculateCompoundedInterestSummary(r, t0, t1)
	additionalData(address) returns uint128 envfree
	getAverageStableRate() returns uint256 envfree
	handleAction(address, uint256, uint256) => NONDET
    // scaledBalanceOfToBalanceOf(uint256) returns (uint256) envfree

	rayMul(uint256 x, uint256 y) returns (uint256) => rayMulSummariztion(x, y)
	rayDiv(uint256 x, uint256 y) returns (uint256) => rayDivSummariztion(x, y)
}

definition RAY() returns uint = 1000000000000000000000000000;

definition disAllowedFunctions(method f) returns bool = 
            f.selector == transfer(address, uint256).selector ||
            f.selector == allowance(address, address).selector ||
            f.selector == approve(address, uint256).selector ||
            f.selector == transferFrom(address, address, uint256).selector ||
            f.selector == increaseAllowance(address, uint256).selector ||
            f.selector == decreaseAllowance(address, uint256).selector;

ghost mapping(uint256 => mapping(uint256 => uint256)) calculateCompoundedInterestSummaryValues;
function calculateCompoundedInterestSummary(uint256 rate, uint40 t0, uint256 t1) returns uint256
{
	uint256 deltaT = t1 - t0;
	if (deltaT == 0)
	{
		return RAY();
	}
	if (rate == RAY())
	{
		return RAY();
	}
	if (rate >= RAY())
	{
		require calculateCompoundedInterestSummaryValues[rate][deltaT] >= rate;
	}
	else{
		require calculateCompoundedInterestSummaryValues[rate][deltaT] < rate;
	}
	return calculateCompoundedInterestSummaryValues[rate][deltaT];
}

ghost mapping(uint256 => mapping(uint256 => uint256)) rayMulSummariztionValues;
function rayMulSummariztion(uint256 x, uint256 y) returns uint256
{
	if (x == 0) || (y == 0)
	{
		return 0;
	}
	if (x == RAY())
	{
		return y;
	}
	if (y == RAY())
	{
		return x;
	}
	
	if (y > x)
	{
		if (y > RAY())
		{
			require rayMulSummariztionValues[y][x] >= x;
		}
		if (x > RAY())
		{
			require rayMulSummariztionValues[y][x] >= y;
		}
		return rayMulSummariztionValues[y][x];
	}
	else{
		if (x > RAY())
		{
			require rayMulSummariztionValues[x][y] >= y;
		}
		if (y > RAY())
		{
			require rayMulSummariztionValues[x][y] >= x;
		}
		return rayMulSummariztionValues[x][y];
	}
}

ghost mapping(uint256 => mapping(uint256 => uint256)) rayDivSummariztionValues;
function rayDivSummariztion(uint256 x, uint256 y) returns uint256
{
	if (x == 0)
	{
		return 0;
	}
	if (y == RAY())
	{
		return x;
	}
	if (y == x)
	{
		return RAY();
	}
	require y > RAY() => rayDivSummariztionValues[x][y] <= x;
	// require y < RAY() => rayDivSummariztionValues[x][y] =< x;
	return rayDivSummariztionValues[x][y];
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

// invariant totalSupplyEqualsSumAllBalance(env e)
//     totalSupply(e) <= scaledBalanceOfToBalanceOf(sumAllBalance())
//     filtered { f -> !f.isView && !disAllowedFunctions(f) }


invariant principalLessThanBalance(env e, address user)
    principalBalanceOf(e, user) <= balanceOf(e, user)
    filtered { f -> !disAllowedFunctions(f) }

/**
Burning user u amount of x tokens, decreases his balanceOf the user by x. 
(balance is decreased by x and not scaled x because of the summarization to one ray)
*/
rule integrityBurn(address a, uint256 x) {
	env e;
	require getIncentivesController(e) == 0;
	uint256 index;
	uint256 balancebefore = balanceOf(e, a);
	burn(e,a,x);
	
	uint256 balanceAfter = balanceOf(e, a);
	assert balanceAfter == balancebefore - x;
}

/**
Mint to user u amount of x tokens, increases his balanceOf the user by x. 
(balance is increased by x and not scaled x because of the summarization to one ray)
*/
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

// lastUpdated timestamp must be in the past.
rule integrityTimeStamp(address user, method f) 
    filtered { f ->  !f.isView && !disAllowedFunctions(f) }
{
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

/*
Burn is additive, can performed either all at once or gradually
burn(from,to,x,index); burn(from,to,y,index) ~ burn(from,to,x+y,index) at the same initial state
*/
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

// minting and then buring Variable Debt Token should have no effect on the users balance
rule inverseMintBurn(address a, address delegatedUser, uint256 amount, uint256 rate) {
	env e;
	uint256 balancebefore = balanceOf(e, a);
	mint(e, delegatedUser, a, amount, rate);
	burn(e, a, amount);
	uint256 balanceAfter = balanceOf(e, a);
	assert balancebefore == balanceAfter, "burn is not the inverse of mint";
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
           (f.selector == burn(address, uint256).selector || 
            f.selector == mint(address, address, uint256, uint256).selector));
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

/*
Mint is additive, can performed either all at once or gradually
mint(u,x,index); mint(u,y,index) ~ mint(u,x+y,index) at the same initial state
*/
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

/*
Each operation of Stable Debt Token can change at most one user's balance.
*/
rule balanceOfChange(address a, address b, method f) 
    filtered { f ->  !f.isView && !disAllowedFunctions(f) }
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

// Buring zero amount of tokens should have no effect.
rule burnZeroDoesntChangeBalance(address u) {
	env e;
	uint256 balanceBefore = balanceOf(e, u);
	burn(e, u, 0);
	uint256 balanceAfter = balanceOf(e, u);
	assert balanceBefore == balanceAfter;
}

/*
Burning one user atokens should have no effect on other users that are not involved in the action.
*/
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

/*
Minting ATokens for a user should have no effect on other users that are not involved in the action.
*/
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
Ensuring that the defined disallowed functions revert in any case.
*/
rule disallowedFunctionalities(method f)
    filtered { f -> disAllowedFunctions(f) }
{
    env e; calldataarg args;
    f@withrevert(e, args);
    assert lastReverted;
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
