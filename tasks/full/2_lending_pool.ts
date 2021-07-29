import { task } from 'hardhat/config';
import { getParamPerNetwork, insertContractAddressInDb } from '../../helpers/contracts-helpers';
import {
  deployATokensAndRatesHelper,
  deployLendingPool,
  deployPoolConfigurator,
  deployStableAndVariableTokensHelper,
} from '../../helpers/contracts-deployments';
import { eContractid, eNetwork } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import {
  getPoolAddressesProvider,
  getLendingPool,
  getPoolConfiguratorProxy,
} from '../../helpers/contracts-getters';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadPoolConfig, ConfigNames } from '../../helpers/configuration';

task('full:deploy-lending-pool', 'Deploy lending pool for dev enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, DRE: HardhatRuntimeEnvironment) => {
    try {
      await DRE.run('set-DRE');
      const network = <eNetwork>DRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const addressesProvider = await getPoolAddressesProvider();

      const { LendingPool, PoolConfigurator } = poolConfig;

      // Reuse/deploy lending pool implementation
      let lendingPoolImplAddress = getParamPerNetwork(LendingPool, network);
      if (!notFalsyOrZeroAddress(lendingPoolImplAddress)) {
        console.log('\tDeploying new lending pool implementation & libraries...');
        const lendingPoolImpl = await deployLendingPool(verify);
        lendingPoolImplAddress = lendingPoolImpl.address;
        await lendingPoolImpl.initialize(addressesProvider.address);
      }
      console.log('\tSetting lending pool implementation with address:', lendingPoolImplAddress);
      // Set lending pool impl to Address provider
      await waitForTx(await addressesProvider.setLendingPoolImpl(lendingPoolImplAddress));

      const address = await addressesProvider.getLendingPool();
      const lendingPoolProxy = await getLendingPool(address);

      await insertContractAddressInDb(eContractid.LendingPool, lendingPoolProxy.address);

      // Reuse/deploy lending pool configurator
      let poolConfiguratorImplAddress = getParamPerNetwork(PoolConfigurator, network); //await deployPoolConfigurator(verify);
      if (!notFalsyOrZeroAddress(poolConfiguratorImplAddress)) {
        console.log('\tDeploying new configurator implementation...');
        const poolConfigurator = await deployPoolConfigurator(verify);
        poolConfiguratorImplAddress = poolConfigurator.address;
      }
      console.log(
        '\tSetting lending pool configurator implementation with address:',
        poolConfiguratorImplAddress
      );
      // Set lending pool conf impl to Address Provider
      await waitForTx(
        await addressesProvider.setLendingPoolConfiguratorImpl(poolConfiguratorImplAddress)
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
