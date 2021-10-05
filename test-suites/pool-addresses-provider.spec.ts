import { expect } from 'chai';
import { utils } from 'ethers';
import { createRandomAddress, evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { ProtocolErrors } from '../helpers/types';
import { deployMockPool, deployPool } from '../helpers/contracts-deployments';
import { ZERO_ADDRESS } from '../helpers/constants';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('PoolAddressesProvider', (testEnv: TestEnv) => {
  const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

  it('Test the onlyOwner accessibility of the PoolAddressesProvider', async () => {
    const { addressesProvider, users } = testEnv;
    const mockAddress = createRandomAddress();

    // Transfer ownership to user 1
    await addressesProvider.transferOwnership(users[1].address);

    // Test accessibility with user 0
    for (const contractFunction of [
      addressesProvider.setMarketId,
      addressesProvider.setPoolImpl,
      addressesProvider.setPoolConfiguratorImpl,
      addressesProvider.setPriceOracle,
      addressesProvider.setACLAdmin,
      addressesProvider.setPriceOracleSentinel,
      addressesProvider.setPoolDataProvider,
    ]) {
      await expect(contractFunction(mockAddress)).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);
    }

    await expect(
      addressesProvider.setAddress(utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')), mockAddress)
    ).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);

    await expect(
      addressesProvider.setAddressAsProxy(
        utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')),
        mockAddress
      )
    ).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);
  });

  it('Owner adds a new address as proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployPool();
    const proxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_PROXIED'));

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(proxiedAddressId, mockPool.address)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(proxiedAddressId, mockPool.address, true)
      .to.emit(addressesProvider, 'ProxyCreated');
  });

  it('Owner adds a new address with no proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];
    const mockNonProxiedAddress = createRandomAddress();
    const nonProxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_NON_PROXIED'));

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(nonProxiedAddressId, mockNonProxiedAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(nonProxiedAddressId, mockNonProxiedAddress, false);

    expect((await addressesProvider.getAddress(nonProxiedAddressId)).toLowerCase()).to.be.eq(
      mockNonProxiedAddress.toLowerCase()
    );
  });

  it('Owner updates the implementation of a proxy which is already initialized', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployMockPool();

    // Pool has already a proxy
    const poolAddress = await addressesProvider.getPool();
    expect(poolAddress).to.be.not.eq(ZERO_ADDRESS);

    // Update the Pool proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPoolImpl(mockPool.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(mockPool.address);

    // Pool address should not change
    expect(await addressesProvider.getPool()).to.be.eq(poolAddress);

    await evmRevert(snapId);
  });

  it('Owner updates the MarketId', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const NEW_MARKET_ID = 'NEW_MARKET';

    // Current MarketId
    const oldMarketId = await addressesProvider.getMarketId();

    // Update the MarketId
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setMarketId(NEW_MARKET_ID)
    )
      .to.emit(addressesProvider, 'MarketIdSet')
      .withArgs(NEW_MARKET_ID);

    expect(await addressesProvider.getMarketId()).to.be.not.eq(oldMarketId);
    expect(await addressesProvider.getMarketId()).to.be.eq(NEW_MARKET_ID);

    await evmRevert(snapId);
  });

  it('Owner updates the data provider', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, helpersContract, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    expect(await addressesProvider.getPoolDataProvider(), helpersContract.address);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPoolDataProvider(ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'PoolDataProviderUpdated')
      .withArgs(ZERO_ADDRESS);

    expect(await addressesProvider.getPoolDataProvider()).to.be.not.eq(helpersContract.address);
    expect(await addressesProvider.getPoolDataProvider()).to.be.eq(ZERO_ADDRESS);

    await evmRevert(snapId);
  });
});
