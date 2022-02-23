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
  ACLManager = 'ACLManager',
  PoolParametersProvider = 'PoolParametersProvider',
  PoolConfigurator = 'PoolConfigurator',
  ValidationLogic = 'ValidationLogic',
  ReserveLogic = 'ReserveLogic',
  GenericLogic = 'GenericLogic',
  SupplyLogic = 'SupplyLogic',
  BorrowLogic = 'BorrowLogic',
  FlashLoanLogic = 'FlashLoanLogic',
  LiquidationLogic = 'LiquidationLogic',
  BridgeLogic = 'BridgeLogic',
  EModeLogic = 'EModeLogic',
  ConfiguratorLogic = 'ConfiguratorLogic',
  Pool = 'Pool',
  PriceOracle = 'PriceOracle',
  Proxy = 'Proxy',
  MockAggregator = 'MockAggregator',
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
 * Error messages
 */
export enum ProtocolErrors {
  CALLER_NOT_POOL_ADMIN = '1', // 'The caller of the function is not a pool admin'
  CALLER_NOT_EMERGENCY_ADMIN = '2', // 'The caller of the function is not an emergency admin'
  CALLER_NOT_POOL_OR_EMERGENCY_ADMIN = '3', // 'The caller of the function is not a pool or emergency admin'
  CALLER_NOT_RISK_OR_POOL_ADMIN = '4', // 'The caller of the function is not a risk or pool admin'
  CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN = '5', // 'The caller of the function is not an asset listing or pool admin'
  CALLER_NOT_BRIDGE = '6', // 'The caller of the function is not a bridge'
  ADDRESSES_PROVIDER_NOT_REGISTERED = '7', // 'Pool addresses provider is not registered'
  INVALID_ADDRESSES_PROVIDER_ID = '8', // 'Invalid id for the pool addresses provider'
  NOT_CONTRACT = '9', // 'Address is not a contract'
  CALLER_NOT_POOL_CONFIGURATOR = '10', // 'The caller of the function is not the pool configurator'
  CALLER_NOT_ATOKEN = '11', // 'The caller of the function is not an AToken'
  INVALID_ADDRESSES_PROVIDER = '12', // 'The address of the pool addresses provider is invalid'
  INVALID_FLASHLOAN_EXECUTOR_RETURN = '13', // 'Invalid return value of the flashloan executor function'
  RESERVE_ALREADY_ADDED = '14', // 'Reserve has already been added to reserve list'
  NO_MORE_RESERVES_ALLOWED = '15', // 'Maximum amount of reserves in the pool reached'
  EMODE_CATEGORY_RESERVED = '16', // 'Zero eMode category is reserved for volatile heterogeneous assets'
  INVALID_EMODE_CATEGORY_ASSIGNMENT = '17', // 'Invalid eMode category assignment to asset'
  RESERVE_LIQUIDITY_NOT_ZERO = '18', // 'The liquidity of the reserve needs to be 0'
  FLASHLOAN_PREMIUM_INVALID = '19', // 'Invalid flashloan premium'
  INVALID_RESERVE_PARAMS = '20', // 'Invalid risk parameters for the reserve'
  INVALID_EMODE_CATEGORY_PARAMS = '21', // 'Invalid risk parameters for the eMode category'
  BRIDGE_PROTOCOL_FEE_INVALID = '22', // 'Invalid bridge protocol fee'
  CALLER_MUST_BE_POOL = '23', // 'The caller of this function must be a pool'
  INVALID_MINT_AMOUNT = '24', // 'Invalid amount to mint'
  INVALID_BURN_AMOUNT = '25', // 'Invalid amount to burn'
  INVALID_AMOUNT = '26', // 'Amount must be greater than 0'
  RESERVE_INACTIVE = '27', // 'Action requires an active reserve'
  RESERVE_FROZEN = '28', // 'Action cannot be performed because the reserve is frozen'
  RESERVE_PAUSED = '29', // 'Action cannot be performed because the reserve is paused'
  BORROWING_NOT_ENABLED = '30', // 'Borrowing is not enabled'
  STABLE_BORROWING_NOT_ENABLED = '31', // 'Stable borrowing is not enabled'
  NOT_ENOUGH_AVAILABLE_USER_BALANCE = '32', // 'User cannot withdraw more than the available balance'
  INVALID_INTEREST_RATE_MODE_SELECTED = '33', // 'Invalid interest rate mode selected'
  COLLATERAL_BALANCE_IS_ZERO = '34', // 'The collateral balance is 0'
  HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = '35', // 'Health factor is lesser than the liquidation threshold'
  COLLATERAL_CANNOT_COVER_NEW_BORROW = '36', // 'There is not enough collateral to cover a new borrow'
  COLLATERAL_SAME_AS_BORROWING_CURRENCY = '37', // 'Collateral is (mostly) the same currency that is being borrowed'
  AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE = '38', // 'The requested amount is greater than the max loan size in stable rate mode'
  NO_DEBT_OF_SELECTED_TYPE = '39', // 'For repayment of a specific type of debt, the user needs to have debt that type'
  NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF = '40', // 'To repay on behalf of a user an explicit amount to repay is needed'
  NO_OUTSTANDING_STABLE_DEBT = '41', // 'User does not have outstanding stable rate debt on this reserve'
  NO_OUTSTANDING_VARIABLE_DEBT = '42', // 'User does not have outstanding variable rate debt on this reserve'
  UNDERLYING_BALANCE_ZERO = '43', // 'The underlying balance needs to be greater than 0'
  INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET = '44', // 'Interest rate rebalance conditions were not met'
  HEALTH_FACTOR_NOT_BELOW_THRESHOLD = '45', // 'Health factor is not below the threshold'
  COLLATERAL_CANNOT_BE_LIQUIDATED = '46', // 'The collateral chosen cannot be liquidated'
  SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = '47', // 'User did not borrow the specified currency'
  SAME_BLOCK_BORROW_REPAY = '48', // 'Borrow and repay in same block is not allowed'
  INCONSISTENT_FLASHLOAN_PARAMS = '49', // 'Inconsistent flashloan parameters'
  BORROW_CAP_EXCEEDED = '50', // 'Borrow cap is exceeded'
  SUPPLY_CAP_EXCEEDED = '51', // 'Supply cap is exceeded'
  UNBACKED_MINT_CAP_EXCEEDED = '52', // 'Unbacked mint cap is exceeded'
  DEBT_CEILING_EXCEEDED = '53', // 'Debt ceiling is exceeded'
  ATOKEN_SUPPLY_NOT_ZERO = '54', // 'AToken supply is not zero'
  STABLE_DEBT_NOT_ZERO = '55', // 'Stable debt supply is not zero'
  VARIABLE_DEBT_SUPPLY_NOT_ZERO = '56', // 'Variable debt supply is not zero'
  LTV_VALIDATION_FAILED = '57', // 'Ltv validation failed'
  INCONSISTENT_EMODE_CATEGORY = '58', // 'Inconsistent eMode category'
  PRICE_ORACLE_SENTINEL_CHECK_FAILED = '59', // 'Price oracle sentinel validation failed'
  ASSET_NOT_BORROWABLE_IN_ISOLATION = '60', // 'Asset is not borrowable in isolation mode'
  RESERVE_ALREADY_INITIALIZED = '61', // 'Reserve has already been initialized'
  USER_IN_ISOLATION_MODE = '62', // 'User is in isolation mode'
  INVALID_LTV = '63', // 'Invalid ltv parameter for the reserve'
  INVALID_LIQ_THRESHOLD = '64', // 'Invalid liquidity threshold parameter for the reserve'
  INVALID_LIQ_BONUS = '65', // 'Invalid liquidity bonus parameter for the reserve'
  INVALID_DECIMALS = '66', // 'Invalid decimals parameter of the underlying asset of the reserve'
  INVALID_RESERVE_FACTOR = '67', // 'Invalid reserve factor parameter for the reserve'
  INVALID_BORROW_CAP = '68', // 'Invalid borrow cap for the reserve'
  INVALID_SUPPLY_CAP = '69', // 'Invalid supply cap for the reserve'
  INVALID_LIQUIDATION_PROTOCOL_FEE = '70', // 'Invalid liquidation protocol fee for the reserve'
  INVALID_EMODE_CATEGORY = '71', // 'Invalid eMode category for the reserve'
  INVALID_UNBACKED_MINT_CAP = '72', // 'Invalid unbacked mint cap for the reserve'
  INVALID_DEBT_CEILING = '73', // 'Invalid debt ceiling for the reserve
  INVALID_RESERVE_INDEX = '74', // 'Invalid reserve index'
  ACL_ADMIN_CANNOT_BE_ZERO = '75', // 'ACL admin cannot be set to the zero address'
  INCONSISTENT_PARAMS_LENGTH = '76', // 'Array parameters that should be equal length are not'
  ZERO_ADDRESS_NOT_VALID = '77', // 'Zero address not valid'
  INVALID_EXPIRATION = '78', // 'Invalid expiration'
  INVALID_SIGNATURE = '79', // 'Invalid signature'
  OPERATION_NOT_SUPPORTED = '80', // 'Operation not supported'
  DEBT_CEILING_NOT_ZERO = '81', // 'Debt ceiling is not zero'
  ASSET_NOT_LISTED = '82', // 'Asset is not listed'
  INVALID_OPTIMAL_USAGE_RATIO = '83', // 'Invalid optimal usage ratio'
  INVALID_OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO = '84', // 'Invalid optimal stable to total debt ratio'
  UNDERLYING_CANNOT_BE_RESCUED = '85', // 'The underlying asset cannot be rescued'
  ADDRESSES_PROVIDER_ALREADY_ADDED = '86', // 'Reserve has already been added to reserve list'
  POOL_ADDRESSES_DO_NOT_MATCH = '87', // 'The token implementation pool address and the pool address provided by the initializing pool do not match'
  STABLE_BORROWING_ENABLED = '88', // 'Stable borrowing is enabled'
  SILOED_BORROWING_VIOLATION = '89', // user is trying to violate the siloed borrowing rule
  RESERVE_DEBT_NOT_ZERO = '90', // the total debt of the reserve needs to be 0
  // SafeCast
  SAFECAST_UINT128_OVERFLOW = "SafeCast: value doesn't fit in 128 bits",

  // Ownable
  OWNABLE_ONLY_OWNER = 'Ownable: caller is not the owner',

  // ERC20
  ERC20_TRANSFER_AMOUNT_EXCEEDS_BALANCE = 'ERC20: transfer amount exceeds balance',

  // old

  INVALID_FROM_BALANCE_AFTER_TRANSFER = 'Invalid from balance after transfer',
  INVALID_TO_BALANCE_AFTER_TRANSFER = 'Invalid from balance after transfer',
  INVALID_HF = 'Invalid health factor',
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
  optimalUsageRatio: string;
  baseVariableBorrowRate: string;
  variableRateSlope1: string;
  variableRateSlope2: string;
  stableRateSlope1: string;
  stableRateSlope2: string;
  baseStableRateOffset: string;
  stableRateExcessOffset: string;
  optimalStableToTotalDebtRatio: string;
}

export interface IReserveBorrowParams {
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
