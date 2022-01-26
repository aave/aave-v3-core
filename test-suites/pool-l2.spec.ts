import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { ProtocolErrors } from '../helpers/types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { evmSnapshot, evmRevert } from '@aave/deploy-v3';
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  MockL2Pool__factory,
  MockL2Pool,
} from '../types';
import { getChainId } from 'hardhat';
import { buildPermitParams, getSignatureFromTypedData } from '../helpers/contracts-helpers';
import { getTestWallets } from './helpers/utils/wallets';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool: L2 functions', (testEnv: TestEnv) => {
  const {
    NO_MORE_RESERVES_ALLOWED,
    CALLER_NOT_ATOKEN,
    NOT_CONTRACT,
    CALLER_NOT_POOL_CONFIGURATOR,
    RESERVE_ALREADY_INITIALIZED,
    INVALID_ADDRESSES_PROVIDER,
    RESERVE_ALREADY_ADDED,
    DEBT_CEILING_NOT_ZERO,
    ASSET_NOT_LISTED,
    ZERO_ADDRESS_NOT_VALID,
  } = ProtocolErrors;

  let l2Pool: MockL2Pool;

  const POOL_ID = utils.formatBytes32String('POOL');

  let snap: string;

  before('Deploying L2Pool', async () => {
    const { addressesProvider, poolAdmin } = testEnv;
    const { deployer: deployerName } = await hre.getNamedAccounts();

    // Deploy the mock Pool with a `dropReserve` skipping the checks
    const L2POOL_IMPL_ARTIFACT = await hre.deployments.deploy('MockL2Pool', {
      contract: 'MockL2Pool',
      from: deployerName,
      args: [addressesProvider.address],
      libraries: {
        SupplyLogic: (await hre.deployments.get('SupplyLogic')).address,
        BorrowLogic: (await hre.deployments.get('BorrowLogic')).address,
        LiquidationLogic: (await hre.deployments.get('LiquidationLogic')).address,
        EModeLogic: (await hre.deployments.get('EModeLogic')).address,
        BridgeLogic: (await hre.deployments.get('BridgeLogic')).address,
        FlashLoanLogic: (await hre.deployments.get('FlashLoanLogic')).address,
        PoolLogic: (await hre.deployments.get('PoolLogic')).address,
      },
      log: false,
    });

    // Impersonate PoolAddressesProvider
    await impersonateAccountsHardhat([addressesProvider.address]);
    const addressesProviderSigner = await hre.ethers.getSigner(addressesProvider.address);

    const poolProxyAddress = await addressesProvider.getPool();
    const poolProxy = (await hre.ethers.getContractAt(
      'InitializableImmutableAdminUpgradeabilityProxy',
      poolProxyAddress,
      addressesProviderSigner
    )) as InitializableImmutableAdminUpgradeabilityProxy;

    const oldPoolImpl = await poolProxy.callStatic.implementation();

    // Upgrade the Pool
    expect(
      await addressesProvider.connect(poolAdmin.signer).setPoolImpl(L2POOL_IMPL_ARTIFACT.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(oldPoolImpl, L2POOL_IMPL_ARTIFACT.address);

    // Get the Pool instance
    const poolAddress = await addressesProvider.getPool();
    l2Pool = await MockL2Pool__factory.connect(poolAddress, await getFirstSigner());
  });

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('Supply test', async () => {
    const {
      dai,
      aDai,
      users: [user0],
    } = testEnv;

    const amount = utils.parseEther('1');

    await dai.connect(user0.signer)['mint(uint256)'](amount);

    await dai.connect(user0.signer).approve(l2Pool.address, amount);

    const reserveId = (await l2Pool.getReserveData(dai.address)).id;

    let calldata =
      '0x' +
      (
        reserveId.toString(16).padStart(4, '0') +
        amount.toHexString().slice(2).padStart(32, '0') +
        '0000' // referral code
      ).padStart(64, '0');

    await l2Pool.connect(user0.signer)['supply(bytes32)'](calldata);

    const userBalance = await aDai.balanceOf(user0.address);
    expect(userBalance).to.be.eq(amount, 'invalid amount deposited');
  });

  it('Supply with permit test', async () => {
    const {
      dai,
      aDai,
      users: [, user1],
    } = testEnv;

    const chainId = Number(await getChainId());
    const nonce = await dai.nonces(user1.address);
    const amount = utils.parseEther('1');
    const highDeadline = '3000000000';
    const userPrivateKey = getTestWallets()[0].secretKey;

    const msgParams = buildPermitParams(
      chainId,
      dai.address,
      '1',
      await dai.symbol(),
      user1.address,
      l2Pool.address,
      nonce.toNumber(),
      highDeadline,
      amount.toString()
    );
    const { v, r, s } = getSignatureFromTypedData(userPrivateKey, msgParams);

    await dai.connect(user1.signer)['mint(uint256)'](amount);

    const reserveId = (await l2Pool.getReserveData(dai.address)).id;

    let calldata =
      '0x' +
      (
        reserveId.toString(16).padStart(4, '0') +
        amount.toHexString().slice(2).padStart(32, '0') +
        '0000' + // referral code
        v.toString(16) +
        BigNumber.from(highDeadline).toHexString().slice(2).padStart(8, '0')
      ).padStart(64, '0');

    console.log(v);
    console.log(BigNumber.from(highDeadline).toHexString());
    console.log(calldata);

    await l2Pool.connect(user1.signer)['supplyWithPermit(bytes32,bytes32,bytes32)'](calldata, r, s);

    const userBalance = await aDai.balanceOf(user1.address);
    expect(userBalance).to.be.eq(amount, 'invalid amount deposited');
  });
});
