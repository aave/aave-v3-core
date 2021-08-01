import { task } from 'hardhat/config';
import { deployAaveProtocolDataProvider } from '../../helpers/contracts-deployments';
import { exit } from 'process';
import { getPoolAddressesProvider } from '../../helpers/contracts-getters';

task('full:data-provider', 'Initialize pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    try {
      await localBRE.run('set-DRE');

      const addressesProvider = await getPoolAddressesProvider();

      await deployAaveProtocolDataProvider(addressesProvider.address, verify);
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
