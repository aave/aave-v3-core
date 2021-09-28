import { utils } from 'ethers';
import { MOCK_CHAINLINK_AGGREGATORS_PRICES } from '../helpers/constants';
import { IAaveConfiguration, eEthereumNetwork } from '../helpers/types';

import {
  strategyBUSD,
  strategyDAI,
  strategySUSD,
  strategyTUSD,
  strategyUSDC,
  strategyUSDT,
  strategyAAVE,
  strategyBAT,
  strategyZRX,
  strategyKNC,
  strategyLINK,
  strategyMANA,
  strategyMKR,
  strategyREN,
  strategySNX,
  strategyUNI,
  strategyWBTC,
  strategyWETH,
  strategyYFI,
  strategyXSUSHI,
  strategyENJ,
} from './reservesConfigs';

export const AaveConfig: IAaveConfiguration = {
  // BASIC INFO
  MarketId: 'Commons',
  ATokenNamePrefix: 'Aave interest bearing',
  StableDebtTokenNamePrefix: 'Aave stable debt bearing',
  VariableDebtTokenNamePrefix: 'Aave variable debt bearing',
  SymbolPrefix: '',
  ProviderId: 0, // Overridden in index.ts
  ProtocolGlobalParams: {
    TokenDistributorPercentageBase: '10000',
    MockUsdPriceInWei: '5848466240000000',
    UsdAddress: '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96',
    NilAddress: '0x0000000000000000000000000000000000000000',
    OneAddress: '0x0000000000000000000000000000000000000001',
    AaveReferral: '0',
  },

  // MARKET CONFIGURATION
  PoolAdmin: undefined,
  PoolAdminIndex: 0,
  EmergencyAdmin: undefined,
  EmergencyAdminIndex: 1,
  ProviderRegistry: undefined,
  ProviderRegistryOwner: undefined,
  PoolConfigurator: undefined,
  Pool: undefined,
  TokenDistributor: undefined,
  AaveOracle: undefined,
  FallbackOracle: undefined,
  ChainlinkAggregator: undefined,
  ATokenDomainSeparator: '0xbae024d959c6a022dc5ed37294cd39c141034b2ae5f02a955cce75c930a81bf5',
  WETH: undefined,
  WrappedNativeToken: undefined,
  ReserveFactorTreasuryAddress: '0x464c71f6c2f760dda6093dcb91c24c39e5d6e18c',
  IncentivesController: undefined,

  // MOCK ORACLES
  Mocks: {
    AllAssetsInitialPrices: {
      ...MOCK_CHAINLINK_AGGREGATORS_PRICES,
    },
  },

  // RESERVE ASSETS - CONFIG, ASSETS, BORROW RATES,
  ReservesConfig: {
    AAVE: strategyAAVE,
    BAT: strategyBAT,
    BUSD: strategyBUSD,
    DAI: strategyDAI,
    ENJ: strategyENJ,
    KNC: strategyKNC,
    LINK: strategyLINK,
    MANA: strategyMANA,
    MKR: strategyMKR,
    REN: strategyREN,
    SNX: strategySNX,
    SUSD: strategySUSD,
    TUSD: strategyTUSD,
    UNI: strategyUNI,
    USDC: strategyUSDC,
    USDT: strategyUSDT,
    WBTC: strategyWBTC,
    WETH: strategyWETH,
    YFI: strategyYFI,
    ZRX: strategyZRX,
    xSUSHI: strategyXSUSHI,
  },
  ReserveAssets: {
    [eEthereumNetwork.hardhat]: undefined,
    [eEthereumNetwork.coverage]: undefined,
    [eEthereumNetwork.tenderlyMain]: undefined,
  },
};

export default AaveConfig;
