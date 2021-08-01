import { task } from 'hardhat/config';
import { deployWalletBalancerProvider } from '../../helpers/contracts-deployments';

import { getPoolAddressesProvider } from '../../helpers/contracts-getters';

task('dev:wallet-balance-provider', 'Initialize pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-DRE');

    await deployWalletBalancerProvider(verify);
  });
