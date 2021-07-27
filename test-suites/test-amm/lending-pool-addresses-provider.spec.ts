import { expect } from 'chai';
import { createRandomAddress } from '../../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../../helpers/types';
import { ethers } from 'ethers';
import { ZERO_ADDRESS } from '../../helpers/constants';
import { waitForTx } from '../../helpers/misc-utils';
import { deployLendingPool } from '../../helpers/contracts-deployments';

const { utils } = ethers;

makeSuite('LendingPoolAddressesProvider', (testEnv: TestEnv) => {
  it('Test the accessibility of the LendingPoolAddressesProvider', async () => {
    const { addressesProvider, users } = testEnv;
    const mockAddress = createRandomAddress();
    const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

    await addressesProvider.transferOwnership(users[1].address);

    for (const contractFunction of [
      addressesProvider.setMarketId,
      addressesProvider.setLendingPoolImpl,
      addressesProvider.setLendingPoolConfiguratorImpl,
      addressesProvider.setLendingPoolCollateralManager,
      addressesProvider.setPoolAdmin,
      addressesProvider.setPriceOracle,
      addressesProvider.setLendingRateOracle,
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

    const mockLendingPool = await deployLendingPool();
    const proxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_PROXIED'));

    const proxiedAddressSetReceipt = await waitForTx(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(proxiedAddressId, mockLendingPool.address)
    );

    if (!proxiedAddressSetReceipt.events || proxiedAddressSetReceipt.events?.length < 1) {
      throw new Error('INVALID_EVENT_EMMITED');
    }

    expect(proxiedAddressSetReceipt.events[0].event).to.be.equal('ProxyCreated');
    expect(proxiedAddressSetReceipt.events[1].event).to.be.equal('AddressSet');
    expect(proxiedAddressSetReceipt.events[1].args?.id).to.be.equal(proxiedAddressId);
    expect(proxiedAddressSetReceipt.events[1].args?.newAddress).to.be.equal(
      mockLendingPool.address
    );
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
});
