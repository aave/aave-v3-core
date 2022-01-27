/*
    This is a Specification File for Smart Contract Verification with the Certora Prover.
    This file is run with scripts/verifyPool.sh
*/

/*
    Declaration of contracts used in the spec
*/
using ATokenHarness as _aToken
using StableDebtTokenHarness as _stable
using VariableDebtToken as _variable
using SimpleERC20 as _asset
using SymbolicPriceOracle as priceOracle

/*

Methods Summerizations and Enviroment-Free (e.g relative to e.msg variables) Declarations 

*/

methods {

	//Pool
	getReserveList(uint256 index) returns (address) envfree
	getReserveDataIndex(address token) returns (uint256) envfree
	getReservesCount() returns (uint256) envfree
	handleAction(address, uint256, uint256) => NONDET
	getConfigurationData(address) returns uint256 envfree
	getUserEMode(address) returns uint256 envfree
	getAssetEMode(address) returns uint256 envfree
	getAssetId(address) returns uint16 envfree
	reserveAddressById(uint256) returns address envfree
	isActiveReserve(address asset) returns bool envfree
	isFrozenReserve(address asset) returns bool envfree
	isPausedReserve(address asset) returns bool envfree
	isBorrowableReserve(address) returns bool envfree
	isStableRateBorrowableReserve(address) returns bool envfree
	getReserveATokenAddress(address) returns address envfree
	getReserveStableDebtTokenAddress(address) returns address envfree
	getReserveVariableDebtTokenAddress(address) returns address envfree
	getReserveLiquidityIndex(address) returns uint256 envfree
	getReserveCurrentLiquidityRate(address) returns uint256 envfree
	getReserveVariableBorrowIndex(address) returns uint256 envfree
	getReserveCurrentVariableBorrowRate(address) returns uint256 envfree
	getReserveCurrentStableBorrowRate(address) returns uint256 envfree 
	getATokenTotalSupply(address) returns uint256 envfree
	getReserveSupplyCap(address) returns uint256 envfree
	mockUserAccountData() returns (uint256, uint256, uint256, uint256, uint256, bool) => NONDET
	mockHealthFactor() returns (uint256, bool) => NONDET
	getAssetPrice(address) returns uint256 => NONDET
	getPriceOracle() returns address => ALWAYS(2)
	getPriceOracleSentinel() returns address => ALWAYS(4)
	isBorrowAllowed() returns bool => NONDET

	// math
	rayMul(uint256 a, uint256 b) returns uint256 => first_term(a, b)
	rayDiv(uint256 a, uint256 b) returns uint256 => first_term(a, b)
	calculateLinearInterest(uint256, uint40) returns uint256 => ALWAYS(1000000000000000000000000000)
	calculateCompoundedInterest(uint256, uint40, uint256) returns uint256 => ALWAYS(1000000000000000000000000000)

	// ERC20
	transfer(address, uint256) returns bool => DISPATCHER(true)
	transferFrom(address, address, uint256) returns bool => DISPATCHER(true)
	approve(address, uint256) returns bool => DISPATCHER(true)
	mint(address, uint256) returns bool => DISPATCHER(true)
	burn(uint256) => DISPATCHER(true)
	balanceOf(address) returns uint256 => DISPATCHER(true)

	// ATOKEN
	mint(address user, uint256 amount, uint256 index) returns(bool) => DISPATCHER(true)
	burn(address user, address receiverOfUnderlying, uint256 amount, uint256 index) => DISPATCHER(true)
	mintToTreasury(uint256 amount, uint256 index) => DISPATCHER(true)
	transferOnLiquidation(address from, address to, uint256 value) => DISPATCHER(true)
	transferUnderlyingTo(address user, uint256 amount) => DISPATCHER(true)
	handleRepayment(address user, uint256 amount) => DISPATCHER(true)
	permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) => DISPATCHER(true)
	
	//Debt Tokens
	scaledTotalSupply() => DISPATCHER(true)
	
	// StableDebt
	mint(address user, address onBehalfOf, uint256 amount, uint256 rate) => DISPATCHER(true)
	burn(address user, uint256 amount) => DISPATCHER(true)
	getSupplyData() returns (uint256, uint256, uint256, uint40) => DISPATCHER(true)
	
	//variableDebt
	burn(address user, uint256 amount, uint256 index) => DISPATCHER(true)

	// ReserveConfiguration
	mockGetEModeCategory() returns uint256 => CONSTANT
	mockGetActive() returns bool => CONSTANT
    mockGetFrozen() returns bool => CONSTANT
    mockGetBorrowingEnabled() returns bool => CONSTANT
    mockGetStableRateBorrowingEnabled() returns bool => CONSTANT
    mockGetPaused() returns bool => CONSTANT
	mockGetReserveFactor() returns uint256 => CONSTANT
	mockGetBorrowCap() returns uint256 => CONSTANT
	mockGetBorrowableInIsolation() returns bool => CONSTANT
	mockGetLtv() returns uint256 => CONSTANT
	mockGetSupplyCap() returns uint256 => ALWAYS(100000000000000000000000000000000000000000000000000)

}

/* definitions and functions to be used within the spec file */

definition RAY() returns uint256 = 10^27;

function first_term(uint256 x, uint256 y) returns uint256 { return x; }

function setup() {
  require getReserveATokenAddress(_asset) == _aToken;
	require getReserveStableDebtTokenAddress(_asset) == _stable;
	require getReserveVariableDebtTokenAddress(_asset) == _variable;
}

function call_func(method f) {
	env e;
	if (f.selector == borrow(address,uint256,uint256,uint16,address).selector) {
    uint256 amount;
    uint256 interestRateMode;
    uint16 referralCode;
    address onBehalfOf;
			
		borrow(e, _asset, amount, interestRateMode, referralCode, onBehalfOf);
	} else if (f.selector == supply(address, uint256, address, uint16).selector) {
		uint256 amount;
    address onBehalfOf;
    uint16 referralCode;
    
		supply(e, _asset, amount, onBehalfOf, referralCode);
	} else if (f.selector == repay(address, uint256, uint256, address).selector ||
	           f.selector == repayWithPermit(address,uint256,uint256,address,uint256,uint8,bytes32,bytes32).selector) {
		uint256 amount;
		uint256 rateMode;
		address onBehalfOf;
		
    repay(e, _asset, amount, rateMode, onBehalfOf);
	} else if (f.selector == repayWithATokens(address, uint256, uint256).selector) {
    uint256 amount;
		uint256 rateMode;

		repayWithATokens(e, _asset, amount, rateMode);
	} else if (f.selector == mintUnbacked(address,uint256,address,uint16).selector) {
    uint256 amount;
    address onBehalfOf;
    uint16 referralCode;

		mintUnbacked(e, _asset, amount, onBehalfOf, referralCode);
	} else if (f.selector == rebalanceStableBorrowRate(address,address).selector) {
    address user;

		rebalanceStableBorrowRate(e, _asset, user);
	} else if (f.selector == swapBorrowRateMode(address,uint256).selector) {
    uint256 rateMode;

    swapBorrowRateMode(e, _asset, rateMode);
	} else {
    calldataarg args;
	  f(e, args);
	}
}

ghost ghost_multiplication(uint256, uint256) returns uint256 {
	axiom forall uint256 x1. forall uint256 x2. forall uint256 y. 
	    ((y != 0 && x1 != 0 && x1 < x2) => 
			 (ghost_multiplication(x1, y) < ghost_multiplication(x2, y) && 
			  ghost_multiplication(y, x1) < ghost_multiplication(y, x2)));
}

ghost ghost_division(uint256, uint256) returns uint256 {
	axiom forall uint256 x1. forall uint256 x2. forall uint256 y. 
	    ((y != 0 && x1 != 0 && x1 < x2) => 
			 (ghost_division(x1, y) < ghost_division(x2, y) && 
			  ghost_division(y, x1) > ghost_division(y, x2)));
}

ghost mapping(address => mathint) usageOfPriceOracle;

hook Sload uint256 p priceOracle.price[KEY address asset] STORAGE {
	usageOfPriceOracle[asset] = usageOfPriceOracle[asset] + 1;
}

/* Rules and Invariantas */
/* Vacuity Safety Checks  */
rule setupSanity() {
	setup();
	assert false;
}


rule setupCallFuncSanity(method f) {
	setup();
	call_func(f);
	assert false;
}

rule borrowSanity() {
	setup();
	env e; uint256 amount; uint256 interestRateMode; uint16 referralCode; address onBehalfOf;	
	borrow(e, _asset, amount, interestRateMode, referralCode, onBehalfOf);
	assert false;
}

rule supplySanity() {
	setup();
	env e; uint256 amount; address onBehalfOf; uint16 referralCode;
	supply(e, _asset, amount, onBehalfOf, referralCode);
	assert false;
}

/* Rulea and Invariants */

rule cantExceedsupplyCap(method f) filtered { f -> !f.isView } {
	setup();
	uint256 aTokenTotalSupplyBefore = getATokenTotalSupply(_asset);
	require aTokenTotalSupplyBefore <= 10^50;
	call_func(f);
	uint256 aTokenTotalSupplyAfter = getATokenTotalSupply(_asset);
	assert aTokenTotalSupplyAfter <= 10^50;
}

rule cantExceedsupplyCapMintUnbacked() {
	setup();
	uint256 aTokenTotalSupplyBefore = getATokenTotalSupply(_asset);
	require aTokenTotalSupplyBefore <= 10^50;
	env e; uint256 amount; address onBehalfOf; uint16 referralCode;
	mintUnbacked(e, _asset, amount, onBehalfOf, referralCode);
	uint256 aTokenTotalSupplyAfter = getATokenTotalSupply(_asset);
	assert aTokenTotalSupplyAfter <= 10^50;
}

rule cantExceedsupplyCapRepay() {
	setup();
	uint256 aTokenTotalSupplyBefore = getATokenTotalSupply(_asset);
	require aTokenTotalSupplyBefore <= 10^50;
	env e;
	uint256 amount;
	uint256 rateMode;
	address onBehalfOf;
  repay(e, _asset, amount, rateMode, onBehalfOf);

	// uint256 supplyCapAfter = getReserveSupplyCap(_asset);
	uint256 aTokenTotalSupplyAfter = getATokenTotalSupply(_asset);

	assert aTokenTotalSupplyAfter <= 10^50;
}

rule cantExceedsupplyCapBorrow() {
	setup();

	// uint256 supplyCapBefore = getReserveSupplyCap(_asset);
	uint256 aTokenTotalSupplyBefore = getATokenTotalSupply(_asset);
	
	require aTokenTotalSupplyBefore <= 10^50;
	
	env e;
	uint256 amount;
	uint256 interestRateMode;
	uint16 referralCode;
	address onBehalfOf;	
	borrow(e, _asset, amount, interestRateMode, referralCode, onBehalfOf);
	uint256 aTokenTotalSupplyAfter = getATokenTotalSupply(_asset);

	assert aTokenTotalSupplyAfter <= 10^50;
}

// proved
rule reservesCountIsMonotonic(method f) filtered { f -> !f.isView}
 {
	env e;
	calldataarg args;
	uint256 before = getReservesCount();
	f(e, args);
	assert  getReservesCount() >= before;
}


// proved
rule configurationChange(method f, address asset1, address asset2) {
  // require f.selector != liquidationCall(address, address, address, uint256, bool).selector;
  require asset1 != asset2;
  
	uint256 data1Before = getConfigurationData(asset1);
	uint256 data2Before = getConfigurationData(asset2);

	env e;
	calldataarg args;
	f(e, args);

	uint256 data1After = getConfigurationData(asset1); 
	uint256 data2After = getConfigurationData(asset2);

  assert data1Before == data1After || data2Before == data2After;
}

// proved
rule setUserEModeIntegrity(uint8 categoryId) {
	env e;
	sinvoke setUserEMode(e, categoryId);
	assert getUserEMode(e.msg.sender) == categoryId;
}

// proved
rule setUserEModeZeroNoRevert() {
  env e;
	require(e.msg.value == 0);
	setUserEMode@withrevert(e, 0);
	assert !lastReverted;
}

// proved on earlier version
rule borrowSucceddedImpliesCompatibleEMode(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) {
	env e;
	
  uint16 assetId = getAssetId(asset);
	uint256 userEMode = getUserEMode(onBehalfOf);
	uint256 assetEMode = getAssetEMode(asset);

	borrow(e, asset, amount, interestRateMode, referralCode, onBehalfOf);

	assert (userEMode == 0) || (userEMode == assetEMode);
}

// proved
rule borrowFlags(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) {
  bool reserveActive = isActiveReserve(asset);
	bool reserveFrozen = isFrozenReserve(asset);
	bool reservePaused = isPausedReserve(asset);
	bool reserveBorrowable = isBorrowableReserve(asset);
	bool reserveBorrowableStableRate = isStableRateBorrowableReserve(asset);

	env e;
	borrow(e, asset, amount, interestRateMode, referralCode, onBehalfOf);
	
	assert reserveActive && !reserveFrozen && !reservePaused && reserveBorrowable &&
	       (interestRateMode == 1 => reserveBorrowableStableRate);
}
 
 // proved
 invariant reserveIndexLTcounter(uint i) 
		getReserveList(i) != 0 => i < getReservesCount()
		filtered { f -> !f.isView}

 // proved
 invariant reserveIndexValidity(uint i, address token) 
	((i!= 0 && token!=0) => 
			(getReserveList(i) == token <=> getReserveDataIndex(token) == i) ) &&
	(( i == 0 && token !=0)  => (getReserveList(i) == token => getReserveDataIndex(token) == i))
	 filtered { f -> !f.isView}
	 { 
		preserved dropReserve(address t) with (env e) {
			require t == token;
		}
		
		preserved initReserve(
		address asset,
		address aTokenAddress,
		address stableDebtAddress,
		address variableDebtAddress,
		address interestRateStrategyAddress) with (env e) {
			require asset == token;
		}
	}
	
	rule priceOracelCounter(address asset, method f) {
		env e;
		calldataarg args;
		mathint before = usageOfPriceOracle[asset];
		call_func(f);
		assert usageOfPriceOracle[asset] == before;
	}
