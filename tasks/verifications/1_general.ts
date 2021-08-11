import { task } from 'hardhat/config';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import {
  getAaveProtocolDataProvider,
  getPoolAddressesProvider,
  getPoolAddressesProviderRegistry,
  getPoolCollateralManagerImpl,
  getPoolConfiguratorImpl,
  getPoolImpl,
  getProxy,
} from '../../helpers/contracts-getters';
import { verifyContract, getParamPerNetwork } from '../../helpers/contracts-helpers';
import { notFalsyOrZeroAddress } from '../../helpers/misc-utils';
import { eContractid, eNetwork, ICommonConfiguration } from '../../helpers/types';

task('verify:general', 'Verify contracts at Etherscan')
  .addFlag('all', 'Verify all contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ all, pool }, localDRE) => {
    await localDRE.run('set-DRE');
    const network = localDRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);
    const { ProviderRegistry, MarketId, PoolCollateralManager, PoolConfigurator, Pool } =
      poolConfig as ICommonConfiguration;

    const registryAddress = getParamPerNetwork(ProviderRegistry, network);
    const addressesProvider = await getPoolAddressesProvider();
    const addressesProviderRegistry = notFalsyOrZeroAddress(registryAddress)
      ? await getPoolAddressesProviderRegistry(registryAddress)
      : await getPoolAddressesProviderRegistry();
    const poolAddress = await addressesProvider.getPool();
    const poolConfiguratorAddress = await addressesProvider.getPoolConfigurator(); //getPoolConfiguratorProxy();
    const poolCollateralManagerAddress = await addressesProvider.getPoolCollateralManager();

    const poolProxy = await getProxy(poolAddress);
    const poolConfiguratorProxy = await getProxy(poolConfiguratorAddress);
    const poolCollateralManagerProxy = await getProxy(poolCollateralManagerAddress);

    if (all) {
      const poolImplAddress = getParamPerNetwork(Pool, network);
      const poolImpl = notFalsyOrZeroAddress(poolImplAddress)
        ? await getPoolImpl(poolImplAddress)
        : await getPoolImpl();

      const poolConfiguratorImplAddress = getParamPerNetwork(PoolConfigurator, network);
      const poolConfiguratorImpl = notFalsyOrZeroAddress(poolConfiguratorImplAddress)
        ? await getPoolConfiguratorImpl(poolConfiguratorImplAddress)
        : await getPoolConfiguratorImpl();

      const poolCollateralManagerImplAddress = getParamPerNetwork(PoolCollateralManager, network);
      const poolCollateralManagerImpl = notFalsyOrZeroAddress(poolCollateralManagerImplAddress)
        ? await getPoolCollateralManagerImpl(poolCollateralManagerImplAddress)
        : await getPoolCollateralManagerImpl();

      const dataProvider = await getAaveProtocolDataProvider();

      // Address Provider
      console.log('\n- Verifying address provider...\n');
      await verifyContract(eContractid.PoolAddressesProvider, addressesProvider, [MarketId]);

      // Address Provider Registry
      console.log('\n- Verifying address provider registry...\n');
      await verifyContract(
        eContractid.PoolAddressesProviderRegistry,
        addressesProviderRegistry,
        []
      );

      // Pool implementation
      console.log('\n- Verifying Pool Implementation...\n');
      await verifyContract(eContractid.Pool, poolImpl, []);

      // Pool Configurator implementation
      console.log('\n- Verifying Pool Configurator Implementation...\n');
      await verifyContract(eContractid.PoolConfigurator, poolConfiguratorImpl, []);

      // Pool Collateral Manager implementation
      console.log('\n- Verifying Pool Collateral Manager Implementation...\n');
      await verifyContract(eContractid.PoolCollateralManager, poolCollateralManagerImpl, []);

      // Test helpers
      console.log('\n- Verifying Aave Provider Helpers...\n');
      await verifyContract(eContractid.AaveProtocolDataProvider, dataProvider, [
        addressesProvider.address,
      ]);
    }
    // Pool proxy
    console.log('\n- Verifying Pool Proxy...\n');
    await verifyContract(eContractid.InitializableAdminUpgradeabilityProxy, poolProxy, [
      addressesProvider.address,
    ]);

    // Pool Conf proxy
    console.log('\n- Verifying Pool Configurator Proxy...\n');
    await verifyContract(eContractid.InitializableAdminUpgradeabilityProxy, poolConfiguratorProxy, [
      addressesProvider.address,
    ]);

    // Proxy collateral manager
    console.log('\n- Verifying Pool Collateral Manager Proxy...\n');
    await verifyContract(
      eContractid.InitializableAdminUpgradeabilityProxy,
      poolCollateralManagerProxy,
      []
    );

    console.log('Finished verifications.');
  });
