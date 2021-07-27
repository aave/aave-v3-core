import 'hardhat/types/config';
import 'hardhat/types/runtime';

import { TenderlyConfig } from './types';
declare module 'hardhat/types/config' {
  export interface HardhatUserConfig {
    tenderly?: TenderlyConfig;
  }

  export interface HardhatConfig {
    tenderly: TenderlyConfig;
  }
}
