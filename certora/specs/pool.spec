/*
    This is a Specification File for Smart Contract Verification with the Certora Prover.
    This file is run with scripts/verifyPool.sh
*/

/*
    Declaration of contracts used in the spec
*/
using ATokenHarness as _aToken
// using StableDebtTokenHarness as _stable
// using VariableDebtToken as _variable
// using SimpleERC20 as _asset
// using SymbolicPriceOracle as priceOracle

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

    // PoolHarness
    getCurrScaledVariableDebt(address) returns (uint256) envfree

	// math
	rayMul(uint256 a, uint256 b) returns uint256 => rayMulSummariztion(a, b)
	rayDiv(uint256 a, uint256 b) returns uint256 => rayDivSummariztion(a, b)
	calculateLinearInterest(uint256, uint40) returns uint256 => ALWAYS(1000000000000000000000000000)  // this is not good dont use this
	calculateCompoundedInterest(uint256 x, uint40 t0, uint256 t1) returns uint256 => calculateCompoundedInterestSummary(x, t0, t1);

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
	_variable.scaledTotalSupply() => DISPATCHER(true)
	
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
definition IS_UINT256(uint256 x) returns bool = ((x >= 0) && (x <= max_uint256));

function first_term(uint256 x, uint256 y) returns uint256 { return x; }
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
ghost mapping(uint256 => mapping(uint256 => uint256)) rayDivSummariztionValues;

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
	require y < RAY() => x <= rayDivSummariztionValues[x][y];
	return rayDivSummariztionValues[x][y];
}

// The borrowing index should monotonically increasing
rule getReserveNormalizedVariableDebtCheck()
{
	env e1;
	calldataarg args;
	calldataarg args2;
    address asset; uint256 amount; address onBehalfOf; uint16 referralCode;
    require asset != _aToken;
	uint256 oldIndex = getReserveNormalizedVariableDebt(e1, args);
    uint256 totalDebtBefore = getCurrScaledVariableDebt(asset);
	supply(e1, asset, amount, onBehalfOf, referralCode);
	uint256 newIndex = getReserveNormalizedVariableDebt(e1, args);
	assert totalDebtBefore != 0 => newIndex >= oldIndex;
}

// withdrawing a sum (part1 + part2) should not revert if withdrawing the two parts seperately does not revert
// !!! Times out !!!
// rule withdrawCheck()
// {
// 	env e;
// 	address to;
// 	address asset;
// 	uint256 part1;
// 	uint256 part2;
// 	storage init = lastStorage;
// 	withdraw(e, asset, part1, to);
// 	withdraw(e, asset, part2, to);
// 	withdraw@withrevert(e, asset, part1 + part2, to) at init;
// 	assert !lastReverted;
// }

// The liquidity index should not give different result if we called mintToTreasury before a function (flashloan)
// !!! Times out !!!
// rule accruToTreasury()
// {
// 	env e;
// 	calldataarg args;
// 	calldataarg args2;
// 	calldataarg args3;
// 	storage init = lastStorage;
// 	mintToTreasury(e, args);
// 	flashLoan(e, args2);
// 	//mintToTreasury(e, args);
// 	uint256 withMintBefore = getReserveNormalizedIncome(e, args3);
// 	flashLoan(e, args2) at init;
// 	//mintToTreasury(e, args);
// 	uint256 withoutMintBefore = getReserveNormalizedIncome(e, args3);
// 	assert withoutMintBefore == withMintBefore;
// }