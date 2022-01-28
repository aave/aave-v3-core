import { expect } from 'chai';
import { BigNumber, Signer, utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  evmSnapshot,
  evmRevert,
  DefaultReserveInterestRateStrategy__factory,
  VariableDebtToken__factory,
} from '@aave/deploy-v3';
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  MockL2Pool__factory,
  MockL2Pool,
  L2Encoder,
  L2Encoder__factory,
} from '../types';
import { ethers, getChainId } from 'hardhat';
import { buildPermitParams, getSignatureFromTypedData } from '../helpers/contracts-helpers';
import { getTestWallets } from './helpers/utils/wallets';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { parseUnits } from 'ethers/lib/utils';

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

  let encoder: L2Encoder;

  before('Deploying L2Pool', async () => {
    const { addressesProvider, poolAdmin, pool, deployer } = testEnv;
    const { deployer: deployerName } = await hre.getNamedAccounts();

    encoder = await (await new L2Encoder__factory(deployer.signer).deploy(pool.address)).deployed();

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

  it('Supply test', async () => {
    const {
      dai,
      aDai,
      users: [user0],
    } = testEnv;

    const amount = utils.parseEther('100000');
    const referralCode = BigNumber.from(2);

    await dai.connect(user0.signer)['mint(uint256)'](amount);
    await dai.connect(user0.signer).approve(l2Pool.address, amount);

    const encoded = await encoder.encodeSupplyParams(dai.address, amount, referralCode);

    expect(await l2Pool.connect(user0.signer)['supply(bytes32)'](encoded))
      .to.emit(l2Pool, 'Supply')
      .withArgs(dai.address, user0.address, user0.address, amount, referralCode);

    const userBalance = await aDai.balanceOf(user0.address);
    expect(userBalance).to.be.eq(amount, 'invalid amount deposited');
  });

  it('Supply with permit test', async () => {
    const { deployer, dai, aDai } = testEnv;

    const chainId = Number(await getChainId());
    const nonce = await dai.nonces(deployer.address);
    const amount = utils.parseEther('10000');
    const highDeadline = '3000000000';
    const userPrivateKey = getTestWallets()[0].secretKey;

    const msgParams = buildPermitParams(
      chainId,
      dai.address,
      '1',
      await dai.symbol(),
      deployer.address,
      l2Pool.address,
      nonce.toNumber(),
      highDeadline,
      amount.toString()
    );
    const { v, r, s } = getSignatureFromTypedData(userPrivateKey, msgParams);

    await dai.connect(deployer.signer)['mint(uint256)'](amount);
    const referralCode = BigNumber.from(2);

    const encoded = await encoder.encodeSupplyWithPermitParams(
      dai.address,
      amount,
      referralCode,
      highDeadline,
      v,
      r,
      s
    );

    expect(
      await l2Pool
        .connect(deployer.signer)
        ['supplyWithPermit(bytes32,bytes32,bytes32)'](encoded[0], r, s)
    )
      .to.emit(l2Pool, 'Supply')
      .withArgs(dai.address, deployer.address, deployer.address, amount, referralCode);

    const userBalance = await aDai.balanceOf(deployer.address);
    expect(userBalance).to.be.eq(amount, 'invalid amount deposited');
  });

  it('Borrow', async () => {
    const {
      deployer,
      usdc,
      aUsdc,
      users: [, user1],
      helpersContract,
    } = testEnv;

    const borrowAmount = parseUnits('100', 6);
    const referralCode = BigNumber.from(16);

    expect(await usdc.balanceOf(deployer.address)).to.be.eq(0);

    await usdc.connect(user1.signer)['mint(uint256)'](borrowAmount.mul(10));
    await usdc.connect(user1.signer).approve(l2Pool.address, MAX_UINT_AMOUNT);
    await l2Pool
      .connect(user1.signer)
      ['supply(address,uint256,address,uint16)'](
        usdc.address,
        borrowAmount.mul(10),
        user1.address,
        referralCode
      );

    const encoded = await encoder.encodeBorrowParams(
      usdc.address,
      borrowAmount,
      RateMode.Variable,
      referralCode
    );

    const data = await l2Pool.getReserveData(usdc.address);
    const strat = await DefaultReserveInterestRateStrategy__factory.connect(
      data.interestRateStrategyAddress,
      deployer.signer
    );

    const { reserveFactor } = await helpersContract.getReserveConfigurationData(usdc.address);

    const [liqRate, sRate, varRate] = await strat.calculateInterestRates({
      unbacked: BigNumber.from(0),
      liquidityAdded: BigNumber.from(0),
      liquidityTaken: borrowAmount,
      totalStableDebt: BigNumber.from(0),
      totalVariableDebt: borrowAmount,
      averageStableBorrowRate: BigNumber.from(0),
      reserve: usdc.address,
      aToken: aUsdc.address,
      reserveFactor: reserveFactor,
    });

    expect(await l2Pool.connect(deployer.signer)['borrow(bytes32)'](encoded))
      .to.emit(l2Pool, 'Borrow')
      .withArgs(
        usdc.address,
        deployer.address,
        deployer.address,
        borrowAmount,
        Number(RateMode.Variable),
        varRate,
        referralCode
      );

    expect(await usdc.balanceOf(deployer.address)).to.be.eq(borrowAmount);
  });

  it('Repay some', async () => {
    const { deployer, usdc } = testEnv;

    await usdc.connect(deployer.signer).approve(l2Pool.address, MAX_UINT_AMOUNT);

    const data = await l2Pool.getReserveData(usdc.address);
    const vDebtToken = VariableDebtToken__factory.connect(
      data.variableDebtTokenAddress,
      deployer.signer
    );

    const debtBefore = await vDebtToken.balanceOf(deployer.address);
    const balanceBefore = await usdc.balanceOf(deployer.address);
    const repayAmount = parseUnits('50', 6);

    const encoded = await encoder.encodeRepayParams(usdc.address, repayAmount, RateMode.Variable);

    expect(await l2Pool.connect(deployer.signer)['repay(bytes32)'](encoded))
      .to.emit(l2Pool, 'Repay')
      .withArgs(usdc.address, deployer.address, deployer.address, repayAmount, false);

    const userDebt = await vDebtToken.balanceOf(deployer.address);
    expect(userDebt).to.be.eq(debtBefore.sub(repayAmount), 'invalid amount repaid');
    const userBalance = await usdc.balanceOf(deployer.address);
    expect(userBalance).to.be.eq(balanceBefore.sub(repayAmount), 'invalid amount repaid');
  });

  it('Repay remainder with permit', async () => {
    const { deployer, usdc } = testEnv;

    const data = await l2Pool.getReserveData(usdc.address);
    const vDebtToken = VariableDebtToken__factory.connect(
      data.variableDebtTokenAddress,
      deployer.signer
    );

    const debtBefore = await vDebtToken.balanceOf(deployer.address);

    const chainId = Number(await getChainId());
    const nonce = await usdc.nonces(deployer.address);
    const amount = MAX_UINT_AMOUNT;
    const highDeadline = '3000000000';
    const userPrivateKey = getTestWallets()[0].secretKey;

    const msgParams = buildPermitParams(
      chainId,
      usdc.address,
      '1',
      await usdc.symbol(),
      deployer.address,
      l2Pool.address,
      nonce.toNumber(),
      highDeadline,
      amount.toString()
    );
    const { v, r, s } = getSignatureFromTypedData(userPrivateKey, msgParams);

    await usdc.connect(deployer.signer)['mint(uint256)'](debtBefore.mul(10));
    await usdc.connect(deployer.signer).approve(l2Pool.address, MAX_UINT_AMOUNT);

    const encoded = await encoder.encodeRepayWithPermitParams(
      usdc.address,
      amount,
      RateMode.Variable,
      highDeadline,
      v,
      r,
      s
    );

    expect(
      await l2Pool
        .connect(deployer.signer)
        ['repayWithPermit(bytes32,bytes32,bytes32)'](encoded[0], r, s)
    )
      .to.emit(l2Pool, 'Repay')
      .withArgs(usdc.address, deployer.address, deployer.address, debtBefore, false);

    const userBalance = await vDebtToken.balanceOf(deployer.address);
    expect(userBalance).to.be.eq(0, 'invalid amount repaid');
  });

  it('Withdraw some', async () => {
    const {
      dai,
      aDai,
      users: [user0],
    } = testEnv;

    const amount = utils.parseEther('0.5');
    const encoded = await encoder.encodeWithdrawParams(dai.address, amount);
    const balanceBefore = await aDai.balanceOf(user0.address);

    expect(await l2Pool.connect(user0.signer)['withdraw(bytes32)'](encoded))
      .to.emit(l2Pool, 'Withdraw')
      .withArgs(dai.address, user0.address, user0.address, amount);

    const userBalance = await aDai.balanceOf(user0.address);
    expect(userBalance).to.be.eq(balanceBefore.sub(amount), 'invalid amount withdrawn');
  });

  it('Withdraw remainder', async () => {
    const {
      dai,
      aDai,
      users: [user0],
    } = testEnv;

    const amount = MAX_UINT_AMOUNT;
    const encoded = await encoder.encodeWithdrawParams(dai.address, amount);
    const balanceBefore = await aDai.balanceOf(user0.address);

    expect(await l2Pool.connect(user0.signer)['withdraw(bytes32)'](encoded))
      .to.emit(l2Pool, 'Withdraw')
      .withArgs(dai.address, user0.address, user0.address, balanceBefore);

    const userBalance = await aDai.balanceOf(user0.address);
    expect(userBalance).to.be.eq(0, 'invalid amount withdrawn');
  });
});
