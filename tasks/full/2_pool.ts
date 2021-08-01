import { task } from 'hardhat/config';
import { getParamPerNetwork, insertContractAddressInDb } from '../../helpers/contracts-helpers';
import {
  deployATokensAndRatesHelper,
  deployPool,
  deployPoolConfigurator,
  deployStableAndVariableTokensHelper,
} from '../../helpers/contracts-deployments';
import { eContractid, eNetwork } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import {
  getPoolAddressesProvider,
  getPool,
  getPoolConfiguratorProxy,
} from '../../helpers/contracts-getters';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadPoolConfig, ConfigNames } from '../../helpers/configuration';

task('full:deploy-pool', 'Deploy pool for dev enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, DRE: HardhatRuntimeEnvironment) => {
    try {
      await DRE.run('set-DRE');
      const network = <eNetwork>DRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const addressesProvider = await getPoolAddressesProvider();

      const { Pool, PoolConfigurator } = poolConfig;

      // Reuse/deploy pool implementation
      let poolImplAddress = getParamPerNetwork(Pool, network);
      if (!notFalsyOrZeroAddress(poolImplAddress)) {
        console.log('\tDeploying new pool implementation & libraries...');
        const poolImpl = await deployPool(verify);
        poolImplAddress = poolImpl.address;
        await poolImpl.initialize(addressesProvider.address);
      }
      console.log('\tSetting pool implementation with address:', poolImplAddress);
      // Set pool impl to Address provider
      await waitForTx(await addressesProvider.setPoolImpl(poolImplAddress));

      const address = await addressesProvider.getPool();
      const poolProxy = await getPool(address);

      await insertContractAddressInDb(eContractid.Pool, poolProxy.address);

      // Reuse/deploy pool configurator
      let poolConfiguratorImplAddress = getParamPerNetwork(PoolConfigurator, network); //await deployPoolConfigurator(verify);
      if (!notFalsyOrZeroAddress(poolConfiguratorImplAddress)) {
        console.log('\tDeploying new configurator implementation...');
        const poolConfigurator = await deployPoolConfigurator(verify);
        poolConfiguratorImplAddress = poolConfigurator.address;
      }
      console.log(
        '\tSetting pool configurator implementation with address:',
        poolConfiguratorImplAddress
      );
      // Set pool conf impl to Address Provider
      await waitForTx(await addressesProvider.setPoolConfiguratorImpl(poolConfiguratorImplAddress));

      const poolConfiguratorProxy = await getPoolConfiguratorProxy(
        await addressesProvider.getPoolConfigurator()
      );

      await insertContractAddressInDb(eContractid.PoolConfigurator, poolConfiguratorProxy.address);
      // Deploy deployment helpers
      await deployStableAndVariableTokensHelper(
        [poolProxy.address, addressesProvider.address],
        verify
      );
      await deployATokensAndRatesHelper(
        [poolProxy.address, addressesProvider.address, poolConfiguratorProxy.address],
        verify
      );
    } catch (error) {
      if (DRE.network.name.includes('tenderly')) {
        const transactionLink = `https://dashboard.tenderly.co/${DRE.config.tenderly.username}/${
          DRE.config.tenderly.project
        }/fork/${DRE.tenderlyNetwork.getFork()}/simulation/${DRE.tenderlyNetwork.getHead()}`;
        console.error('Check tx error:', transactionLink);
      }
      throw error;
    }
  });
