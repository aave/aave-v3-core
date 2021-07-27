import { task } from 'hardhat/config';
import { ConfigNames, loadPoolConfig } from '../../helpers/configuration';
import {
  getAaveProtocolDataProvider,
  getLendingPoolAddressesProvider,
  getLendingPoolAddressesProviderRegistry,
} from '../../helpers/contracts-getters';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import { DRE } from '../../helpers/misc-utils';
import { eEthereumNetwork, eNetwork, ePolygonNetwork, eXDaiNetwork } from '../../helpers/types';

task('print-config', 'Inits the DRE, to have access to all the plugins')
  .addParam('dataProvider', 'Address of AaveProtocolDataProvider')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ pool, dataProvider }, localBRE) => {
    await localBRE.run('set-DRE');
    const network = process.env.FORK
      ? (process.env.FORK as eNetwork)
      : (localBRE.network.name as eNetwork);
    console.log(network);
    const poolConfig = loadPoolConfig(pool);

    const providerRegistryAddress = getParamPerNetwork(poolConfig.ProviderRegistry, network);

    const providerRegistry = await getLendingPoolAddressesProviderRegistry(providerRegistryAddress);

    const providers = await providerRegistry.getAddressesProvidersList();

    const addressesProvider = await getLendingPoolAddressesProvider(providers[0]); // Checks first provider

    console.log('Addresses Providers', providers.join(', '));
    console.log('Market Id: ', await addressesProvider.getMarketId());
    console.log('LendingPool Proxy:', await addressesProvider.getLendingPool());
    console.log(
      'Lending Pool Collateral Manager',
      await addressesProvider.getLendingPoolCollateralManager()
    );
    console.log(
      'Lending Pool Configurator proxy',
      await addressesProvider.getLendingPoolConfigurator()
    );
    console.log('Pool admin', await addressesProvider.getPoolAdmin());
    console.log('Emergency admin', await addressesProvider.getEmergencyAdmin());
    console.log('Price Oracle', await addressesProvider.getPriceOracle());
    console.log('Lending Rate Oracle', await addressesProvider.getLendingRateOracle());
    console.log('Lending Pool Data Provider', dataProvider);
    const protocolDataProvider = await getAaveProtocolDataProvider(dataProvider);

    const fields = [
      'decimals',
      'ltv',
      'liquidationThreshold',
      'liquidationBonus',
      'reserveFactor',
      'usageAsCollateralEnabled',
      'borrowingEnabled',
      'stableBorrowRateEnabled',
      'isActive',
      'isFrozen',
    ];
    const tokensFields = ['aToken', 'stableDebtToken', 'variableDebtToken'];
    for (const [symbol, address] of Object.entries(
      getParamPerNetwork(poolConfig.ReserveAssets, network as eNetwork)
    )) {
      console.log(`- ${symbol} asset config`);
      console.log(`  - reserve address: ${address}`);

      const reserveData = await protocolDataProvider.getReserveConfigurationData(address);
      const tokensAddresses = await protocolDataProvider.getReserveTokensAddresses(address);
      fields.forEach((field, index) => {
        console.log(`  - ${field}:`, reserveData[field].toString());
      });
      tokensFields.forEach((field, index) => {
        console.log(`  - ${field}:`, tokensAddresses[index]);
      });
    }
  });
