// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title Errors library
 * @author Aave
 * @notice Defines the error messages emitted by the different contracts of the Aave protocol
 * @dev Error messages prefix glossary:
 *  - ACL = Common errors related to Access Control List
 *  - PAPR = PoolAddressesProviderRegistry
 *  - P = Pool
 *  - PC = PoolConfiguration
 *  - CT = Common errors between tokens (AToken, VariableDebtToken and StableDebtToken)
 *  - AT = AToken
 *  - SDT = StableDebtToken
 *  - VDT = VariableDebtToken
 *  - VL = ValidationLogic
 *  - RL = ReserveLogic
 *  - SL = SupplyLogic
 *  - RC = ReserveConfiguration
 *  - UC = UserConfiguration
 *  - HLP = Helpers
 */
library Errors {
  string public constant ACL_CALLER_NOT_POOL_ADMIN = '1'; // 'The caller of the function is not a pool admin'
  string public constant ACL_CALLER_NOT_EMERGENCY_ADMIN = '2'; // 'The caller of the function is not an emergency admin'
  string public constant ACL_CALLER_NOT_POOL_OR_EMERGENCY_ADMIN = '3'; // 'The caller of the function is not a pool or emergency admin'
  string public constant ACL_CALLER_NOT_RISK_OR_POOL_ADMIN = '4'; // 'The caller of the function is not a risk or pool admin'
  string public constant ACL_CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN = '5'; // 'The caller of the function is not an asset listing or pool admin'
  string public constant ACL_CALLER_NOT_BRIDGE = '6'; // 'The caller of the function is not a bridge'
  string public constant PAPR_PROVIDER_NOT_REGISTERED = '7'; // 'Provider is not registered'
  string public constant PAPR_INVALID_ADDRESSES_PROVIDER_ID = '8'; // 'Invalid id for the pool addresses provider'
  string public constant P_NOT_CONTRACT = '9'; // 'Address is not a contract'
  string public constant P_CALLER_NOT_POOL_CONFIGURATOR = '10'; // 'The caller of the function is not the pool configurator'
  string public constant P_CALLER_NOT_ATOKEN = '11'; // 'The caller of the function is not an atoken'
  string public constant P_INCORRECT_ADDRESSES_PROVIDER = '12'; // 'The address of the pool addresses provider is incorrect'
  string public constant P_INVALID_FLASHLOAN_EXECUTOR_RETURN = '13'; // 'Invalid return value of the flashloan executor function'
  string public constant P_RESERVE_ALREADY_ADDED = '14'; // 'Reserve has already been added to reserve list'
  string public constant P_NO_MORE_RESERVES_ALLOWED = '15'; // 'Maximum amount of reserves in the pool reached'
  string public constant P_EMODE_CATEGORY_RESERVED = '16'; // 'Zero eMode category is reserved for volatile heterogeneous assets'
  string public constant P_INVALID_EMODE_CATEGORY_ASSIGNMENT = '17'; // 'Invalid eMode category assignment to asset'
  string public constant PC_RESERVE_LIQUIDITY_NOT_ZERO = '18'; // 'The liquidity of the reserve needs to be 0'
  string public constant PC_FLASHLOAN_PREMIUMS_MISMATCH = '19'; // 'Flashloan total premium should be equal or greater than flashloan premium to protocol'
  string public constant PC_FLASHLOAN_PREMIUM_INVALID = '20'; // 'Invalid flashloan premium'
  string public constant PC_INVALID_PARAMS_RESERVE = '21'; // 'Invalid risk parameters for the reserve'
  string public constant PC_INVALID_PARAMS_EMODE_CATEGORY = '22'; // 'Invalid risk parameters for the eMode category'
  string public constant PC_BRIDGE_PROTOCOL_FEE_INVALID = '23'; // 'Invalid bridge protocol fee'
  string public constant CT_CALLER_MUST_BE_POOL = '24'; // 'The caller of this function must be a pool'
  string public constant CT_INVALID_MINT_AMOUNT = '25'; // 'Invalid amount to mint'
  string public constant CT_INVALID_BURN_AMOUNT = '26'; // 'Invalid amount to burn'
  string public constant VL_INVALID_AMOUNT = '27'; // 'Amount must be greater than 0'
  string public constant VL_RESERVE_NO_ACTIVE = '28'; // 'Action requires an active reserve'
  string public constant VL_RESERVE_FROZEN = '29'; // 'Action cannot be performed because the reserve is frozen'
  string public constant VL_RESERVE_PAUSED = '30'; // 'Action cannot be performed because the reserve is paused'
  string public constant VL_BORROWING_NOT_ENABLED = '31'; // 'Borrowing is not enabled'
  string public constant VL_STABLE_BORROWING_NOT_ENABLED = '32'; // 'Stable borrowing is not enabled'
  string public constant VL_NOT_ENOUGH_AVAILABLE_USER_BALANCE = '33'; // 'User cannot withdraw more than the available balance'
  string public constant VL_INVALID_INTEREST_RATE_MODE_SELECTED = '34'; // 'Invalid interest rate mode selected'
  string public constant VL_COLLATERAL_BALANCE_IS_ZERO = '35'; // 'The collateral balance is 0'
  string public constant VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = '36'; // 'Health factor is lesser than the liquidation threshold'
  string public constant VL_COLLATERAL_CANNOT_COVER_NEW_BORROW = '37'; // 'There is not enough collateral to cover a new borrow'
  string public constant VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY = '38'; // 'Collateral is (mostly) the same currency that is being borrowed'
  string public constant VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE = '39'; // 'The requested amount is greater than the max loan size in stable rate mode'
  string public constant VL_NO_DEBT_OF_SELECTED_TYPE = '40'; // 'For repayment of a specific type of debt, the user needs to have debt that type'
  string public constant VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF = '41'; // 'To repay on behalf of a user an explicit amount to repay is needed'
  string public constant VL_NO_STABLE_RATE_LOAN_IN_RESERVE = '42'; // 'User does not have a stable rate loan in progress on this reserve'
  string public constant VL_NO_VARIABLE_RATE_LOAN_IN_RESERVE = '43'; // 'User does not have a variable rate loan in progress on this reserve'
  string public constant VL_UNDERLYING_BALANCE_ZERO = '44'; // 'The underlying balance needs to be greater than 0'
  string public constant VL_INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET = '45'; // 'Interest rate rebalance conditions were not met'
  string public constant VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD = '46'; // 'Health factor is not below the threshold'
  string public constant VL_COLLATERAL_CANNOT_BE_LIQUIDATED = '47'; // 'The collateral chosen cannot be liquidated'
  string public constant VL_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = '48'; // 'User did not borrow the specified currency'
  string public constant VL_SAME_BLOCK_BORROW_REPAY = '49'; // 'Borrow and repay in same block is not allowed'
  string public constant VL_INCONSISTENT_FLASHLOAN_PARAMS = '50'; // 'Inconsistent flashloan parameters'
  string public constant VL_BORROW_CAP_EXCEEDED = '51'; // 'Borrow cap is exceeded'
  string public constant VL_SUPPLY_CAP_EXCEEDED = '52'; // 'Supply cap is exceeded'
  string public constant VL_UNBACKED_MINT_CAP_EXCEEDED = '53'; // 'Unbacked mint cap is exceeded'
  string public constant VL_DEBT_CEILING_EXCEEDED = '54'; // 'Debt ceiling is exceeded'
  string public constant VL_ATOKEN_SUPPLY_NOT_ZERO = '55'; // 'Atoken supply is not zero'
  string public constant VL_STABLE_DEBT_NOT_ZERO = '56'; // 'Stable debt supply is not zero'
  string public constant VL_VARIABLE_DEBT_SUPPLY_NOT_ZERO = '57'; // 'Variable debt supply is not zero'
  string public constant VL_LTV_VALIDATION_FAILED = '58'; // 'Ltv validation failed'
  string public constant VL_INCONSISTENT_EMODE_CATEGORY = '59'; // 'Inconsistent eMode category'
  string public constant VL_PRICE_ORACLE_SENTINEL_CHECK_FAILED = '60'; // 'Price oracle sentinel validation failed'
  string public constant VL_ASSET_NOT_BORROWABLE_IN_ISOLATION = '61'; // 'Asset is not borrowable in isolation mode'
  string public constant RL_RESERVE_ALREADY_INITIALIZED = '62'; // 'Reserve has already been initialized'
  string public constant SL_USER_IN_ISOLATION_MODE = '63'; // 'User is in isolation mode'
  string public constant RC_INVALID_LTV = '64'; // 'Invalid ltv parameter for the reserve'
  string public constant RC_INVALID_LIQ_THRESHOLD = '65'; // 'Invalid liquidity threshold parameter for the reserve'
  string public constant RC_INVALID_LIQ_BONUS = '66'; // 'Invalid liquidity bonus parameter for the reserve'
  string public constant RC_INVALID_DECIMALS = '67'; // 'Invalid decimals parameter of the underlying asset of the reserve'
  string public constant RC_INVALID_RESERVE_FACTOR = '68'; // 'Invalid reserve factor parameter for the reserve'
  string public constant RC_INVALID_BORROW_CAP = '69'; // 'Invalid borrow cap for the reserve'
  string public constant RC_INVALID_SUPPLY_CAP = '70'; // 'Invalid supply cap for the reserve'
  string public constant RC_INVALID_LIQUIDATION_PROTOCOL_FEE = '71'; // 'Invalid liquidation protocol fee for the reserve'
  string public constant RC_INVALID_EMODE_CATEGORY = '72'; // 'Invalid eMode category for the reserve'
  string public constant RC_INVALID_UNBACKED_MINT_CAP = '73'; // 'Invalid unbacked mint cap for the reserve'
  string public constant RC_INVALID_DEBT_CEILING = '74'; // 'Invalid debt ceiling for the reserve
  string public constant UC_INVALID_RESERVE_INDEX = '75'; // 'Invalid reserve index'
  string public constant HLP_UINT128_OVERFLOW = '76'; // 'Uint128 overflow'
}
