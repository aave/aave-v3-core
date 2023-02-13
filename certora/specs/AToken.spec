/**

- values of gRNI passing: ray, 2 * ray

*/

using SimpleERC20 as _underlyingAsset

methods { 
    nonces(address) returns (uint256) envfree
    allowance(address, address) returns (uint256) envfree
	handleAction(address, uint256, uint256) => NONDET 
	getReserveNormalizedIncome(address u) returns (uint256) => gRNI()
	balanceOf(address) returns (uint256) envfree
	additionalData(address) returns uint128 envfree
	finalizeTransfer(address, address, address, uint256, uint256, uint256) => NONDET

	scaledTotalSupply() returns (uint256)
	scaledBalanceOf(address) returns (uint256)
    scaledBalanceOfToBalanceOf(uint256)returns (uint256) envfree
}

definition ray() returns uint = 1000000000000000000000000000;
definition half_ray() returns uint = ray() / 2;
definition bound() returns uint = ((gRNI() / ray()) + 1 ) / 2;

/*
Due to rayDiv and RayMul Rounding (+ 0.5) - blance could increase by (gRNI() / Ray() + 1) / 2.
*/
definition bounded_error_eq(uint x, uint y, uint scale) returns bool = x <= y + (bound() * scale) && x + (bound() * scale) >= y;

ghost sumAllBalance() returns uint256 {
    init_state axiom sumAllBalance() == 0;
}

// summerization for scaledBlanaceOf -> regularBalanceOf + 0.5 (canceling the rayMul)
ghost gRNI() returns uint256 {
	axiom gRNI() == 7 * ray();
}

hook Sstore _userState[KEY address a].balance uint128 balance (uint128 old_balance) STORAGE {
    havoc sumAllBalance assuming sumAllBalance@new() == sumAllBalance@old() + balance - old_balance;
}

invariant totalSupplyEqualsSumAllBalance(env e)
    totalSupply(e) == scaledBalanceOfToBalanceOf(sumAllBalance())
    filtered { f -> !f.isView }
    {
        preserved mint(address caller, address onBehalfOf, uint256 amount, uint256 index) with (env e2) {
            require index == gRNI();
        }
        preserved burn(address from, address receiverOfUnderlying, uint256 amount, uint256 index) with (env e3) {
            require index == gRNI();
        }
    }

// Rule to verify that permit sets the allowance correctly.
rule permitIntegrity(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) 
{
    env e;
    uint256 nonceBefore = nonces(owner);
    permit(e, owner, spender, value, deadline, v, r, s);
    assert allowance(owner, spender) == value;
    assert nonces(owner) == nonceBefore + 1;
}

// can't mint zero Tokens
rule mintArgsPositive(address user, uint256 amount, uint256 index) 
{
    env e;
	address caller;
    mint@withrevert(e, caller, user, amount, index);
    assert amount == 0 => lastReverted;
}

/**
Check that each possible operation changes the balance of at most two users
*/
rule balanceOfChange(address a, address b, address c, method f ) filtered { f ->  !f.isView }
{
	env e;
	require a!=b && a!=c && b!=c;
	uint256 balanceABefore = balanceOf(a);
	uint256 balanceBBefore = balanceOf(b);
	uint256 balanceCBefore = balanceOf(c);
	 
	calldataarg arg;
	f(e, arg); 

	uint256 balanceAAfter = balanceOf(a);
	uint256 balanceBAfter = balanceOf(b);
	uint256 balanceCAfter = balanceOf(c);

	assert ( balanceABefore == balanceAAfter || balanceBBefore == balanceBAfter || balanceCBefore == balanceCAfter);
}

/**
Mint to user u amount of x tokens, increases his balanceOf the underlying asset by x and
AToken total suplly should increase.
*/
rule integrityMint(address a, address b, uint256 x) 
{
	env e;
	uint256 indexRay = gRNI();

	uint256 underlyingBalanceBefore = balanceOf(a);
	uint256 atokenBlanceBefore = scaledBalanceOf(e, a);
	uint256 totalATokenSupplyBefore = scaledTotalSupply(e);

	mint(e,b,a,x,indexRay);
	
	uint256 underlyingBalanceAfter = balanceOf(a);
	uint256 atokenBlanceAfter = scaledBalanceOf(e, a);
	uint256 totalATokenSupplyAfter = scaledTotalSupply(e);

	assert atokenBlanceAfter - atokenBlanceBefore == totalATokenSupplyAfter - totalATokenSupplyBefore;
	assert totalATokenSupplyAfter > totalATokenSupplyBefore;
	assert bounded_error_eq(underlyingBalanceAfter, underlyingBalanceBefore+x, 1);
}

/*
Mint is additive, can performed either all at once or gradually
mint(u,x); mint(u,y) ~ mint(u,x+y) at the same initial state
*/
rule additiveMint(address a, address b, address c, uint256 x, uint256 y) 
{
	env e;
	uint256 indexRay = gRNI();
	require(balanceOf(a) == balanceOf(b) && a != b);
	uint256 balanceScenario0 = balanceOf(a);
	// storage initialStorage = lastStorage;
	mint(e,c,a,x,indexRay);
	mint(e,c,a,y,indexRay);
	uint256 balanceScenario1 = balanceOf(a);
	// mint(e,c, a, x+y ,indexRay) at initialStorage;
	mint(e, c, b, x+y ,indexRay);

	uint256 balanceScenario2 = balanceOf(b);
	assert bounded_error_eq(balanceScenario1, balanceScenario2, 3), "mint is not additive";
}

/* 
	transfers amount from _userState[from].balance to _userState[to].balance
	while balance of returns _userState[account].balance normalized by gNRI();
	transfer is incentivizedERC20
*/
rule integrityTransfer(address from, address to, uint256 amount)
{
	env e;
	require e.msg.sender == from;
	address other; // for any address including from, to, currentContract the underlying asset balance should stay the same
	
	uint256 balanceBeforeFrom = balanceOf(from);
	uint256 balanceBeforeTo = balanceOf(to);
	uint256 underlyingBeforeOther =  _underlyingAsset.balanceOf(e, other);
	
	transfer(e, to, amount);
	
	uint256 balanceAfterFrom = balanceOf(from);
	uint256 balanceAfterTo = balanceOf(to);
	uint256 underlyingAfterOther =  _underlyingAsset.balanceOf(e, other);
	
	assert underlyingAfterOther == underlyingBeforeOther, "unexpected change in underlying asserts";
	
	if (from != to) {
		assert bounded_error_eq(balanceAfterFrom, balanceBeforeFrom - amount, 1) &&
	 		bounded_error_eq(balanceAfterTo, balanceBeforeTo + amount, 1), "unexpected balance of from/to, when from!=to";
	} else {
		assert balanceAfterFrom == balanceAfterTo , "unexpected balance of from/to, when from==to";
	}
}


/*
Transfer is additive, can performed either all at once or gradually
transfer(from,to,x); transfer(from,to,y) ~ transfer(from,to,x+y) at the same initial state
*/
rule additiveTransfer(address from1, address from2, address to1, address to2, uint256 x, uint256 y)
{
	env e1;
	env e2;
    uint256 indexRay = gRNI();
	require (from1 != from2 && to1 != to2 && from1 != to2 && from2 != to1 && 
	        (from1 == to1 <=> from2 == to2) &&
			 balanceOf(from1) == balanceOf(from2) && balanceOf(to1) == balanceOf(to2));

	require e1.msg.sender == from1;
	require e2.msg.sender == from2;
	transfer(e1, to1, x);
	transfer(e1, to1, y);
	uint256 balanceFromScenario1 = balanceOf(from1);
	uint256 balanceToScenario1 = balanceOf(to1);

	transfer(e2, to2, x+y);
	
	uint256 balanceFromScenario2 = balanceOf(from2);
	uint256 balanceToScenario2 = balanceOf(to2);
	
	assert 	bounded_error_eq(balanceFromScenario1, balanceFromScenario2, 3)  &&
	 		bounded_error_eq(balanceToScenario1, balanceToScenario2, 3), "transfer is not additive";
}


/*
Burn scaled amount of Atoken from 'user' and transfers amount of the underlying asset to 'to'.
*/
rule integrityBurn(address user, address to, uint256 amount)
{
	env e;
	uint256 indexRay = gRNI();

	require user != currentContract;
	uint256 balanceBeforeUser = balanceOf(user);
	uint256 balanceBeforeTo = balanceOf(to);
	uint256 underlyingBeforeTo =  _underlyingAsset.balanceOf(e, to);
	uint256 underlyingBeforeUser =  _underlyingAsset.balanceOf(e, user);
	uint256 underlyingBeforeSystem =  _underlyingAsset.balanceOf(e, currentContract);
	uint256 totalSupplyBefore = totalSupply(e); 

	burn(e, user, to, amount, indexRay);
	
	uint256 balanceAfterUser = balanceOf(user);
	uint256 balanceAfterTo = balanceOf(to);
	uint256 underlyingAfterTo =  _underlyingAsset.balanceOf(e, to);
	uint256 underlyingAfterUser =  _underlyingAsset.balanceOf(e, user);
	uint256 underlyingAfterSystem =  _underlyingAsset.balanceOf(e, currentContract);
	uint256 totalSupplyAfter = totalSupply(e);

	if (user != to) {
		assert balanceAfterTo == balanceBeforeTo && // balanceOf To should not change
		bounded_error_eq(underlyingBeforeUser, underlyingAfterUser, 1), "integrity break on user!=to";
	}

	if (to != currentContract) {
		assert bounded_error_eq(underlyingAfterSystem, underlyingBeforeSystem - amount, 1) && // system transfer underlying_asset
		bounded_error_eq(underlyingAfterTo,  underlyingBeforeTo + amount, 1) , "integrity break on to!=currentContract";
	} else {
		assert underlyingAfterSystem == underlyingBeforeSystem, "integrity break on to==currentContract";
	} 

    assert bounded_error_eq(totalSupplyAfter, totalSupplyBefore - amount, 1), "total supply integrity"; // total supply reduced
    assert bounded_error_eq(balanceAfterUser, balanceBeforeUser - amount, 1), "integrity break";  // user burns ATokens to recieve underlying
}

/*
Burn is additive, can performed either all at once or gradually
burn(from,to,x,index); burn(from,to,y,index) ~ burn(from,to,x+y,index) at the same initial state
*/
rule additiveBurn(address user1, address user2, address to1, address to2, uint256 x, uint256 y) 
{
	env e;
	uint256 indexRay = gRNI();
	require (user1 != user2 && to1 != to2 && user1 != to2 && user2 != to1 && 
	        (user1 == to1 <=> user2 == to2) &&
			 balanceOf(user1) == balanceOf(user2) && balanceOf(to1) == balanceOf(to2));
	require user1 != currentContract && user2 != currentContract;

	sinvoke burn(e, user1, to1, x, indexRay);
	sinvoke burn(e, user1, to1, y, indexRay);
	uint256 balanceUserScenario1 = balanceOf(user1);
	
	sinvoke burn(e, user2, to2, x+y, indexRay);
	uint256 balanceUserScenario2 = balanceOf(user2);
	
	assert 	bounded_error_eq(balanceUserScenario1, balanceUserScenario2, 3), "burn is not additive";
}

/*
Burning one user atokens should have no effect on other users that are not involved in the action.
*/
rule burnNoChangeToOther(address user, address recieverOfUnderlying, uint256 amount, uint256 index, address other) 
{
  
	require other != user && other != recieverOfUnderlying;
	
	env e;
	uint256 otherDataBefore = additionalData(other);
	uint256 otherBalanceBefore = balanceOf(other);
	
	burn(e, user, recieverOfUnderlying, amount, index);
	
	uint256 otherDataAfter = additionalData(other);
	uint256 otherBalanceAfter = balanceOf(other);

	assert otherDataBefore == otherDataAfter && 
	       otherBalanceBefore == otherBalanceAfter;
}

/*
Minting ATokens for a user should have no effect on other users that are not involved in the action.
*/
rule mintNoChangeToOther(address user, uint256 amount, uint256 index, address other)
{
	require other != user;

	env e;
	uint128 otherDataBefore = additionalData(other);
	uint256 otherBalanceBefore = balanceOf(other);
	address caller; 
	mint(e, caller, user, amount, index);

	uint128 otherDataAfter = additionalData(other);
	uint256 otherBalanceAfter = balanceOf(other);

	assert otherBalanceBefore == otherBalanceAfter && otherDataBefore == otherDataAfter;
}



/**
Check that the changes to total supply are coherent with the changes to balance
*/
// rule integrityBalanceOfTotalSupply(address a, address b, method f)
// {
// 	env e;
// 	require a!=b;
// 	uint256 balanceABefore = balanceOf(e,a);
// 	uint256 balanceBBefore = balanceOf(e,b);
// 	uint256 totalSupplyBefore = totalSupply(e);
	 
// 	calldataarg arg;
// 	sinvoke f(e, arg); 

// 	uint256 balanceAAfter = balanceOf(e,a);
// 	uint256 balanceBAfter = balanceOf(e,b);

// 	uint256 totalSupplyAfter = totalSupply(e);

// 	assert (balanceAAfter != balanceABefore && balanceBAfter != balanceBBefore) =>
// 	    ( (balanceAAfter - balanceABefore) + (balanceBAfter - balanceBBefore)  == totalSupplyAfter - totalSupplyBefore);
// 	require f.selector != transferFrom(address,address,uint256).selector &&
// 	        f.selector != transfer(address,uint256).selector &&
// 	        f.selector != transferOnLiquidation(address,address,uint256).selector;
// 	assert (balanceAAfter != balanceABefore &&  balanceBAfter == balanceBBefore ) =>
// 	    ( (balanceAAfter - balanceABefore)   == totalSupplyAfter - totalSupplyBefore);
		
// }
