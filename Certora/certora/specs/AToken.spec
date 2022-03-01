/**

- values of gRNI passing: ray, 2 * ray

*/

using SimpleERC20 as _underlyingAsset

methods {
  nonces(address) returns (uint256) envfree
  allowance(address, address) returns (uint256) envfree
	handleAction(address, uint256, uint256) => CONSTANT 
	getReserveNormalizedIncome(address u) returns (uint256) => gRNI()
	balanceOf(address) returns (uint256) envfree
	additionalData(address) returns uint128 envfree
	finalizeTransfer(address, address, address, uint256, uint256, uint256) => NONDET
}

definition ray() returns uint = 1000000000000000000000000000;
definition half_ray() returns uint = ray() / 2;
definition bounded_error_eq(uint x, uint y, uint epsilon) returns bool = x <= y + epsilon && x + epsilon >= y;

ghost sumAllBalance() returns uint256 {
    init_state axiom sumAllBalance() == 0;
}

ghost gRNI() returns uint256 {
	// axiom gRNI() == ray() + (ray() / 2);
	axiom gRNI() == ray();
}

hook Sstore _userState[KEY address a].balance uint128 balance (uint128 old_balance) STORAGE {
  havoc sumAllBalance assuming sumAllBalance@new() == sumAllBalance@old() + balance - old_balance;
}

invariant totalSupplyEqualsSumAllBalance(env e)
    totalSupply(e) == sumAllBalance() 
	filtered { f ->  !f.isView }

rule permitIntegrity(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) 
{
    env e;
    uint256 nonceBefore = nonces(owner);
    permit(e, owner, spender, value, deadline, v, r, s);
    assert allowance(owner, spender) == value;
    assert nonces(owner) == nonceBefore + 1;
}

rule mintArgsPositive(address user, uint256 amount, uint256 index) 
{
    env e;
	address caller;
    mint@withrevert(e, caller, user, amount, index);
    assert amount == 0  => lastReverted;
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

/**
Mint to user u  amount of x tokens, increases his balanceOf by x.
*/
rule integrityMint(address a, address b, uint256 x) 
{
	env e;
	uint256 indexRay = gRNI();
	mathint index = indexRay / ray();

	uint256 balanceBefore = balanceOf(a);

	mint(e,b,a,x,indexRay);
	
	uint256 balanceAfter = balanceOf(a);

	assert bounded_error_eq(balanceAfter, balanceBefore+x, index);
}

/**
Mint is additive, can performed either all at once or gradually
mint(u,x); mint(u,y) ~ mint(u,x+y) at the same timestamp
*/
rule additiveMint(address a, address b, address c, uint256 x, uint256 y) 
{
	env e;
	uint256 indexRay = gRNI();
	mathint index = indexRay / ray();
	require(balanceOf(a) == balanceOf(b) && a != b);

	// storage initialStorage = lastStorage;
	mint(e,c,a,x,indexRay);
	mint(e,c,a,y,indexRay);
	uint256 balanceScenario1 = balanceOf(a);
	// mint(e,a, x+y ,indexRay) at initialStorage;
	mint(e, c, b, x+y ,indexRay);

	uint256 balanceScenario2 = balanceOf(b);
	assert bounded_error_eq(balanceScenario1, balanceScenario2, 3*index), "mint is not additive";
}

rule integrityTransfer(address from, address to, uint256 amount)
{
	env e;
    uint256 indexRay = gRNI();
	mathint index = indexRay / ray();

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
		assert bounded_error_eq(balanceAfterFrom, balanceBeforeFrom - amount, index) &&
	 		bounded_error_eq(balanceAfterTo, balanceBeforeTo + amount, index), "unexpected balance of from/to, when from!=to";
	} else {
		assert balanceAfterFrom == balanceAfterTo , "unexpected balance of from/to, when from==to";
	}
}


rule additiveTransfer(address from1, address from2, address to1, address to2, uint256 x, uint256 y)
{
	env e1;
	env e2;
    uint256 indexRay = gRNI();
	mathint index = indexRay / ray();
	require (from1 != from2 && to1 != to2 && from1 != to2 && from2 != to1 && 
	        (from1 == to1 <=> from2 == to2) &&
			 balanceOf(from1) == balanceOf(from2) && balanceOf(to1) == balanceOf(to2));

	require e1.msg.sender == from1;
	require e2.msg.sender == from2;
	// storage initialStorage = lastStorage;
	transfer(e1, to1, x);
	transfer(e1, to1, y);
	uint256 balanceFromScenario1 = balanceOf(from1);
	uint256 balanceToScenario1 = balanceOf(to1);

	transfer(e2, to2, x+y);
	
	uint256 balanceFromScenario2 = balanceOf(from2);
	uint256 balanceToScenario2 = balanceOf(to2);
	
	assert 	bounded_error_eq(balanceFromScenario1, balanceFromScenario2, 3*index)  &&
	 		bounded_error_eq(balanceToScenario1, balanceToScenario2, 3*index), "transfer is not additive";
}



rule integrityBurn(address user, address to, uint256 amount)
{
	env e;
	uint256 indexRay = gRNI();
	mathint index = indexRay / ray();

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
		bounded_error_eq(underlyingBeforeUser, underlyingAfterUser, index), "integrity break on user!=to";
	}

	if (to != currentContract) {
		assert bounded_error_eq(underlyingAfterSystem, underlyingBeforeSystem - amount, index) && // system transfer underlying_asset
		bounded_error_eq(underlyingAfterTo,  underlyingBeforeTo + amount, index) , "integrity break on to!=currentContract";
	} else {
		assert underlyingAfterSystem == underlyingBeforeSystem, "integrity break on to==currentContract";
	} 

    assert bounded_error_eq(totalSupplyAfter, totalSupplyBefore - amount, index), "total supply integrity"; // total supply reduced
    assert bounded_error_eq(balanceAfterUser, balanceBeforeUser - amount, index), "integrity break";  // user burns ATokens to recieve underlying

}

rule additiveBurn(address user, address to, uint256 x, uint256 y) 
{
	env e;
	uint256 indexRay = gRNI();
	mathint index = indexRay / ray();

	require user != currentContract;
	storage initialStorage = lastStorage;
	sinvoke burn(e, user, to, x, indexRay);
	sinvoke burn(e, user, to, y, indexRay);
	uint256 balanceUserScenario1 = scaledBalanceOf(e, user);
	uint256 underlyingToScenario1 =  _underlyingAsset.balanceOf(e, to);
	uint256 underlyingSystemScenario1 =  _underlyingAsset.balanceOf(e, currentContract);
	uint256 totalSupplyScenario1 = totalSupply(e);
	
	sinvoke burn(e, user, to, x+y, indexRay) at initialStorage;
	
	uint256 balanceUserScenario2 = scaledBalanceOf(e, user);
	uint256 underlyingToScenario2 =  _underlyingAsset.balanceOf(e, to);
	uint256 underlyingSystemScenario2 =  _underlyingAsset.balanceOf(e, currentContract);
	uint256 totalSupplyScenario2 = totalSupply(e);
	
	assert 	bounded_error_eq(balanceUserScenario1, balanceUserScenario2, 3*index) &&
	 		bounded_error_eq(underlyingToScenario1, underlyingToScenario2, 3*index) &&
			bounded_error_eq(underlyingSystemScenario1, underlyingSystemScenario2, 3*index),
			"burn is not additive";
}

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
