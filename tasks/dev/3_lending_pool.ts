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

task('dev:deploy-lending-pool', 'Deploy lending pool for dev enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-DRE');

    const addressesProvider = await getPoolAddressesProvider();

    const lendingPoolImpl = await deployLendingPool(verify);

    // Set lending pool impl to Address Provider
    await waitForTx(await addressesProvider.setLendingPoolImpl(lendingPoolImpl.address));

    const address = await addressesProvider.getLendingPool();
    const lendingPoolProxy = await getLendingPool(address);

    await insertContractAddressInDb(eContractid.LendingPool, lendingPoolProxy.address);

    const poolConfiguratorImpl = await deployPoolConfigurator(verify);

    // Set lending pool conf impl to Address Provider
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
      [lendingPoolProxy.address, addressesProvider.address],
      verify
    );
    await deployATokensAndRatesHelper(
      [lendingPoolProxy.address, addressesProvider.address, poolConfiguratorProxy.address],
      verify
    );
  });
