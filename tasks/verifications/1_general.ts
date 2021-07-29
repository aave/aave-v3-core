import { error } from 'console';
import { zeroAddress } from 'ethereumjs-util';
import { task } from 'hardhat/config';
import {
  loadPoolConfig,
  ConfigNames,
  getWethAddress,
  getTreasuryAddress,
} from '../../helpers/configuration';
import { ZERO_ADDRESS } from '../../helpers/constants';
import {
  getAaveProtocolDataProvider,
  getAddressById,
  getPool,
  getPoolAddressesProvider,
  getPoolAddressesProviderRegistry,
  getLendingPoolCollateralManager,
  getLendingPoolCollateralManagerImpl,
  getPoolConfiguratorImpl,
  getPoolConfiguratorProxy,
  getPoolImpl,
  getProxy,
  getWalletProvider,
  getWETHGateway,
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
    const {
      ReserveAssets,
      ReservesConfig,
      ProviderRegistry,
      MarketId,
      LendingPoolCollateralManager,
      PoolConfigurator,
      Pool,
      WethGateway,
    } = poolConfig as ICommonConfiguration;
    const treasuryAddress = await getTreasuryAddress(poolConfig);

    const registryAddress = getParamPerNetwork(ProviderRegistry, network);
    const addressesProvider = await getPoolAddressesProvider();
    const addressesProviderRegistry = notFalsyOrZeroAddress(registryAddress)
      ? await getPoolAddressesProviderRegistry(registryAddress)
      : await getPoolAddressesProviderRegistry();
    const poolAddress = await addressesProvider.getLendingPool();
    const poolConfiguratorAddress = await addressesProvider.getLendingPoolConfigurator(); //getPoolConfiguratorProxy();
    const lendingPoolCollateralManagerAddress = await addressesProvider.getLendingPoolCollateralManager();

    const poolProxy = await getProxy(poolAddress);
    const poolConfiguratorProxy = await getProxy(poolConfiguratorAddress);
    const lendingPoolCollateralManagerProxy = await getProxy(lendingPoolCollateralManagerAddress);

    if (all) {
      const poolImplAddress = getParamPerNetwork(Pool, network);
      const poolImpl = notFalsyOrZeroAddress(poolImplAddress)
        ? await getPoolImpl(poolImplAddress)
        : await getPoolImpl();

      const poolConfiguratorImplAddress = getParamPerNetwork(
        PoolConfigurator,
        network
      );
      const poolConfiguratorImpl = notFalsyOrZeroAddress(poolConfiguratorImplAddress)
        ? await getPoolConfiguratorImpl(poolConfiguratorImplAddress)
        : await getPoolConfiguratorImpl();

      const lendingPoolCollateralManagerImplAddress = getParamPerNetwork(
        LendingPoolCollateralManager,
        network
      );
      const lendingPoolCollateralManagerImpl = notFalsyOrZeroAddress(
        lendingPoolCollateralManagerImplAddress
      )
        ? await getLendingPoolCollateralManagerImpl(lendingPoolCollateralManagerImplAddress)
        : await getLendingPoolCollateralManagerImpl();

      const dataProvider = await getAaveProtocolDataProvider();
      const walletProvider = await getWalletProvider();

      const wethGatewayAddress = getParamPerNetwork(WethGateway, network);
      const wethGateway = notFalsyOrZeroAddress(wethGatewayAddress)
        ? await getWETHGateway(wethGatewayAddress)
        : await getWETHGateway();

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

      // Lending Pool Collateral Manager implementation
      console.log('\n- Verifying Pool Collateral Manager Implementation...\n');
      await verifyContract(
        eContractid.LendingPoolCollateralManager,
        lendingPoolCollateralManagerImpl,
        []
      );

      // Test helpers
      console.log('\n- Verifying  Aave  Provider Helpers...\n');
      await verifyContract(eContractid.AaveProtocolDataProvider, dataProvider, [
        addressesProvider.address,
      ]);

      // Wallet balance provider
      console.log('\n- Verifying  Wallet Balance Provider...\n');
      await verifyContract(eContractid.WalletBalanceProvider, walletProvider, []);

      // WETHGateway
      console.log('\n- Verifying  WETHGateway...\n');
      await verifyContract(eContractid.WETHGateway, wethGateway, [
        await getWethAddress(poolConfig),
      ]);
    }
    // Pool proxy
    console.log('\n- Verifying Pool Proxy...\n');
    await verifyContract(eContractid.InitializableAdminUpgradeabilityProxy, poolProxy, [
      addressesProvider.address,
    ]);

    // Pool Conf proxy
    console.log('\n- Verifying Pool Configurator Proxy...\n');
    await verifyContract(
      eContractid.InitializableAdminUpgradeabilityProxy,
      poolConfiguratorProxy,
      [addressesProvider.address]
    );

    // Proxy collateral manager
    console.log('\n- Verifying  Lending Pool Collateral Manager Proxy...\n');
    await verifyContract(
      eContractid.InitializableAdminUpgradeabilityProxy,
      lendingPoolCollateralManagerProxy,
      []
    );

    console.log('Finished verifications.');
  });
