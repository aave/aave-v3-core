// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title Errors library
 * @author Aave
 * @notice Defines the error messages emitted by the different contracts of the Aave protocol
 * @dev Error messages prefix glossary:
 *  - VL = ValidationLogic
 *  - MATH = Math libraries
 *  - CT = Common errors between tokens (AToken, VariableDebtToken and StableDebtToken)
 *  - AT = AToken
 *  - SDT = StableDebtToken
 *  - VDT = VariableDebtToken
 *  - P = Pool
 *  - PAPR = PoolAddressesProviderRegistry
 *  - PC = PoolConfiguration
 *  - RL = ReserveLogic
 */
library Errors {
  //common errors
  string public constant CALLER_NOT_POOL_ADMIN = '33'; // 'The caller must be the pool admin'

  //contract specific errors
  string public constant VL_INVALID_AMOUNT = '1'; // 'Amount must be greater than 0'
  string public constant VL_NO_ACTIVE_RESERVE = '2'; // 'Action requires an active reserve'
  string public constant VL_RESERVE_FROZEN = '3'; // 'Action cannot be performed because the reserve is frozen'
  string public constant VL_CURRENT_AVAILABLE_LIQUIDITY_NOT_ENOUGH = '4'; // 'The current liquidity is not enough'
  string public constant VL_NOT_ENOUGH_AVAILABLE_USER_BALANCE = '5'; // 'User cannot withdraw more than the available balance'
  string public constant VL_BORROWING_NOT_ENABLED = '7'; // 'Borrowing is not enabled'
  string public constant VL_INVALID_INTEREST_RATE_MODE_SELECTED = '8'; // 'Invalid interest rate mode selected'
  string public constant VL_COLLATERAL_BALANCE_IS_0 = '9'; // 'The collateral balance is 0'
  string public constant VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = '10'; // 'Health factor is lesser than the liquidation threshold'
  string public constant VL_COLLATERAL_CANNOT_COVER_NEW_BORROW = '11'; // 'There is not enough collateral to cover a new borrow'
  string public constant VL_STABLE_BORROWING_NOT_ENABLED = '12'; // stable borrowing not enabled
  string public constant VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY = '13'; // collateral is (mostly) the same currency that is being borrowed
  string public constant VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE = '14'; // 'The requested amount is greater than the max loan size in stable rate mode
  string public constant VL_NO_DEBT_OF_SELECTED_TYPE = '15'; // 'for repayment of stable debt, the user needs to have stable debt, otherwise, he needs to have variable debt'
  string public constant VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF = '16'; // 'To repay on behalf of a user an explicit amount to repay is needed'
  string public constant VL_NO_STABLE_RATE_LOAN_IN_RESERVE = '17'; // 'User does not have a stable rate loan in progress on this reserve'
  string public constant VL_NO_VARIABLE_RATE_LOAN_IN_RESERVE = '18'; // 'User does not have a variable rate loan in progress on this reserve'
  string public constant VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0 = '19'; // 'The underlying balance needs to be greater than 0'
  string public constant VL_SUPPLIED_ASSETS_ALREADY_IN_USE = '20'; // 'User supplied assets are already being used as collateral'
  string public constant P_NOT_ENOUGH_STABLE_BORROW_BALANCE = '21'; // 'User does not have any stable rate loan for this reserve'
  string public constant P_INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET = '22'; // 'Interest rate rebalance conditions were not met'
  string public constant P_LIQUIDATION_CALL_FAILED = '23'; // 'Liquidation call failed'
  string public constant P_NOT_ENOUGH_LIQUIDITY_TO_BORROW = '24'; // 'There is not enough liquidity available to borrow'
  string public constant P_REQUESTED_AMOUNT_TOO_SMALL = '25'; // 'The requested amount is too small for a FlashLoan.'
  string public constant P_INCONSISTENT_PROTOCOL_ACTUAL_BALANCE = '26'; // 'The actual balance of the protocol is inconsistent'
  string public constant P_CALLER_NOT_POOL_CONFIGURATOR = '27'; // 'The caller of the function is not the pool configurator'
  string public constant P_INCONSISTENT_FLASHLOAN_PARAMS = '28';
  string public constant CT_CALLER_MUST_BE_POOL = '29'; // 'The caller of this function must be a pool'
  string public constant CT_CANNOT_GIVE_ALLOWANCE_TO_HIMSELF = '30'; // 'User cannot give allowance to himself'
  string public constant CT_TRANSFER_AMOUNT_NOT_GT_0 = '31'; // 'Transferred amount needs to be greater than zero'
  string public constant RL_RESERVE_ALREADY_INITIALIZED = '32'; // 'Reserve has already been initialized'
  string public constant PC_RESERVE_LIQUIDITY_NOT_0 = '34'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_ATOKEN_POOL_ADDRESS = '35'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_STABLE_DEBT_TOKEN_POOL_ADDRESS = '36'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_VARIABLE_DEBT_TOKEN_POOL_ADDRESS = '37'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_STABLE_DEBT_TOKEN_UNDERLYING_ADDRESS = '38'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_VARIABLE_DEBT_TOKEN_UNDERLYING_ADDRESS = '39'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_ADDRESSES_PROVIDER_ID = '40'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_INVALID_CONFIGURATION = '75'; // 'Invalid risk parameters for the reserve'
  string public constant PC_CALLER_NOT_EMERGENCY_ADMIN = '76'; // 'The caller must be the emergency admin'
  string public constant PAPR_PROVIDER_NOT_REGISTERED = '41'; // 'Provider is not registered'
  string public constant VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD = '42'; // 'Health factor is not below the threshold'
  string public constant VL_COLLATERAL_CANNOT_BE_LIQUIDATED = '43'; // 'The collateral chosen cannot be liquidated'
  string public constant VL_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = '44'; // 'User did not borrow the specified currency'
  string public constant VL_NOT_ENOUGH_LIQUIDITY_TO_LIQUIDATE = '45'; // "There isn't enough liquidity available to liquidate"
  string public constant P_INVALID_FLASHLOAN_MODE = '47'; //Invalid flashloan mode selected
  string public constant MATH_MULTIPLICATION_OVERFLOW = '48';
  string public constant MATH_ADDITION_OVERFLOW = '49';
  string public constant MATH_DIVISION_BY_ZERO = '50';
  string public constant CT_INVALID_MINT_AMOUNT = '56'; //invalid amount to mint
  string public constant CT_INVALID_BURN_AMOUNT = '58'; //invalid amount to burn
  string public constant P_REENTRANCY_NOT_ALLOWED = '62';
  string public constant P_CALLER_MUST_BE_AN_ATOKEN = '63';
  string public constant P_IS_PAUSED = '64'; // Deprecated 'Pool is paused'
  string public constant P_NO_MORE_RESERVES_ALLOWED = '65';
  string public constant P_INVALID_FLASH_LOAN_EXECUTOR_RETURN = '66';
  string public constant RC_INVALID_LTV = '67';
  string public constant RC_INVALID_LIQ_THRESHOLD = '68';
  string public constant RC_INVALID_LIQ_BONUS = '69';
  string public constant RC_INVALID_DECIMALS = '70';
  string public constant RC_INVALID_RESERVE_FACTOR = '71';
  string public constant PAPR_INVALID_ADDRESSES_PROVIDER_ID = '72';
  string public constant VL_INCONSISTENT_FLASHLOAN_PARAMS = '73';
  string public constant P_INCONSISTENT_PARAMS_LENGTH = '74';
  string public constant UL_INVALID_INDEX = '77';
  string public constant P_NOT_CONTRACT = '78';
  string public constant SDT_STABLE_DEBT_OVERFLOW = '79'; // Deprecated moved to general `HLP_UINT128_OVERFLOW`
  string public constant SDT_BURN_EXCEEDS_BALANCE = '80';
  string public constant VL_BORROW_CAP_EXCEEDED = '81';
  string public constant RC_INVALID_BORROW_CAP = '82';
  string public constant VL_SUPPLY_CAP_EXCEEDED = '83';
  string public constant RC_INVALID_SUPPLY_CAP = '84';
  string public constant PC_CALLER_NOT_EMERGENCY_OR_POOL_ADMIN = '85';
  string public constant VL_RESERVE_PAUSED = '86';
  string public constant PC_CALLER_NOT_RISK_OR_POOL_ADMIN = '87';
  string public constant RL_ATOKEN_SUPPLY_NOT_ZERO = '88';
  string public constant RL_STABLE_DEBT_NOT_ZERO = '89';
  string public constant RL_VARIABLE_DEBT_SUPPLY_NOT_ZERO = '90';
  string public constant VL_LTV_VALIDATION_FAILED = '93';
  string public constant VL_SAME_BLOCK_BORROW_REPAY = '94';
  string public constant PC_FLASHLOAN_PREMIUMS_MISMATCH = '95';
  string public constant PC_FLASHLOAN_PREMIUM_INVALID = '96';
  string public constant RC_INVALID_LIQUIDATION_PROTOCOL_FEE = '97';
  string public constant RC_INVALID_EMODE_CATEGORY = '98';
  string public constant VL_INCONSISTENT_EMODE_CATEGORY = '99';
  string public constant HLP_UINT128_OVERFLOW = '100';
  string public constant PC_CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN = '101';
  string public constant P_CALLER_NOT_BRIDGE = '102';
  string public constant RC_INVALID_UNBACKED_MINT_CAP = '103';
  string public constant VL_UNBACKED_MINT_CAP_EXCEEDED = '104';
  string public constant VL_PRICE_ORACLE_SENTINEL_CHECK_FAILED = '105';
  string public constant RC_INVALID_DEBT_CEILING = '106';
  string public constant VL_ASSET_NOT_BORROWABLE_IN_ISOLATION = '107';
  string public constant VL_DEBT_CEILING_CROSSED = '108';
  string public constant SL_USER_IN_ISOLATION_MODE = '109';
  string public constant PC_BRIDGE_PROTOCOL_FEE_INVALID = '110';
  string public constant ASSET_NOT_LISTED = '111';
}
