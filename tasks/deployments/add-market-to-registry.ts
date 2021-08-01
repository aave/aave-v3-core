import { task } from 'hardhat/config';
import { getParamPerNetwork } from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { ConfigNames, loadPoolConfig } from '../../helpers/configuration';
import { eNetwork } from '../../helpers/types';
import {
  getFirstSigner,
  getPoolAddressesProvider,
  getPoolAddressesProviderRegistry,
} from '../../helpers/contracts-getters';
import { isAddress, parseEther } from 'ethers/lib/utils';
import { isZeroAddress } from 'ethereumjs-util';
import { Signer } from 'ethers';
import { exit } from 'process';

task('add-market-to-registry', 'Adds address provider to registry')
  .addParam('pool', `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addOptionalParam('addressesProvider', `Address of PoolAddressesProvider`)
  .addFlag('verify', 'Verify contracts at Etherscan')
  .addFlag('deployRegistry', 'Deploy a new address provider registry')
  .setAction(async ({ verify, addressesProvider, pool, deployRegistry }, DRE) => {
    await DRE.run('set-DRE');
    let signer: Signer;
    const network = <eNetwork>DRE.network.name;
    const poolConfig = loadPoolConfig(pool);
    const { ProviderId } = poolConfig;

    let providerRegistryAddress = getParamPerNetwork(poolConfig.ProviderRegistry, network);
    let providerRegistryOwner = getParamPerNetwork(poolConfig.ProviderRegistryOwner, network);
    const currentSignerAddress = await (
      await (await getFirstSigner()).getAddress()
    ).toLocaleLowerCase();
    let deployed = false;

    if (
      deployRegistry ||
      !providerRegistryAddress ||
      !isAddress(providerRegistryAddress) ||
      isZeroAddress(providerRegistryAddress)
    ) {
      console.log('- Deploying a new Address Providers Registry:');

      await DRE.run('full:deploy-address-provider-registry', { verify });

      providerRegistryAddress = (await getPoolAddressesProviderRegistry()).address;
      providerRegistryOwner = await (await getFirstSigner()).getAddress();
      deployed = true;
    }

    if (
      !providerRegistryOwner ||
      !isAddress(providerRegistryOwner) ||
      isZeroAddress(providerRegistryOwner)
    ) {
      throw Error('config.ProviderRegistryOwner is missing or is not an address.');
    }

    // Checks if deployer address is registry owner
    if (process.env.FORK) {
      await DRE.network.provider.request({
        method: 'hardhat_impersonateAccount',
        params: [providerRegistryOwner],
      });
      signer = DRE.ethers.provider.getSigner(providerRegistryOwner);
      const firstAccount = await getFirstSigner();
      await firstAccount.sendTransaction({ value: parseEther('10'), to: providerRegistryOwner });
    } else if (
      !deployed &&
      providerRegistryOwner.toLocaleLowerCase() !== currentSignerAddress.toLocaleLowerCase()
    ) {
      console.error('ProviderRegistryOwner config does not match current signer:');
      console.error('Expected:', providerRegistryOwner);
      console.error('Current:', currentSignerAddress);
      exit(2);
    } else {
      signer = DRE.ethers.provider.getSigner(providerRegistryOwner);
    }

    // 1. Address Provider Registry instance
    const addressesProviderRegistry = (
      await getPoolAddressesProviderRegistry(providerRegistryAddress)
    ).connect(signer);

    const addressesProviderInstance = await getPoolAddressesProvider(addressesProvider);

    // 2. Set the provider at the Registry
    await waitForTx(
      await addressesProviderRegistry.registerAddressesProvider(
        addressesProviderInstance.address,
        ProviderId
      )
    );
    console.log(
      `Added PoolAddressesProvider with address "${addressesProviderInstance.address}" to registry located at ${addressesProviderRegistry.address}`
    );
  });
