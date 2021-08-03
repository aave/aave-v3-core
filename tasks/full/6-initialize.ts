import { task } from 'hardhat/config';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import { deployPoolCollateralManager } from '../../helpers/contracts-deployments';
import { loadPoolConfig, ConfigNames, getTreasuryAddress } from '../../helpers/configuration';
import { eNetwork, ICommonConfiguration } from '../../helpers/types';
import { notFalsyOrZeroAddress, waitForTx } from '../../helpers/misc-utils';
import { initReservesByHelper, configureReservesByHelper } from '../../helpers/init-helpers';
import { exit } from 'process';
import {
  getAaveProtocolDataProvider,
  getPoolAddressesProvider,
} from '../../helpers/contracts-getters';

task('full:initialize-pool', 'Initialize pool configuration.')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    try {
      await localBRE.run('set-DRE');
      const network = <eNetwork>localBRE.network.name;
      const poolConfig = loadPoolConfig(pool);
      const {
        ATokenNamePrefix,
        StableDebtTokenNamePrefix,
        VariableDebtTokenNamePrefix,
        SymbolPrefix,
        ReserveAssets,
        ReservesConfig,
        PoolCollateralManager,
        IncentivesController,
      } = poolConfig as ICommonConfiguration;

      const reserveAssets = await getParamPerNetwork(ReserveAssets, network);
      const incentivesController = await getParamPerNetwork(IncentivesController, network);
      const addressesProvider = await getPoolAddressesProvider();

      const testHelpers = await getAaveProtocolDataProvider();

      const admin = await addressesProvider.getPoolAdmin();
      if (!reserveAssets) {
        throw 'Reserve assets is undefined. Check ReserveAssets configuration at config directory';
      }

      const treasuryAddress = await getTreasuryAddress(poolConfig);

      await initReservesByHelper(
        ReservesConfig,
        reserveAssets,
        ATokenNamePrefix,
        StableDebtTokenNamePrefix,
        VariableDebtTokenNamePrefix,
        SymbolPrefix,
        admin,
        treasuryAddress,
        incentivesController,
        verify
      );
      await configureReservesByHelper(ReservesConfig, reserveAssets, testHelpers, admin);

      let collateralManagerAddress = await getParamPerNetwork(PoolCollateralManager, network);
      if (!notFalsyOrZeroAddress(collateralManagerAddress)) {
        const collateralManager = await deployPoolCollateralManager(verify);
        collateralManagerAddress = collateralManager.address;
      }
      // Seems unnecessary to register the collateral manager in the JSON db

      console.log(
        '\tSetting pool collateral manager implementation with address',
        collateralManagerAddress
      );
      await waitForTx(await addressesProvider.setPoolCollateralManager(collateralManagerAddress));

      console.log(
        '\tSetting AaveProtocolDataProvider at AddressesProvider at id: 0x01',
        collateralManagerAddress
      );
      const aaveProtocolDataProvider = await getAaveProtocolDataProvider();
      await waitForTx(
        await addressesProvider.setAddress(
          '0x0100000000000000000000000000000000000000000000000000000000000000',
          aaveProtocolDataProvider.address
        )
      );
    } catch (err) {
      console.error(err);
      exit(1);
    }
  });
