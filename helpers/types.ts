import { BigNumber } from 'ethers';

export interface SymbolMap<T> {
  [symbol: string]: T;
}

export type eNetwork = eEthereumNetwork;

export enum eEthereumNetwork {
  kovan = 'kovan',
  ropsten = 'ropsten',
  main = 'main',
  coverage = 'coverage',
  hardhat = 'hardhat',
  tenderlyMain = 'tenderlyMain',
}

export enum eContractid {
  Example = 'Example',
  PoolAddressesProvider = 'PoolAddressesProvider',
  MintableERC20 = 'MintableERC20',
  MintableDelegationERC20 = 'MintableDelegationERC20',
  PoolAddressesProviderRegistry = 'PoolAddressesProviderRegistry',
  PoolParametersProvider = 'PoolParametersProvider',
  PoolConfigurator = 'PoolConfigurator',
  ValidationLogic = 'ValidationLogic',
  ReserveLogic = 'ReserveLogic',
  GenericLogic = 'GenericLogic',
  SupplyLogic = 'SupplyLogic',
  BorrowLogic = 'BorrowLogic',
  LiquidationLogic = 'LiquidationLogic',
  ConfiguratorLogic = 'ConfiguratorLogic',
  Pool = 'Pool',
  PriceOracle = 'PriceOracle',
  Proxy = 'Proxy',
  MockAggregator = 'MockAggregator',
  RateOracle = 'RateOracle',
  AaveOracle = 'AaveOracle',
  DefaultReserveInterestRateStrategy = 'DefaultReserveInterestRateStrategy',
  InitializableImmutableAdminUpgradeabilityProxy = 'InitializableImmutableAdminUpgradeabilityProxy',
  MockFlashLoanReceiver = 'MockFlashLoanReceiver',
  AToken = 'AToken',
  MockAToken = 'MockAToken',
  DelegationAwareAToken = 'DelegationAwareAToken',
  MockStableDebtToken = 'MockStableDebtToken',
  MockVariableDebtToken = 'MockVariableDebtToken',
  AaveProtocolDataProvider = 'AaveProtocolDataProvider',
  IERC20Detailed = 'IERC20Detailed',
  StableDebtToken = 'StableDebtToken',
  VariableDebtToken = 'VariableDebtToken',
  FeeProvider = 'FeeProvider',
  TokenDistributor = 'TokenDistributor',
  RateOracleSetupHelper = 'RateOracleSetupHelper',
  ReservesSetupHelper = 'ReservesSetupHelper',
  WETH = 'WETH',
  WETHMocked = 'WETHMocked',
  PoolImpl = 'PoolImpl',
  PoolConfiguratorImpl = 'PoolConfiguratorImpl',
  MockIncentivesController = 'MockIncentivesController',
  MockReserveConfiguration = 'MockReserveConfiguration',
  MockPool = 'MockPool',
  MockInitializableImple = 'MockInitializableImple',
  MockInitializableImpleV2 = 'MockInitializableImpleV2',
  MockInitializableFromConstructorImple = 'MockInitializableFromConstructorImple',
  MockReentrantInitializableImple = 'MockReentrantInitializableImple',
}

/*
 * Error messages prefix glossary:
 *  - VL = ValidationLogic
 *  - MATH = Math libraries
 *  - AT = aToken or DebtTokens
 *  - P = Pool
 *  - PAPR = PoolAddressesProviderRegistry
 *  - PC = PoolConfiguration
 *  - RL = ReserveLogic
 *  - P = Pausable
 */
export enum ProtocolErrors {
  //common errors
  CALLER_NOT_POOL_ADMIN = '33', // 'The caller must be the pool admin'

  //contract specific errors
  VL_INVALID_AMOUNT = '1', // 'Amount must be greater than 0'
  VL_NO_ACTIVE_RESERVE = '2', // 'Action requires an active reserve'
  VL_RESERVE_FROZEN = '3', // 'Action requires an unfrozen reserve'
  VL_CURRENT_AVAILABLE_LIQUIDITY_NOT_ENOUGH = '4', // 'The current liquidity is not enough'
  VL_NOT_ENOUGH_AVAILABLE_USER_BALANCE = '5', // 'User cannot withdraw more than the available balance'
  VL_BORROWING_NOT_ENABLED = '7', // 'Borrowing is not enabled'
  VL_INVALID_INTEREST_RATE_MODE_SELECTED = '8', // 'Invalid interest rate mode selected'
  VL_COLLATERAL_BALANCE_IS_0 = '9', // 'The collateral balance is 0'
  VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = '10', // 'Health factor is lesser than the liquidation threshold'
  VL_COLLATERAL_CANNOT_COVER_NEW_BORROW = '11', // 'There is not enough collateral to cover a new borrow'
  VL_STABLE_BORROWING_NOT_ENABLED = '12', // stable borrowing not enabled
  VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY = '13', // collateral is (mostly) the same currency that is being borrowed
  VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE = '14', // 'The requested amount is greater than the max loan size in stable rate mode
  VL_NO_DEBT_OF_SELECTED_TYPE = '15', // 'for repayment of stable debt, the user needs to have stable debt, otherwise, he needs to have variable debt'
  VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF = '16', // 'To repay on behalf of an user an explicit amount to repay is needed'
  VL_NO_STABLE_RATE_LOAN_IN_RESERVE = '17', // 'User does not have a stable rate loan in progress on this reserve'
  VL_NO_VARIABLE_RATE_LOAN_IN_RESERVE = '18', // 'User does not have a variable rate loan in progress on this reserve'
  VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0 = '19', // 'The underlying balance needs to be greater than 0'
  VL_SUPPLIED_ASSETS_ALREADY_IN_USE = '20', // 'User supplied assets are already being used as collateral'
  P_NOT_ENOUGH_STABLE_BORROW_BALANCE = '21', // 'User does not have any stable rate loan for this reserve'
  P_INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET = '22', // 'Interest rate rebalance conditions were not met'
  P_LIQUIDATION_CALL_FAILED = '23', // 'Liquidation call failed'
  P_NOT_ENOUGH_LIQUIDITY_TO_BORROW = '24', // 'There is not enough liquidity available to borrow'
  P_REQUESTED_AMOUNT_TOO_SMALL = '25', // 'The requested amount is too small for a FlashLoan.'
  P_INCONSISTENT_PROTOCOL_ACTUAL_BALANCE = '26', // 'The actual balance of the protocol is inconsistent'
  P_CALLER_NOT_POOL_CONFIGURATOR = '27', // 'The caller is not the pool configurator'
  P_INCONSISTENT_FLASHLOAN_PARAMS = '28',
  CT_CALLER_MUST_BE_POOL = '29', // 'The caller of this function must be a pool'
  CT_CANNOT_GIVE_ALLOWANCE_TO_HIMSELF = '30', // 'User cannot give allowance to himself'
  CT_TRANSFER_AMOUNT_NOT_GT_0 = '31', // 'Transferred amount needs to be greater than zero'
  RL_RESERVE_ALREADY_INITIALIZED = '32', // 'Reserve has already been initialized'
  PC_RESERVE_LIQUIDITY_NOT_0 = '34', // 'The liquidity of the reserve needs to be 0'
  PC_INVALID_ATOKEN_POOL_ADDRESS = '35', // 'The liquidity of the reserve needs to be 0'
  PC_INVALID_STABLE_DEBT_TOKEN_POOL_ADDRESS = '36', // 'The liquidity of the reserve needs to be 0'
  PC_INVALID_VARIABLE_DEBT_TOKEN_POOL_ADDRESS = '37', // 'The liquidity of the reserve needs to be 0'
  PC_INVALID_STABLE_DEBT_TOKEN_UNDERLYING_ADDRESS = '38', // 'The liquidity of the reserve needs to be 0'
  PC_INVALID_VARIABLE_DEBT_TOKEN_UNDERLYING_ADDRESS = '39', // 'The liquidity of the reserve needs to be 0'
  PC_INVALID_ADDRESSES_PROVIDER_ID = '40', // 'The liquidity of the reserve needs to be 0'
  PC_CALLER_NOT_EMERGENCY_ADMIN = '76', // 'The caller must be the emergencya admin'
  PAPR_PROVIDER_NOT_REGISTERED = '41', // 'Provider is not registered'
  VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD = '42', // 'Health factor is not below the threshold'
  VL_COLLATERAL_CANNOT_BE_LIQUIDATED = '43', // 'The collateral chosen cannot be liquidated'
  VL_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = '44', // 'User did not borrow the specified currency'
  VL_NOT_ENOUGH_LIQUIDITY_TO_LIQUIDATE = '45', // "There isn't enough liquidity available to liquidate"
  P_INVALID_FLASHLOAN_MODE = '47', //Invalid flashloan mode selected
  MATH_MULTIPLICATION_OVERFLOW = '48',
  MATH_ADDITION_OVERFLOW = '49',
  MATH_DIVISION_BY_ZERO = '50',
  CT_INVALID_MINT_AMOUNT = '56', //invalid amount to mint
  CT_INVALID_BURN_AMOUNT = '58', //invalid amount to burn
  P_REENTRANCY_NOT_ALLOWED = '62',
  P_CALLER_MUST_BE_AN_ATOKEN = '63',
  P_IS_PAUSED = '64', // 'Pool is paused'
  P_NO_MORE_RESERVES_ALLOWED = '65',
  P_INVALID_FLASH_LOAN_EXECUTOR_RETURN = '66',
  P_NOT_CONTRACT = '78',
  RC_INVALID_LTV = '67',
  RC_INVALID_LIQ_THRESHOLD = '68',
  RC_INVALID_LIQ_BONUS = '69',
  RC_INVALID_DECIMALS = '70',
  RC_INVALID_RESERVE_FACTOR = '71',
  PAPR_INVALID_ADDRESSES_PROVIDER_ID = '72',
  VL_INCONSISTENT_FLASHLOAN_PARAMS = '73',
  SDT_STABLE_DEBT_OVERFLOW = '79',
  VL_BORROW_CAP_EXCEEDED = '81',
  RC_INVALID_BORROW_CAP = '82',
  VL_SUPPLY_CAP_EXCEEDED = '83',
  RC_INVALID_SUPPLY_CAP = '84',
  PC_INVALID_CONFIGURATION = '75',
  PC_CALLER_NOT_EMERGENCY_OR_POOL_ADMIN = '85',
  VL_RESERVE_PAUSED = '86',
  PC_CALLER_NOT_RISK_OR_POOL_ADMIN = '87',
  RL_ATOKEN_SUPPLY_NOT_ZERO = '88',
  RL_STABLE_DEBT_NOT_ZERO = '89',
  RL_VARIABLE_DEBT_SUPPLY_NOT_ZERO = '90',
  VL_LTV_VALIDATION_FAILED = '93',
  VL_SAME_BLOCK_BORROW_REPAY = '94',
  PC_FLASHLOAN_PREMIUMS_MISMATCH = '95',
  PC_FLASHLOAN_PREMIUM_INVALID = '96',
  RC_INVALID_LIQUIDATION_PROTOCOL_FEE = '97',
  RC_INVALID_EMODE_CATEGORY = '98',
  VL_INCONSISTENT_EMODE_CATEGORY = '99',
  HLP_UINT128_OVERFLOW = '100',

  // old

  INVALID_FROM_BALANCE_AFTER_TRANSFER = 'Invalid from balance after transfer',
  INVALID_TO_BALANCE_AFTER_TRANSFER = 'Invalid from balance after transfer',
  INVALID_OWNER_REVERT_MSG = 'Ownable: caller is not the owner',
  INVALID_HF = 'Invalid health factor',
  TRANSFER_AMOUNT_EXCEEDS_BALANCE = 'ERC20: transfer amount exceeds balance',
  SAFEERC20_LOWLEVEL_CALL = 'SafeERC20: low-level call failed',
}

export type tEthereumAddress = string;
export type tStringTokenBigUnits = string; // 1 ETH, or 10e6 USDC or 10e18 DAI
export type tBigNumberTokenBigUnits = BigNumber;
export type tStringTokenSmallUnits = string; // 1 wei, or 1 basic unit of USDC, or 1 basic unit of DAI
export type tBigNumberTokenSmallUnits = BigNumber;

export interface iAssetCommon<T> {
  [key: string]: T;
}
export interface iAssetBase<T> {
  WETH: T;
  DAI: T;
  TUSD: T;
  USDC: T;
  USDT: T;
  SUSD: T;
  AAVE: T;
  BAT: T;
  MKR: T;
  LINK: T;
  KNC: T;
  WBTC: T;
  MANA: T;
  ZRX: T;
  SNX: T;
  BUSD: T;
  YFI: T;
  UNI: T;
  USD: T;
  REN: T;
  ENJ: T;
  UniDAIWETH: T;
  UniWBTCWETH: T;
  UniAAVEWETH: T;
  UniBATWETH: T;
  UniDAIUSDC: T;
  UniCRVWETH: T;
  UniLINKWETH: T;
  UniMKRWETH: T;
  UniRENWETH: T;
  UniSNXWETH: T;
  UniUNIWETH: T;
  UniUSDCWETH: T;
  UniWBTCUSDC: T;
  UniYFIWETH: T;
  BptWBTCWETH: T;
  BptBALWETH: T;
  WMATIC: T;
  STAKE: T;
  xSUSHI: T;
}

export type iAssetsWithoutETH<T> = Omit<iAssetBase<T>, 'ETH'>;

export type iAssetsWithoutUSD<T> = Omit<iAssetBase<T>, 'USD'>;

export type iAavePoolAssets<T> = Pick<
  iAssetsWithoutUSD<T>,
  | 'DAI'
  | 'TUSD'
  | 'USDC'
  | 'USDT'
  | 'SUSD'
  | 'AAVE'
  | 'BAT'
  | 'MKR'
  | 'LINK'
  | 'KNC'
  | 'WBTC'
  | 'MANA'
  | 'ZRX'
  | 'SNX'
  | 'BUSD'
  | 'WETH'
  | 'YFI'
  | 'UNI'
  | 'REN'
  | 'ENJ'
  | 'xSUSHI'
>;

export type iMultiPoolsAssets<T> = iAssetCommon<T> | iAavePoolAssets<T>;

export type iAssetAggregatorBase<T> = iAssetsWithoutETH<T>;

export enum TokenContractId {
  DAI = 'DAI',
  AAVE = 'AAVE',
  TUSD = 'TUSD',
  BAT = 'BAT',
  WETH = 'WETH',
  USDC = 'USDC',
  USDT = 'USDT',
  SUSD = 'SUSD',
  ZRX = 'ZRX',
  MKR = 'MKR',
  WBTC = 'WBTC',
  LINK = 'LINK',
  KNC = 'KNC',
  MANA = 'MANA',
  REN = 'REN',
  SNX = 'SNX',
  BUSD = 'BUSD',
  USD = 'USD',
  YFI = 'YFI',
  UNI = 'UNI',
  ENJ = 'ENJ',
  UniDAIWETH = 'UniDAIWETH',
  UniWBTCWETH = 'UniWBTCWETH',
  UniAAVEWETH = 'UniAAVEWETH',
  UniBATWETH = 'UniBATWETH',
  UniDAIUSDC = 'UniDAIUSDC',
  UniCRVWETH = 'UniCRVWETH',
  UniLINKWETH = 'UniLINKWETH',
  UniMKRWETH = 'UniMKRWETH',
  UniRENWETH = 'UniRENWETH',
  UniSNXWETH = 'UniSNXWETH',
  UniUNIWETH = 'UniUNIWETH',
  UniUSDCWETH = 'UniUSDCWETH',
  UniWBTCUSDC = 'UniWBTCUSDC',
  UniYFIWETH = 'UniYFIWETH',
  BptWBTCWETH = 'BptWBTCWETH',
  BptBALWETH = 'BptBALWETH',
  WMATIC = 'WMATIC',
  STAKE = 'STAKE',
  xSUSHI = 'xSUSHI',
}

export interface IReserveParams extends IReserveBorrowParams, IReserveCollateralParams {
  aTokenImpl: eContractid;
  reserveFactor: string;
  supplyCap: string;
  strategy: IInterestRateStrategyParams;
}

export interface IInterestRateStrategyParams {
  name: string;
  optimalUtilizationRate: string;
  baseVariableBorrowRate: string;
  variableRateSlope1: string;
  variableRateSlope2: string;
  stableRateSlope1: string;
  stableRateSlope2: string;
}

export interface IReserveBorrowParams {
  // optimalUtilizationRate: string;
  // baseVariableBorrowRate: string;
  // variableRateSlope1: string;
  // variableRateSlope2: string;
  // stableRateSlope1: string;
  // stableRateSlope2: string;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  reserveDecimals: string;
  borrowCap: string;
}

export interface IReserveCollateralParams {
  baseLTVAsCollateral: string;
  liquidationThreshold: string;
  liquidationBonus: string;
}
export interface IMarketRates {
  borrowRate: string;
}

export type iParamsPerNetwork<T> = iEthereumParamsPerNetwork<T>;

export interface iParamsPerNetworkAll<T> extends iEthereumParamsPerNetwork<T> {}

export interface iEthereumParamsPerNetwork<T> {
  [eEthereumNetwork.coverage]: T;
  [eEthereumNetwork.kovan]: T;
  [eEthereumNetwork.ropsten]: T;
  [eEthereumNetwork.main]: T;
  [eEthereumNetwork.hardhat]: T;
  [eEthereumNetwork.tenderlyMain]: T;
}

export enum RateMode {
  None = '0',
  Stable = '1',
  Variable = '2',
}

export interface IProtocolGlobalConfig {
  TokenDistributorPercentageBase: string;
  MockUsdPriceInWei: string;
  UsdAddress: tEthereumAddress;
  NilAddress: tEthereumAddress;
  OneAddress: tEthereumAddress;
  AaveReferral: string;
}

export interface IMocksConfig {
  AllAssetsInitialPrices: iAssetBase<string>;
}

export interface IRateOracleRatesCommon {
  [token: string]: IRate;
}

export interface IRate {
  borrowRate: string;
}

export interface ICommonConfiguration {
  MarketId: string;
  ATokenNamePrefix: string;
  StableDebtTokenNamePrefix: string;
  VariableDebtTokenNamePrefix: string;
  SymbolPrefix: string;
  ProviderId: number;
  ProtocolGlobalParams: IProtocolGlobalConfig;
  Mocks: IMocksConfig;
  ProviderRegistry: tEthereumAddress | undefined;
  ProviderRegistryOwner: tEthereumAddress | undefined;
  PoolConfigurator: tEthereumAddress | undefined;
  Pool: tEthereumAddress | undefined;
  RateOracleRatesCommon: iMultiPoolsAssets<IMarketRates>;
  RateOracle: tEthereumAddress | undefined;
  TokenDistributor: tEthereumAddress | undefined;
  AaveOracle: tEthereumAddress | undefined;
  FallbackOracle: tEthereumAddress | undefined;
  ChainlinkAggregator: tEthereumAddress | undefined;
  PoolAdmin: tEthereumAddress | undefined;
  PoolAdminIndex: number;
  EmergencyAdmin: tEthereumAddress | undefined;
  EmergencyAdminIndex: number;
  ReserveAssets: SymbolMap<tEthereumAddress> | SymbolMap<undefined>;
  ReservesConfig: iMultiPoolsAssets<IReserveParams>;
  ATokenDomainSeparator: string;
  WETH: tEthereumAddress | undefined;
  WrappedNativeToken: tEthereumAddress | undefined;
  ReserveFactorTreasuryAddress: tEthereumAddress;
  IncentivesController: tEthereumAddress | undefined;
}

export interface IAaveConfiguration extends ICommonConfiguration {
  ReservesConfig: iMultiPoolsAssets<IReserveParams>;
}

export type PoolConfiguration = ICommonConfiguration | IAaveConfiguration;
