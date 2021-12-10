import { expect } from 'chai';
import { ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';
import { ONE_ADDRESS } from '@aave/deploy-v3';

makeSuite('AddressesProviderRegistry', (testEnv: TestEnv) => {
  const NEW_ADDRESES_PROVIDER_ADDRESS = ONE_ADDRESS;
  const NEW_ADDRESSES_PROVIDER_ID = 2;

  it('Checks the addresses provider is added to the registry', async () => {
    const { addressesProvider, registry } = testEnv;

    const providers = await registry.getAddressesProvidersList();

    expect(providers.length).to.be.equal(1, 'Invalid length of the addresses providers list');
    expect(providers[0].toString()).to.be.equal(
      addressesProvider.address,
      'Invalid addresses provider added to the list'
    );
  });

  it('Tries to register an addresses provider with id 0 (revert expected)', async () => {
    const { registry } = testEnv;
    const { PAPR_INVALID_ADDRESSES_PROVIDER_ID } = ProtocolErrors;

    await expect(
      registry.registerAddressesProvider(NEW_ADDRESES_PROVIDER_ADDRESS, '0')
    ).to.be.revertedWith(PAPR_INVALID_ADDRESSES_PROVIDER_ID);
  });

  it('Registers a new mock addresses provider', async () => {
    const { registry } = testEnv;

    const providersBefore = await registry.getAddressesProvidersList();

    expect(
      await registry.registerAddressesProvider(
        NEW_ADDRESES_PROVIDER_ADDRESS,
        NEW_ADDRESSES_PROVIDER_ID
      )
    )
      .to.emit(registry, 'AddressesProviderRegistered')
      .withArgs(NEW_ADDRESES_PROVIDER_ADDRESS);

    expect(await registry.getAddressesProviderIdByAddress(NEW_ADDRESES_PROVIDER_ADDRESS)).to.be.eq(
      NEW_ADDRESSES_PROVIDER_ID
    );

    const providersAfter = await registry.getAddressesProvidersList();
    expect(providersAfter.length).to.be.equal(
      providersBefore.length + 1,
      'Invalid length of the addresses providers list'
    );
    expect(providersAfter[1].toString()).to.be.equal(
      NEW_ADDRESES_PROVIDER_ADDRESS,
      'Invalid addresses provider added to the list'
    );
  });

  it('Removes the mock addresses provider', async () => {
    const { users, registry, addressesProvider } = testEnv;

    const providersBefore = await registry.getAddressesProvidersList();

    expect(
      await registry.getAddressesProviderIdByAddress(NEW_ADDRESES_PROVIDER_ADDRESS)
    ).to.be.equal(NEW_ADDRESSES_PROVIDER_ID);

    expect(await registry.unregisterAddressesProvider(NEW_ADDRESES_PROVIDER_ADDRESS))
      .to.emit(registry, 'AddressesProviderUnregistered')
      .withArgs(NEW_ADDRESES_PROVIDER_ADDRESS);

    const providersAfter = await registry.getAddressesProvidersList();

    expect(providersAfter.length).to.be.equal(
      providersBefore.length - 1,
      'Invalid length of the addresses providers list'
    );
    expect(providersAfter[0].toString()).to.be.equal(
      addressesProvider.address,
      'Invalid addresses provider added to the list'
    );
  });

  it('Tries to remove an unregistered addressesProvider (revert expected)', async () => {
    const { PAPR_PROVIDER_NOT_REGISTERED } = ProtocolErrors;

    const { users, registry } = testEnv;

    await expect(registry.unregisterAddressesProvider(users[2].address)).to.be.revertedWith(
      PAPR_PROVIDER_NOT_REGISTERED
    );
  });

  it('Add an already added addressesProvider with a different id, overwriting the previous id', async () => {
    const { registry, addressesProvider } = testEnv;

    const oldId = await registry.getAddressesProviderIdByAddress(addressesProvider.address);

    const providersBefore = await registry.getAddressesProvidersList();
    expect(
      await registry.registerAddressesProvider(addressesProvider.address, NEW_ADDRESSES_PROVIDER_ID)
    )
      .to.emit(registry, 'AddressesProviderRegistered')
      .withArgs(addressesProvider.address);

    const providersAfter = await registry.getAddressesProvidersList();

    expect(await registry.getAddressesProviderIdByAddress(addressesProvider.address)).to.be.not.eq(
      oldId
    );

    expect(providersAfter.length).to.be.equal(
      providersBefore.length,
      'Invalid length of the addresses providers list'
    );
    expect(providersAfter[0].toString()).to.be.equal(
      addressesProvider.address,
      'Invalid addresses provider added to the list'
    );
  });
});
