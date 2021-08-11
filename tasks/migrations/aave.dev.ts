import { task } from 'hardhat/config';
import { checkVerification } from '../../helpers/etherscan-verification';
import { ConfigNames } from '../../helpers/configuration';
import { printContracts } from '../../helpers/misc-utils';

task('aave:dev', 'Deploy development enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localHRE) => {
    const POOL_NAME = ConfigNames.Aave;

    await localHRE.run('set-DRE');

    // Prevent loss of gas verifying all the needed ENVs for Etherscan verification
    if (verify) {
      checkVerification();
    }

    console.log('Migration started\n');

    console.log('1. Deploy mock tokens');
    await localHRE.run('dev:deploy-mock-tokens', { verify });

    console.log('2. Deploy address provider');
    await localHRE.run('dev:deploy-address-provider', { verify });

    console.log('3. Deploy pool');
    await localHRE.run('dev:deploy-pool', { verify });

    console.log('4. Deploy oracles');
    await localHRE.run('dev:deploy-oracles', { verify, pool: POOL_NAME });

    // console.log('5. Deploy WETH Gateway');
    // await localHRE.run('full-deploy-weth-gateway', { verify, pool: POOL_NAME });

    console.log('6. Initialize pool');
    await localHRE.run('dev:initialize-pool', { verify, pool: POOL_NAME });

    console.log('\nFinished migration');
    printContracts();
  });
