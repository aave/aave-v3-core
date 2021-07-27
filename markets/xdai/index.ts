import { oneRay, ZERO_ADDRESS } from '../../helpers/constants';
import { IXDAIConfiguration, eXDaiNetwork } from '../../helpers/types';

import { CommonsConfig } from './commons';
import {
  strategyDAI,
  strategyUSDC,
  strategyUSDT,
  strategyWBTC,
  strategyWETH,
  strategySTAKE,
} from './reservesConfigs';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const XDAIConfig: IXDAIConfiguration = {
  ...CommonsConfig,
  MarketId: 'XDAI Market',
  ProviderId: 4,    // Unknown?
  ReservesConfig: {
    DAI: strategyDAI,
    USDC: strategyUSDC,
    USDT: strategyUSDT,
    WBTC: strategyWBTC,
    WETH: strategyWETH,
    STAKE: strategySTAKE,
  },
  ReserveAssets: {
    [eXDaiNetwork.xdai]: {
      DAI: '0x44fA8E6f47987339850636F88629646662444217',
      USDC: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
      USDT: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
      WBTC: '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
      WETH: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
      STAKE: '0xb7D311E2Eb55F2f68a9440da38e7989210b9A05e'
    },
  },
};

export default XDAIConfig;
