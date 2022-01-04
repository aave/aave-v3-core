import { expect } from 'chai';
import { ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('AddressesProviderRegistry', (testEnv: TestEnv) => {
  const NEW_ADDRESSES_PROVIDER_ID = 2;

  const { INVALID_ADDRESSES_PROVIDER_ID, PROVIDER_NOT_REGISTERED } = ProtocolErrors;

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
      INVALID_ADDRESSES_PROVIDER_ID
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
    expect(await registry.getAddressesProviderAddressById(NEW_ADDRESSES_PROVIDER_ID)).to.be.equal(
      users[1].address,
      'Invalid update of id mapping'
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
    expect(await registry.getAddressesProviderAddressById(NEW_ADDRESSES_PROVIDER_ID)).to.be.equal(
      ZERO_ADDRESS,
      'Invalid update of id mapping'
    );
  });

  it('Tries to remove a unregistered addressesProvider (revert expected)', async () => {
    const { users, registry } = testEnv;

    await expect(registry.unregisterAddressesProvider(users[2].address)).to.be.revertedWith(
      PROVIDER_NOT_REGISTERED
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

  it('Tries to add an addressesProvider with an already used id (revert expected)', async () => {
    const { users, registry } = testEnv;

    // Simulating an addresses provider using the users[2] wallet address
    await expect(
      registry.registerAddressesProvider(users[2].address, NEW_ADDRESSES_PROVIDER_ID)
    ).to.be.revertedWith(ProtocolErrors.INVALID_ADDRESSES_PROVIDER_ID);

    const providers = await registry.getAddressesProvidersList();
    const idMap = {};

    for (let i = 0; i < providers.length; i++) {
      const id = (await registry.getAddressesProviderIdByAddress(providers[i])).toNumber();
      if (id > 0) {
        if (idMap[id] == undefined) {
          idMap[id] = true;
        } else {
          expect(false, 'Duplicate ids').to.be.true;
        }
      }
    }
  });
});
