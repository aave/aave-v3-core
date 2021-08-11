import { task } from 'hardhat/config';
import {
  deployPoolAddressesProvider,
  deployPoolAddressesProviderRegistry,
} from '../../helpers/contracts-deployments';
import { getEthersSigners } from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import AaveConfig from '../../market-config';

task(
  'dev:deploy-address-provider',
  'Deploy address provider, registry and fee provider for dev enviroment'
).setAction(async (_, localBRE) => {
  await localBRE.run('set-DRE');

  const admin = await (await getEthersSigners())[0].getAddress();

  const addressesProvider = await deployPoolAddressesProvider(AaveConfig.MarketId);
  await waitForTx(await addressesProvider.setPoolAdmin(admin));
  await waitForTx(await addressesProvider.setEmergencyAdmin(admin));

  const addressesProviderRegistry = await deployPoolAddressesProviderRegistry();
  await waitForTx(
    await addressesProviderRegistry.registerAddressesProvider(addressesProvider.address, 1)
  );
});
