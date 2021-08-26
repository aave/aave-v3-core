import { expect } from 'chai';
import { createRandomAddress, evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../helpers/types';
import { ethers } from 'ethers';
import { waitForTx } from '../helpers/misc-utils';
import { deployMockPool, deployPool } from '../helpers/contracts-deployments';
import { ZERO_ADDRESS } from '../helpers/constants';

const { utils } = ethers;

makeSuite('PoolAddressesProvider', (testEnv: TestEnv) => {
  it('Test the accessibility of the PoolAddressesProvider', async () => {
    const { addressesProvider, users } = testEnv;
    const mockAddress = createRandomAddress();
    const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

    await addressesProvider.transferOwnership(users[1].address);

    for (const contractFunction of [
      addressesProvider.setMarketId,
      addressesProvider.setPoolImpl,
      addressesProvider.setPoolConfiguratorImpl,
      addressesProvider.setPoolAdmin,
      addressesProvider.setPriceOracle,
      addressesProvider.setRateOracle,
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

  it('Tests adding  a proxied address with `setAddressAsProxy()`', async () => {
    const { addressesProvider, users } = testEnv;
    const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployPool();
    const proxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_PROXIED'));

    const proxiedAddressSetReceipt = await waitForTx(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(proxiedAddressId, mockPool.address)
    );

    if (!proxiedAddressSetReceipt.events || proxiedAddressSetReceipt.events?.length < 1) {
      throw new Error('INVALID_EVENT_EMMITED');
    }

    expect(proxiedAddressSetReceipt.events[0].event).to.be.equal('ProxyCreated');
    expect(proxiedAddressSetReceipt.events[1].event).to.be.equal('AddressSet');
    expect(proxiedAddressSetReceipt.events[1].args?.id).to.be.equal(proxiedAddressId);
    expect(proxiedAddressSetReceipt.events[1].args?.newAddress).to.be.equal(mockPool.address);
    expect(proxiedAddressSetReceipt.events[1].args?.hasProxy).to.be.equal(true);
  });

  it('Tests adding a non proxied address with `setAddress()`', async () => {
    const { addressesProvider, users } = testEnv;
    const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

    const currentAddressesProviderOwner = users[1];
    const mockNonProxiedAddress = createRandomAddress();
    const nonProxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_NON_PROXIED'));

    const nonProxiedAddressSetReceipt = await waitForTx(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(nonProxiedAddressId, mockNonProxiedAddress)
    );

    expect(mockNonProxiedAddress.toLowerCase()).to.be.equal(
      (await addressesProvider.getAddress(nonProxiedAddressId)).toLowerCase()
    );

    if (!nonProxiedAddressSetReceipt.events || nonProxiedAddressSetReceipt.events?.length < 1) {
      throw new Error('INVALID_EVENT_EMMITED');
    }

    expect(nonProxiedAddressSetReceipt.events[0].event).to.be.equal('AddressSet');
    expect(nonProxiedAddressSetReceipt.events[0].args?.id).to.be.equal(nonProxiedAddressId);
    expect(nonProxiedAddressSetReceipt.events[0].args?.newAddress).to.be.equal(
      mockNonProxiedAddress
    );
    expect(nonProxiedAddressSetReceipt.events[0].args?.hasProxy).to.be.equal(false);
  });

  it('Updates the implementation of a proxy which is already initialized', async () => {
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
    );

    // Pool address should not change
    expect(await addressesProvider.getPool()).to.be.eq(poolAddress);

    await evmRevert(snapId);
  });

  it('Proxy Admin updates the MarketId', async () => {
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
});
