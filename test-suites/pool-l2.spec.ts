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
  increaseTime,
  AaveDistributionManager,
} from '@aave/deploy-v3';
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  MockL2Pool__factory,
  MockL2Pool,
  L2Encoder,
  L2Encoder__factory,
} from '../types';
import { ethers, getChainId } from 'hardhat';
import {
  buildPermitParams,
  getProxyImplementation,
  getSignatureFromTypedData,
} from '../helpers/contracts-helpers';
import { getTestWallets } from './helpers/utils/wallets';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { parseUnits } from 'ethers/lib/utils';
import { getReserveData, getUserData } from './helpers/utils/helpers';
import { calcExpectedStableDebtTokenBalance } from './helpers/utils/calculations';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool: L2 functions', (testEnv: TestEnv) => {
  const {
    INVALID_HF,
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
    const { addressesProvider, poolAdmin, pool, deployer, oracle } = testEnv;
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

    const poolProxyAddress = await addressesProvider.getPool();
    const oldPoolImpl = await getProxyImplementation(addressesProvider.address, poolProxyAddress);

    // Upgrade the Pool
    expect(
      await addressesProvider.connect(poolAdmin.signer).setPoolImpl(L2POOL_IMPL_ARTIFACT.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(oldPoolImpl, L2POOL_IMPL_ARTIFACT.address);

    // Get the Pool instance
    const poolAddress = await addressesProvider.getPool();
    l2Pool = await MockL2Pool__factory.connect(poolAddress, await getFirstSigner());
    expect(await addressesProvider.setPriceOracle(oracle.address));
  });

  after(async () => {
    const { aaveOracle, addressesProvider } = testEnv;
    expect(await addressesProvider.setPriceOracle(aaveOracle.address));
  });

  it('Supply', async () => {
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

  it('setUserUseReserveAsCollateral to false', async () => {
    const {
      dai,
      aDai,
      users: [user0],
      helpersContract,
    } = testEnv;

    const encoded = await encoder.encodeSetUserUseReserveAsCollateral(dai.address, false);
    expect(await l2Pool.connect(user0.signer)['setUserUseReserveAsCollateral(bytes32)'](encoded))
      .to.emit(l2Pool, 'ReserveUsedAsCollateralDisabled')
      .withArgs(dai.address, user0.address);

    const userData = await helpersContract.getUserReserveData(dai.address, user0.address);
    expect(userData.usageAsCollateralEnabled).to.be.false;
  });

  it('setUserUseReserveAsCollateral to true', async () => {
    const {
      dai,
      users: [user0],
      helpersContract,
    } = testEnv;

    const encoded = await encoder.encodeSetUserUseReserveAsCollateral(dai.address, true);
    expect(await l2Pool.connect(user0.signer)['setUserUseReserveAsCollateral(bytes32)'](encoded))
      .to.emit(l2Pool, 'ReserveUsedAsCollateralEnabled')
      .withArgs(dai.address, user0.address);

    const userData = await helpersContract.getUserReserveData(dai.address, user0.address);
    expect(userData.usageAsCollateralEnabled).to.be.true;
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

  it('swapBorrowRateMode to stable', async () => {
    const { deployer, dai, usdc, helpersContract } = testEnv;
    const currentInterestRateMode = RateMode.Variable;
    const encoded = await encoder.encodeSwapBorrowRateMode(usdc.address, currentInterestRateMode);
    const userDataBefore = await helpersContract.getUserReserveData(usdc.address, deployer.address);
    expect(userDataBefore.currentStableDebt).to.be.eq(0);
    expect(userDataBefore.currentVariableDebt).to.be.gt(0);

    expect(await l2Pool.connect(deployer.signer)['swapBorrowRateMode(bytes32)'](encoded))
      .to.emit(l2Pool, 'SwapBorrowRateMode')
      .withArgs(usdc.address, deployer.address, Number(currentInterestRateMode));

    const userDataAfter = await helpersContract.getUserReserveData(usdc.address, deployer.address);

    expect(userDataAfter.currentStableDebt).to.be.gt(0);
    expect(userDataAfter.currentVariableDebt).to.be.eq(0);
  });

  it('rebalanceStableBorrowRate (revert expected)', async () => {
    // The test only checks that the value is translated properly, not that the underlying function is run correctly.
    // see other rebalance tests for that
    const { deployer, usdc } = testEnv;
    const encoded = await encoder.encodeRebalanceStableBorrowRate(usdc.address, deployer.address);
    await expect(
      l2Pool.connect(deployer.signer)['rebalanceStableBorrowRate(bytes32)'](encoded)
    ).to.be.revertedWith(ProtocolErrors.INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET);
  });

  it('swapBorrowRateMode to variable', async () => {
    const { deployer, dai, usdc, helpersContract } = testEnv;
    const currentInterestRateMode = RateMode.Stable;
    const encoded = await encoder.encodeSwapBorrowRateMode(usdc.address, currentInterestRateMode);
    const userDataBefore = await helpersContract.getUserReserveData(usdc.address, deployer.address);
    expect(userDataBefore.currentStableDebt).to.be.gt(0);
    expect(userDataBefore.currentVariableDebt).to.be.eq(0);

    expect(await l2Pool.connect(deployer.signer)['swapBorrowRateMode(bytes32)'](encoded))
      .to.emit(l2Pool, 'SwapBorrowRateMode')
      .withArgs(usdc.address, deployer.address, Number(currentInterestRateMode));

    const userDataAfter = await helpersContract.getUserReserveData(usdc.address, deployer.address);
    expect(userDataAfter.currentStableDebt).to.be.eq(0);
    expect(userDataAfter.currentVariableDebt).to.be.gt(0);
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

  it('Repay some with aTokens', async () => {
    const {
      deployer,
      usdc,
      aUsdc,
      users: [, user1],
    } = testEnv;

    await usdc.connect(deployer.signer).approve(l2Pool.address, MAX_UINT_AMOUNT);

    const data = await l2Pool.getReserveData(usdc.address);
    const vDebtToken = VariableDebtToken__factory.connect(
      data.variableDebtTokenAddress,
      deployer.signer
    );

    const repayAmount = parseUnits('10', 6);
    expect(await aUsdc.connect(user1.signer).transfer(deployer.address, repayAmount));

    const balanceBefore = await usdc.balanceOf(deployer.address);
    const debtBefore = await vDebtToken.balanceOf(deployer.address);

    const encoded = await encoder.encodeRepayWithATokensParams(
      usdc.address,
      repayAmount,
      RateMode.Variable
    );

    expect(await l2Pool.connect(deployer.signer)['repayWithATokens(bytes32)'](encoded))
      .to.emit(l2Pool, 'Repay')
      .withArgs(usdc.address, deployer.address, deployer.address, repayAmount, true);

    const userDebt = await vDebtToken.balanceOf(deployer.address);
    const userBalance = await usdc.balanceOf(deployer.address);
    const userABalance = await aUsdc.balanceOf(deployer.address);
    expect(userDebt).to.be.eq(debtBefore.sub(repayAmount), 'invalid amount repaid');
    expect(userBalance).to.be.eq(balanceBefore, 'user balance changed');
    expect(userABalance).to.be.eq(0, 'invalid amount repaid');
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

  it('liquidationCall', async () => {
    const {
      dai,
      usdc,
      users: [depositor, borrower, liquidator],
      oracle,
      pool,
      helpersContract,
    } = testEnv;

    //mints DAI to depositor
    const amountDAItoDeposit = parseUnits('5000', 18);
    await dai.connect(depositor.signer)['mint(uint256)'](amountDAItoDeposit);
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(dai.address, amountDAItoDeposit, depositor.address, '0');

    //user 2 deposits  usdc
    const amountUSDCtoDeposit = parseUnits('1000', 6);
    await usdc.connect(borrower.signer)['mint(uint256)'](parseUnits('1000', 6));
    await usdc.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(usdc.address, amountUSDCtoDeposit, borrower.address, '0');

    const userGlobalData = await pool.getUserAccountData(borrower.address);
    const daiPrice = await oracle.getAssetPrice(dai.address);

    const amountDAIToBorrow = userGlobalData.availableBorrowsBase
      .mul(9500)
      .div(10000)
      .div(daiPrice)
      .mul(BigNumber.from(10).pow(18));

    await pool
      .connect(borrower.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Stable, '0', borrower.address);

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataAfter.currentLiquidationThreshold).to.be.equal(8500, INVALID_HF);

    // Increases price
    await oracle.setAssetPrice(dai.address, daiPrice.mul(2));
    const userGlobalDataPriceChange = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataPriceChange.healthFactor).to.be.lt(parseUnits('1', 18), INVALID_HF);

    //mints dai to the liquidator
    await dai.connect(liquidator.signer)['mint(uint256)'](parseUnits('1000', 18));

    //approve protocol to access the liquidator wallet
    await dai.connect(liquidator.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const daiReserveDataBefore = await getReserveData(helpersContract, dai.address);
    const usdcReserveDataBefore = await getReserveData(helpersContract, usdc.address);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentStableDebt.div(2);

    await increaseTime(100);

    const encoded = await encoder.encodeLiquidationCall(
      usdc.address,
      dai.address,
      borrower.address,
      amountToLiquidate,
      false
    );

    const tx = await l2Pool
      .connect(liquidator.signer)
      ['liquidationCall(bytes32,bytes32)'](encoded[0], encoded[1]);

    const userReserveDataAfter = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const daiReserveDataAfter = await getReserveData(helpersContract, dai.address);
    const usdcReserveDataAfter = await getReserveData(helpersContract, usdc.address);

    const collateralPrice = await oracle.getAssetPrice(usdc.address);
    const principalPrice = await oracle.getAssetPrice(dai.address);

    const collateralDecimals = (await helpersContract.getReserveConfigurationData(usdc.address))
      .decimals;
    const principalDecimals = (await helpersContract.getReserveConfigurationData(dai.address))
      .decimals;

    const expectedCollateralLiquidated = principalPrice
      .mul(amountToLiquidate)
      .percentMul(10500)
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(principalDecimals)));

    if (!tx.blockNumber) {
      expect(false, 'Invalid block number');
      return;
    }
    const txTimestamp = BigNumber.from(
      (await hre.ethers.provider.getBlock(tx.blockNumber)).timestamp
    );

    const stableDebtBeforeTx = calcExpectedStableDebtTokenBalance(
      userReserveDataBefore.principalStableDebt,
      userReserveDataBefore.stableBorrowRate,
      userReserveDataBefore.stableRateLastUpdated,
      txTimestamp
    );

    expect(userReserveDataAfter.currentStableDebt).to.be.closeTo(
      stableDebtBeforeTx.sub(amountToLiquidate),
      2,
      'Invalid user debt after liquidation'
    );

    //the liquidity index of the principal reserve needs to be bigger than the index before
    expect(daiReserveDataAfter.liquidityIndex).to.be.gte(
      daiReserveDataBefore.liquidityIndex,
      'Invalid liquidity index'
    );

    //the principal APY after a liquidation needs to be lower than the APY before
    expect(daiReserveDataAfter.liquidityRate).to.be.lt(
      daiReserveDataBefore.liquidityRate,
      'Invalid liquidity APY'
    );

    expect(daiReserveDataAfter.totalLiquidity).to.be.closeTo(
      daiReserveDataBefore.totalLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal total liquidity'
    );

    expect(usdcReserveDataAfter.totalLiquidity).to.be.closeTo(
      usdcReserveDataBefore.totalLiquidity.sub(expectedCollateralLiquidated),
      2,
      'Invalid collateral total liquidity'
    );

    expect(daiReserveDataAfter.availableLiquidity).to.be.closeTo(
      daiReserveDataBefore.availableLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal available liquidity'
    );

    expect(usdcReserveDataAfter.availableLiquidity).to.be.closeTo(
      usdcReserveDataBefore.availableLiquidity.sub(expectedCollateralLiquidated),
      2,
      'Invalid collateral available liquidity'
    );
    await oracle.setAssetPrice(dai.address, daiPrice);
  });

  it('liquidationCall max value', async () => {
    const {
      dai,
      aUsdc,
      usdc,
      users: [depositor, borrower, liquidator],
      oracle,
      pool,
      helpersContract,
    } = testEnv;

    //mints DAI to depositor
    const amountDAItoDeposit = parseUnits('5000', 18);
    await dai.connect(depositor.signer)['mint(uint256)'](amountDAItoDeposit);
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(dai.address, amountDAItoDeposit, depositor.address, '0');

    //user 2 deposits  usdc
    const amountUSDCtoDeposit = parseUnits('1000', 6);
    await usdc.connect(borrower.signer)['mint(uint256)'](parseUnits('1000', 6));
    await usdc.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(usdc.address, amountUSDCtoDeposit, borrower.address, '0');

    const userGlobalData = await pool.getUserAccountData(borrower.address);
    const daiPrice = await oracle.getAssetPrice(dai.address);

    const amountDAIToBorrow = userGlobalData.availableBorrowsBase
      .mul(9500)
      .div(10000)
      .div(daiPrice)
      .mul(BigNumber.from(10).pow(18));

    await pool
      .connect(borrower.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Stable, '0', borrower.address);

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataAfter.currentLiquidationThreshold).to.be.equal(8500, INVALID_HF);

    // Increase price
    await oracle.setAssetPrice(dai.address, daiPrice.mul(2));
    const userGlobalDataPriceChange = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataPriceChange.healthFactor).to.be.lt(parseUnits('1', 18), INVALID_HF);

    //mints dai to the liquidator
    await dai.connect(liquidator.signer)['mint(uint256)'](parseUnits('1000', 18));

    //approve protocol to access the liquidator wallet
    await dai.connect(liquidator.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const encoded = await encoder.encodeLiquidationCall(
      usdc.address,
      dai.address,
      borrower.address,
      MAX_UINT_AMOUNT,
      true
    );

    const liquidatorAUSDCBefore = await aUsdc.balanceOf(liquidator.address);

    const tx = await l2Pool
      .connect(liquidator.signer)
      ['liquidationCall(bytes32,bytes32)'](encoded[0], encoded[1]);

    const userReserveDataAfter = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    expect(await aUsdc.balanceOf(liquidator.address)).to.be.gt(liquidatorAUSDCBefore);
    expect(
      userReserveDataAfter.currentStableDebt.add(userReserveDataAfter.currentVariableDebt)
    ).to.be.lt(
      userReserveDataBefore.currentStableDebt.add(userReserveDataBefore.currentVariableDebt)
    );
  });
});
