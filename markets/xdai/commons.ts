import BigNumber from 'bignumber.js';
import {
  oneEther,
  oneRay,
  RAY,
  ZERO_ADDRESS,
  MOCK_CHAINLINK_AGGREGATORS_PRICES,
} from '../../helpers/constants';
import { ICommonConfiguration, eXDaiNetwork } from '../../helpers/types';

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const CommonsConfig: ICommonConfiguration = {
  MarketId: 'Commons',
  ATokenNamePrefix: 'Aave XDAI Market',
  StableDebtTokenNamePrefix: 'Aave XDAI Market stable debt',
  VariableDebtTokenNamePrefix: 'Aave XDAI Market variable debt',
  SymbolPrefix: 'm',
  ProviderId: 0, // Overriden in index.ts
  ProtocolGlobalParams: {
    TokenDistributorPercentageBase: '10000',
    MockUsdPriceInWei: '5848466240000000',
    UsdAddress: '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96',
    NilAddress: '0x0000000000000000000000000000000000000000',
    OneAddress: '0x0000000000000000000000000000000000000001',
    AaveReferral: '0',
  },

  // ----------------
  // COMMON PROTOCOL PARAMS ACROSS POOLS AND NETWORKS
  // ----------------

  Mocks: {
    AllAssetsInitialPrices: {
      ...MOCK_CHAINLINK_AGGREGATORS_PRICES,
    },
  },
  // TODO: reorg alphabetically, checking the reason of tests failing
  LendingRateOracleRatesCommon: {
    WETH: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    DAI: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDC: {
      borrowRate: oneRay.multipliedBy(0.039).toFixed(),
    },
    USDT: {
      borrowRate: oneRay.multipliedBy(0.035).toFixed(),
    },
    WBTC: {
      borrowRate: oneRay.multipliedBy(0.03).toFixed(),
    },
    STAKE: {
      borrowRate: oneRay.multipliedBy(0.05).toFixed(), // TEMP
    },
  },
  // ----------------
  // COMMON PROTOCOL ADDRESSES ACROSS POOLS
  // ----------------

  // If PoolAdmin/emergencyAdmin is set, will take priority over PoolAdminIndex/emergencyAdminIndex
  PoolAdmin: {
    [eXDaiNetwork.xdai]: undefined,
  },
  PoolAdminIndex: 0,
  EmergencyAdmin: {
    [eXDaiNetwork.xdai]: undefined,
  },
  EmergencyAdminIndex: 1,
  ProviderRegistry: {
    [eXDaiNetwork.xdai]: '',
  },
  ProviderRegistryOwner: {
    [eXDaiNetwork.xdai]: '',
  },
  LendingPoolConfigurator: {
    [eXDaiNetwork.xdai]: '0',
  },
  LendingPool: {
    [eXDaiNetwork.xdai]: '0',
  },
  LendingRateOracle: {
    [eXDaiNetwork.xdai]: '',
  },
  LendingPoolCollateralManager: {
    [eXDaiNetwork.xdai]: '',
  },
  TokenDistributor: {
    [eXDaiNetwork.xdai]: '',
  },
  WethGateway: {
    [eXDaiNetwork.xdai]: '',
  },
  AaveOracle: {
    [eXDaiNetwork.xdai]: '',
  },
  FallbackOracle: {
    [eXDaiNetwork.xdai]: ZERO_ADDRESS,
  },
  ChainlinkAggregator: {
    [eXDaiNetwork.xdai]: {
      DAI: ZERO_ADDRESS,
      USDC: ZERO_ADDRESS,
      USDT: ZERO_ADDRESS,
      WBTC: ZERO_ADDRESS,
      STAKE: ZERO_ADDRESS,
    },
  },
  ReserveAssets: {
    [eXDaiNetwork.xdai]: {},
  },
  ReservesConfig: {},
  ATokenDomainSeparator: {
    [eXDaiNetwork.xdai]: '',
  },
  WETH: {
    [eXDaiNetwork.xdai]: '', // DAI: xDAI is the base token, DAI is also there, We need WXDAI
  },
  WrappedNativeToken: {
    [eXDaiNetwork.xdai]: '', // DAI: xDAI is the base token, DAI is also there, We need WXDAI
  },
  ReserveFactorTreasuryAddress: {
    [eXDaiNetwork.xdai]: '', // TEMP
  },
  IncentivesController: {
    [eXDaiNetwork.xdai]: ZERO_ADDRESS,
  },
};
