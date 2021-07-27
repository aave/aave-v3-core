import { IMaticConfiguration, ePolygonNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyUSDC,
  strategyUSDT,
  strategyWBTC,
  strategyWETH,
  strategyMATIC,
  strategyAAVE,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const MaticConfig: IMaticConfiguration = {
  ...CommonsConfig,
  MarketId: 'Matic Market',
  ProviderId: 3, // Unknown?
  ReservesConfig: {
    DAI: strategyDAI,
    USDC: strategyUSDC,
    USDT: strategyUSDT,
    WBTC: strategyWBTC,
    WETH: strategyWETH,
    WMATIC: strategyMATIC,
    AAVE: strategyAAVE,
  },
  ReserveAssets: {
    [ePolygonNetwork.matic]: {
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      AAVE: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    },
    [ePolygonNetwork.mumbai]: {
      // Mock tokens with a simple "mint" external function, except wmatic
      DAI: '0x13b3fda609C1eeb23b4F4b69257840760dCa6C4a',
      USDC: '0x52b63223994433FdE2F1350Ba69Dfd2779f06ABA',
      USDT: '0xB3abd1912F586fDFFa13606882c28E27913853d2',
      WBTC: '0x393E3512d45a956A628124665672312ea86930Ba',
      WETH: '0x53CDb16B8C031B779e996406546614E5F05BC4Bf',
      WMATIC: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
    },
  },
};

export default MaticConfig;
