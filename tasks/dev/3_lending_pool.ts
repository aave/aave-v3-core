import { task } from 'hardhat/config';
import {
  deployATokensAndRatesHelper,
  deployLendingPool,
  deployPoolConfigurator,
  deployStableAndVariableTokensHelper,
} from '../../helpers/contracts-deployments';
import { eContractid } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import {
  getPoolAddressesProvider,
  getLendingPool,
  getPoolConfiguratorProxy,
} from '../../helpers/contracts-getters';
import { insertContractAddressInDb } from '../../helpers/contracts-helpers';

task('dev:deploy-pool', 'Deploy pool for dev enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-DRE');

    const addressesProvider = await getPoolAddressesProvider();

    const poolImpl = await deployLendingPool(verify);

    // Set pool impl to Address Provider
    await waitForTx(await addressesProvider.setLendingPoolImpl(poolImpl.address));

    const address = await addressesProvider.getLendingPool();
    const poolProxy = await getLendingPool(address);

    await insertContractAddressInDb(eContractid.Pool, poolProxy.address);

    const poolConfiguratorImpl = await deployPoolConfigurator(verify);

    // Set pool conf impl to Address Provider
    await waitForTx(
      await addressesProvider.setLendingPoolConfiguratorImpl(poolConfiguratorImpl.address)
    );

    const poolConfiguratorProxy = await getPoolConfiguratorProxy(
      await addressesProvider.getLendingPoolConfigurator()
    );
    await insertContractAddressInDb(
      eContractid.PoolConfigurator,
      poolConfiguratorProxy.address
    );

    // Deploy deployment helpers
    await deployStableAndVariableTokensHelper(
      [poolProxy.address, addressesProvider.address],
      verify
    );
    await deployATokensAndRatesHelper(
      [poolProxy.address, addressesProvider.address, lendingPoolConfiguratorProxy.address],
      verify
    );
  });
