import { expect } from 'chai';
import { ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('AddressesProviderRegistry', (testEnv: TestEnv) => {
  const NEW_ADDRESSES_PROVIDER_ID = 2;

  const { PAPR_INVALID_ADDRESSES_PROVIDER_ID, PAPR_PROVIDER_NOT_REGISTERED } = ProtocolErrors;

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
    const { users, registry } = testEnv;

    await expect(registry.registerAddressesProvider(users[2].address, '0')).to.be.revertedWith(
      PAPR_INVALID_ADDRESSES_PROVIDER_ID
    );
  });

  it('Registers a new mock addresses provider', async () => {
    const { users, registry } = testEnv;

    // Simulating an addresses provider using the users[1] wallet address
    expect(await registry.registerAddressesProvider(users[1].address, NEW_ADDRESSES_PROVIDER_ID))
      .to.emit(registry, 'AddressesProviderRegistered')
      .withArgs(users[1].address);

    const providers = await registry.getAddressesProvidersList();

    expect(providers.length).to.be.equal(
      NEW_ADDRESSES_PROVIDER_ID,
      'Invalid length of the addresses providers list'
    );
    expect(providers[1].toString()).to.be.equal(
      users[1].address,
      'Invalid addresses provider added to the list'
    );
  });

  it('Removes the mock addresses provider', async () => {
    const { users, registry, addressesProvider } = testEnv;

    const id = await registry.getAddressesProviderIdByAddress(users[1].address);

    expect(id).to.be.equal(NEW_ADDRESSES_PROVIDER_ID, 'Invalid isRegistered return value');

    expect(await registry.unregisterAddressesProvider(users[1].address))
      .to.emit(registry, 'AddressesProviderUnregistered')
      .withArgs(users[1].address);

    const providers = await registry.getAddressesProvidersList();

    expect(providers.length).to.be.equal(2, 'Invalid length of the addresses providers list');
    expect(providers[0].toString()).to.be.equal(
      addressesProvider.address,
      'Invalid addresses provider added to the list'
    );
    expect(providers[1].toString()).to.be.equal(ZERO_ADDRESS, 'Invalid addresses');
  });

  it('Tries to remove a unregistered addressesProvider (revert expected)', async () => {
    const { users, registry } = testEnv;

    await expect(registry.unregisterAddressesProvider(users[2].address)).to.be.revertedWith(
      PAPR_PROVIDER_NOT_REGISTERED
    );
  });

  it('Tries to remove a unregistered addressesProvider (revert expected)', async () => {
    const { users, registry } = testEnv;

    await expect(registry.unregisterAddressesProvider(users[2].address)).to.be.revertedWith(
      PAPR_PROVIDER_NOT_REGISTERED
    );
  });

  it('Tries to add an already added addressesProvider with a different id. Should overwrite the previous id', async () => {
    const { registry, addressesProvider } = testEnv;

    const oldId = await registry.getAddressesProviderIdByAddress(addressesProvider.address);

    expect(
      await registry.registerAddressesProvider(addressesProvider.address, NEW_ADDRESSES_PROVIDER_ID)
    )
      .to.emit(registry, 'AddressesProviderRegistered')
      .withArgs(addressesProvider.address);

    const providers = await registry.getAddressesProvidersList();

    expect(await registry.getAddressesProviderIdByAddress(addressesProvider.address)).to.be.not.eq(
      oldId
    );

    expect(providers.length).to.be.equal(2, 'Invalid length of the addresses providers list');
    expect(providers[0].toString()).to.be.equal(
      addressesProvider.address,
      'Invalid addresses provider added to the list'
    );
    expect(providers[1].toString()).to.be.equal(ZERO_ADDRESS, 'Invalid addresses');
  });
});
