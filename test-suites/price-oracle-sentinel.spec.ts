import { expect } from 'chai';
import { BigNumber, BigNumberish, utils } from 'ethers';
import { timeLatest } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import {
  AaveOracle,
  MockAggregator__factory,
  PriceOracleSentinel,
  PriceOracleSentinel__factory,
  SequencerOracle,
  SequencerOracle__factory,
} from '../types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { makeSuite, SignerWithAddress, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { calcExpectedVariableDebtTokenBalance } from './helpers/utils/calculations';
import { getReserveData, getUserData } from './helpers/utils/helpers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { waitForTx, increaseTime, evmSnapshot, evmRevert } from '@aave/deploy-v3';
import './helpers/utils/wadraymath';

declare var hre: HardhatRuntimeEnvironment;

const setPriceWithMockAggregator = async (
  poolAdmin: SignerWithAddress,
  aaveOracle: AaveOracle,
  asset: string,
  price: BigNumberish
) => {
  const oracle = await new MockAggregator__factory(poolAdmin.signer).deploy(price);
  await aaveOracle.connect(poolAdmin.signer).setAssetSources([asset], [oracle.address]);
  return oracle;
};

makeSuite('PriceOracleSentinel', (testEnv: TestEnv) => {
  const {
    PRICE_ORACLE_SENTINEL_CHECK_FAILED,
    INVALID_HF,
    CALLER_NOT_POOL_ADMIN,
    CALLER_NOT_RISK_OR_POOL_ADMIN,
  } = ProtocolErrors;

  let sequencerOracle: SequencerOracle;
  let priceOracleSentinel: PriceOracleSentinel;

  const GRACE_PERIOD = BigNumber.from(60 * 60); // 1h
  const PRICE_EXPIRATION_TIME = BigNumber.from(10 * 60); // 10 min

  before(async () => {
    const { addressesProvider, deployer } = testEnv;

    // Deploy SequencerOracle
    sequencerOracle = await (
      await new SequencerOracle__factory(deployer.signer).deploy(deployer.address)
    ).deployed();

    priceOracleSentinel = await (
      await new PriceOracleSentinel__factory(await getFirstSigner()).deploy(
        addressesProvider.address,
        sequencerOracle.address,
        GRACE_PERIOD,
        PRICE_EXPIRATION_TIME
      )
    ).deployed();
  });

  it.only('Admin sets a PriceOracleSentinel and activate it for DAI and WETH', async () => {
    const { addressesProvider, poolAdmin } = testEnv;

    expect(
      await addressesProvider
        .connect(poolAdmin.signer)
        .setPriceOracleSentinel(priceOracleSentinel.address)
    )
      .to.emit(addressesProvider, 'PriceOracleSentinelUpdated')
      .withArgs(ZERO_ADDRESS, priceOracleSentinel.address);

    expect(await addressesProvider.getPriceOracleSentinel()).to.be.eq(priceOracleSentinel.address);

    const answer = await sequencerOracle.latestRoundData();
    expect(answer[1]).to.be.eq(0);
    expect(answer[3]).to.be.eq(0);
  });

  it.only('PoolAdmin updates grace period for sentinel', async () => {
    const { poolAdmin } = testEnv;

    const newGracePeriod = 0;

    expect(await priceOracleSentinel.getGracePeriod()).to.be.eq(GRACE_PERIOD);
    expect(await priceOracleSentinel.connect(poolAdmin.signer).setGracePeriod(0))
      .to.emit(priceOracleSentinel, 'GracePeriodUpdated')
      .withArgs(0);
    expect(await priceOracleSentinel.getGracePeriod()).to.be.eq(newGracePeriod);
  });

  it.only('Risk admin updates grace period for sentinel', async () => {
    const { riskAdmin } = testEnv;

    expect(await priceOracleSentinel.getGracePeriod()).to.be.eq(0);
    expect(await priceOracleSentinel.connect(riskAdmin.signer).setGracePeriod(GRACE_PERIOD))
      .to.emit(priceOracleSentinel, 'GracePeriodUpdated')
      .withArgs(GRACE_PERIOD);
    expect(await priceOracleSentinel.getGracePeriod()).to.be.eq(GRACE_PERIOD);
  });

  it.only('User tries to set grace period for sentinel (revert expected)', async () => {
    const {
      users: [user],
    } = testEnv;

    expect(await priceOracleSentinel.getGracePeriod()).to.be.eq(GRACE_PERIOD);
    await expect(priceOracleSentinel.connect(user.signer).setGracePeriod(0)).to.be.revertedWith(
      CALLER_NOT_RISK_OR_POOL_ADMIN
    );
    expect(await priceOracleSentinel.getGracePeriod()).to.not.be.eq(0);
  });

  it.only('PoolAdmin updates price expiration time for sentinel', async () => {
    const { poolAdmin } = testEnv;

    const newGracePeriod = 0;

    expect(await priceOracleSentinel.getPriceExpirationTime()).to.be.eq(PRICE_EXPIRATION_TIME);
    expect(await priceOracleSentinel.connect(poolAdmin.signer).setPriceExpirationTime(0))
      .to.emit(priceOracleSentinel, 'PriceExpirationTimeUpdated')
      .withArgs(0);
    expect(await priceOracleSentinel.getPriceExpirationTime()).to.be.eq(newGracePeriod);
  });

  it.only('Risk admin updates price expiration time for sentinel', async () => {
    const { riskAdmin } = testEnv;

    expect(await priceOracleSentinel.getPriceExpirationTime()).to.be.eq(0);
    expect(
      await priceOracleSentinel
        .connect(riskAdmin.signer)
        .setPriceExpirationTime(PRICE_EXPIRATION_TIME)
    )
      .to.emit(priceOracleSentinel, 'PriceExpirationTimeUpdated')
      .withArgs(PRICE_EXPIRATION_TIME);
    expect(await priceOracleSentinel.getPriceExpirationTime()).to.be.eq(PRICE_EXPIRATION_TIME);
  });

  it.only('User tries to set price expiration time for sentinel (revert expected)', async () => {
    const {
      users: [user],
    } = testEnv;

    expect(await priceOracleSentinel.getPriceExpirationTime()).to.be.eq(PRICE_EXPIRATION_TIME);
    await expect(
      priceOracleSentinel.connect(user.signer).setPriceExpirationTime(0)
    ).to.be.revertedWith(CALLER_NOT_RISK_OR_POOL_ADMIN);
    expect(await priceOracleSentinel.getPriceExpirationTime()).to.not.be.eq(0);
  });

  it.only('PoolAdmin updates the sequencer oracle', async () => {
    const { poolAdmin } = testEnv;

    const newSequencerOracle = ZERO_ADDRESS;

    expect(await priceOracleSentinel.getSequencerOracle()).to.be.eq(sequencerOracle.address);
    expect(
      await priceOracleSentinel.connect(poolAdmin.signer).setSequencerOracle(newSequencerOracle)
    )
      .to.emit(priceOracleSentinel, 'SequencerOracleUpdated')
      .withArgs(newSequencerOracle);
    expect(await priceOracleSentinel.getSequencerOracle()).to.be.eq(newSequencerOracle);

    expect(
      await priceOracleSentinel
        .connect(poolAdmin.signer)
        .setSequencerOracle(sequencerOracle.address)
    )
      .to.emit(priceOracleSentinel, 'SequencerOracleUpdated')
      .withArgs(sequencerOracle.address);
    expect(await priceOracleSentinel.getSequencerOracle()).to.be.eq(sequencerOracle.address);
  });

  it.only('User tries to update sequencer oracle (revert expected)', async () => {
    const {
      users: [user],
    } = testEnv;
    const newSequencerOracle = ZERO_ADDRESS;

    expect(await priceOracleSentinel.getSequencerOracle()).to.be.eq(sequencerOracle.address);
    await expect(
      priceOracleSentinel.connect(user.signer).setSequencerOracle(newSequencerOracle)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
    expect(await priceOracleSentinel.getSequencerOracle()).to.be.eq(sequencerOracle.address);
  });

  it.only('User borrow DAI', async () => {
    const {
      dai,
      weth,
      users: [depositor, borrower, borrower2],
      pool,
      aaveOracle,
    } = testEnv;

    //mints DAI to depositor
    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '2000'));

    //approve protocol to access depositor wallet
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '2000');
    await pool
      .connect(depositor.signer)
      .deposit(dai.address, amountDAItoDeposit, depositor.address, '0');

    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '0.06775');

    for (let i = 0; i < 2; i++) {
      const borrowers = [borrower, borrower2];
      const currBorrower = borrowers[i];
      //mints WETH to borrower
      await weth.connect(currBorrower.signer)['mint(uint256)'](amountETHtoDeposit);

      //approve protocol to access borrower wallet
      await weth.connect(currBorrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

      //user 2 deposits 1 WETH
      await pool
        .connect(currBorrower.signer)
        .deposit(weth.address, amountETHtoDeposit, currBorrower.address, '0');

      //user 2 borrows
      const userGlobalData = await pool.getUserAccountData(currBorrower.address);
      const daiPrice = await aaveOracle.getAssetPrice(dai.address);

      const amountDAIToBorrow = await convertToCurrencyDecimals(
        dai.address,
        userGlobalData.availableBorrowsBase.div(daiPrice.toString()).percentMul(9500).toString()
      );

      await pool
        .connect(currBorrower.signer)
        .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, '0', currBorrower.address);
    }
  });

  it.only('Kill sequencer and drop health factor below 1', async () => {
    const {
      dai,
      poolAdmin,
      users: [, borrower],
      pool,
      aaveOracle,
    } = testEnv;

    const daiPrice = await aaveOracle.getAssetPrice(dai.address);
    await setPriceWithMockAggregator(
      poolAdmin,
      aaveOracle,
      dai.address,
      daiPrice.percentMul(11000)
    );

    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);
    const currAnswer = await sequencerOracle.latestRoundData();
    waitForTx(await sequencerOracle.setAnswer(true, currAnswer[3]));
  });

  it.only('Tries to liquidate borrower when sequencer is down (HF > 0.95) (revert expected)', async () => {
    const {
      pool,
      dai,
      weth,
      users: [, borrower],
      helpersContract,
    } = testEnv;

    await dai['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));
    await dai.approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2);
    await expect(
      pool.liquidationCall(weth.address, dai.address, borrower.address, amountToLiquidate, true)
    ).to.be.revertedWith(PRICE_ORACLE_SENTINEL_CHECK_FAILED);
  });

  it.only('Drop health factor lower', async () => {
    const {
      dai,
      poolAdmin,
      users: [, borrower],
      pool,
      aaveOracle,
    } = testEnv;

    const daiPrice = await aaveOracle.getAssetPrice(dai.address);
    await setPriceWithMockAggregator(
      poolAdmin,
      aaveOracle,
      dai.address,
      daiPrice.percentMul(11000)
    );
    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);
  });

  it.only('Liquidates borrower when sequencer is down (HF < 0.95)', async () => {
    const {
      pool,
      dai,
      weth,
      users: [, borrower],
      aaveOracle,
      helpersContract,
      deployer,
    } = testEnv;

    await dai['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));
    await dai.approve(pool.address, MAX_UINT_AMOUNT);

    const daiReserveDataBefore = await getReserveData(helpersContract, dai.address);
    const ethReserveDataBefore = await getReserveData(helpersContract, weth.address);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const userWethReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      weth.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2);

    const tx = await pool.liquidationCall(
      weth.address,
      dai.address,
      borrower.address,
      amountToLiquidate,
      true
    );

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      dai.address,
      borrower.address
    );

    const userWethReserveDataAfter = await helpersContract.getUserReserveData(
      weth.address,
      borrower.address
    );

    const daiReserveDataAfter = await getReserveData(helpersContract, dai.address);
    const ethReserveDataAfter = await getReserveData(helpersContract, weth.address);

    const collateralPrice = await aaveOracle.getAssetPrice(weth.address);
    const principalPrice = await aaveOracle.getAssetPrice(dai.address);

    const collateralDecimals = (await helpersContract.getReserveConfigurationData(weth.address))
      .decimals;
    const principalDecimals = (await helpersContract.getReserveConfigurationData(dai.address))
      .decimals;

    const expectedCollateralLiquidated = principalPrice
      .mul(amountToLiquidate)
      .percentMul(10500)
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(principalDecimals)));

    expect(expectedCollateralLiquidated).to.be.closeTo(
      userWethReserveDataBefore.currentATokenBalance.sub(
        userWethReserveDataAfter.currentATokenBalance
      ),
      2,
      'Invalid collateral amount liquidated'
    );

    if (!tx.blockNumber) {
      expect(false, 'Invalid block number');
      return;
    }

    const txTimestamp = BigNumber.from(
      (await hre.ethers.provider.getBlock(tx.blockNumber)).timestamp
    );

    const variableDebtBeforeTx = calcExpectedVariableDebtTokenBalance(
      daiReserveDataBefore,
      userReserveDataBefore,
      txTimestamp
    );

    expect(userReserveDataAfter.currentVariableDebt).to.be.closeTo(
      variableDebtBeforeTx.sub(amountToLiquidate),
      2,
      'Invalid user borrow balance after liquidation'
    );

    expect(daiReserveDataAfter.availableLiquidity).to.be.closeTo(
      daiReserveDataBefore.availableLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal available liquidity'
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

    expect(ethReserveDataAfter.availableLiquidity).to.be.closeTo(
      ethReserveDataBefore.availableLiquidity,
      2,
      'Invalid collateral available liquidity'
    );

    expect(
      (await helpersContract.getUserReserveData(weth.address, deployer.address))
        .usageAsCollateralEnabled
    ).to.be.true;
  });

  it.only('User tries to borrow (revert expected)', async () => {
    const {
      dai,
      weth,
      users: [, , , user],
      pool,
    } = testEnv;

    await weth.connect(user.signer)['mint(uint256)'](utils.parseUnits('0.06775', 18));
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .supply(weth.address, utils.parseUnits('0.06775', 18), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(PRICE_ORACLE_SENTINEL_CHECK_FAILED);
  });

  it.only('Turn on sequencer', async () => {
    await waitForTx(await sequencerOracle.setAnswer(false, await timeLatest()));
  });

  it.only('User tries to borrow (revert expected)', async () => {
    const {
      dai,
      weth,
      users: [, , , user],
      pool,
    } = testEnv;

    await weth.connect(user.signer)['mint(uint256)'](utils.parseUnits('0.06775', 18));
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .supply(weth.address, utils.parseUnits('0.06775', 18), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(PRICE_ORACLE_SENTINEL_CHECK_FAILED);
  });

  it.only('Turn off sequencer + increase time more than grace period', async () => {
    const currAnswer = await sequencerOracle.latestRoundData();
    await waitForTx(await sequencerOracle.setAnswer(true, currAnswer[3]));
    await increaseTime(GRACE_PERIOD.mul(2).toNumber());
  });

  it.only('User tries to borrow (revert expected)', async () => {
    const {
      dai,
      weth,
      users: [, , , user],
      pool,
    } = testEnv;

    await weth.connect(user.signer)['mint(uint256)'](utils.parseUnits('0.06775', 18));
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .supply(weth.address, utils.parseUnits('0.06775', 18), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(PRICE_ORACLE_SENTINEL_CHECK_FAILED);
  });

  it.only('Turn on sequencer + increase time past grace period', async () => {
    await waitForTx(await sequencerOracle.setAnswer(false, await timeLatest()));
    await increaseTime(GRACE_PERIOD.mul(2).toNumber());
  });

  it.only('User tries to borrow DAI while its price is stale (revert expected)', async () => {
    const {
      dai,
      weth,
      users: [, , , user],
      pool,
      aaveOracle,
    } = testEnv;

    const snapId = await evmSnapshot();

    const oracleSourceAddress = await aaveOracle.getSourceOfAsset(dai.address);
    const oracleSource = MockAggregator__factory.connect(oracleSourceAddress, user.signer);
    const { updatedAt: updatedAtBefore } = await oracleSource.latestRoundData();

    // Mock the last update of DAI price
    const newUpdatedAt = (await timeLatest()).sub(PRICE_EXPIRATION_TIME);
    await oracleSource.setLastUpdateTimestamp(newUpdatedAt);
    const { updatedAt: updatedAtAfter } = await oracleSource.latestRoundData();
    expect(updatedAtAfter).to.be.not.eq(updatedAtBefore);
    expect(updatedAtAfter).to.be.eq(newUpdatedAt);

    expect(await priceOracleSentinel.isBorrowAllowed(aaveOracle.address, dai.address)).to.be.false;

    await weth.connect(user.signer)['mint(uint256)'](utils.parseUnits('0.06775', 18));
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .supply(weth.address, utils.parseUnits('0.06775', 18), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(PRICE_ORACLE_SENTINEL_CHECK_FAILED);

    await evmRevert(snapId);
  });

  it.only('User borrows more DAI', async () => {
    const {
      dai,
      weth,
      users: [, , , user],
      pool,
    } = testEnv;

    await weth.connect(user.signer)['mint(uint256)'](utils.parseUnits('0.06775', 18));
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .supply(weth.address, utils.parseUnits('0.06775', 18), user.address, 0);

    await waitForTx(
      await pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address)
    );
  });

  it.only('Increase health factor', async () => {
    const {
      poolAdmin,
      dai,
      users: [, borrower],
      pool,
      aaveOracle,
    } = testEnv;

    const daiPrice = await aaveOracle.getAssetPrice(dai.address);
    await setPriceWithMockAggregator(poolAdmin, aaveOracle, dai.address, daiPrice.percentMul(9500));
    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);
    expect(userGlobalData.healthFactor).to.be.gt(utils.parseUnits('0.95', 18), INVALID_HF);
  });

  it.only('Tries to liquidate borrower when debt price is stale (revert expected)', async () => {
    const {
      pool,
      dai,
      weth,
      users: [, borrower, , user],
      helpersContract,
      aaveOracle,
    } = testEnv;

    const snapId = await evmSnapshot();
    const oracleSourceAddress = await aaveOracle.getSourceOfAsset(dai.address);
    const oracleSource = MockAggregator__factory.connect(oracleSourceAddress, user.signer);
    const { updatedAt: updatedAtBefore } = await oracleSource.latestRoundData();

    // Mock the last update of DAI price
    const newUpdatedAt = (await timeLatest()).sub(PRICE_EXPIRATION_TIME);
    await oracleSource.setLastUpdateTimestamp(newUpdatedAt);
    const { updatedAt: updatedAtAfter } = await oracleSource.latestRoundData();
    expect(updatedAtAfter).to.be.not.eq(updatedAtBefore);
    expect(updatedAtAfter).to.be.eq(newUpdatedAt);

    expect(await priceOracleSentinel.isLiquidationAllowed(aaveOracle.address, dai.address)).to.be
      .false;

    await dai['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));
    await dai.approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2);
    await expect(
      pool.liquidationCall(weth.address, dai.address, borrower.address, amountToLiquidate, true)
    ).to.be.revertedWith(PRICE_ORACLE_SENTINEL_CHECK_FAILED);

    await evmRevert(snapId);
  });

  it.only('Liquidates borrower when sequencer is up again', async () => {
    const {
      pool,
      dai,
      weth,
      users: [, , borrower],
      aaveOracle,
      helpersContract,
      deployer,
    } = testEnv;

    await dai['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));
    await dai.approve(pool.address, MAX_UINT_AMOUNT);

    const daiReserveDataBefore = await getReserveData(helpersContract, dai.address);
    const ethReserveDataBefore = await getReserveData(helpersContract, weth.address);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const userWethReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      weth.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2);

    // The supply is the same, but there should be a change in who has what. The liquidator should have received what the borrower lost.
    const tx = await pool.liquidationCall(
      weth.address,
      dai.address,
      borrower.address,
      amountToLiquidate,
      true
    );

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      dai.address,
      borrower.address
    );

    const userWethReserveDataAfter = await helpersContract.getUserReserveData(
      weth.address,
      borrower.address
    );

    const daiReserveDataAfter = await getReserveData(helpersContract, dai.address);
    const ethReserveDataAfter = await getReserveData(helpersContract, weth.address);

    const collateralPrice = await aaveOracle.getAssetPrice(weth.address);
    const principalPrice = await aaveOracle.getAssetPrice(dai.address);

    const collateralDecimals = (await helpersContract.getReserveConfigurationData(weth.address))
      .decimals;
    const principalDecimals = (await helpersContract.getReserveConfigurationData(dai.address))
      .decimals;

    const expectedCollateralLiquidated = principalPrice
      .mul(amountToLiquidate)
      .percentMul(10500)
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(principalDecimals)));

    expect(expectedCollateralLiquidated).to.be.closeTo(
      userWethReserveDataBefore.currentATokenBalance.sub(
        userWethReserveDataAfter.currentATokenBalance
      ),
      2,
      'Invalid collateral amount liquidated'
    );

    if (!tx.blockNumber) {
      expect(false, 'Invalid block number');
      return;
    }

    const txTimestamp = BigNumber.from(
      (await hre.ethers.provider.getBlock(tx.blockNumber)).timestamp
    );

    const variableDebtBeforeTx = calcExpectedVariableDebtTokenBalance(
      daiReserveDataBefore,
      userReserveDataBefore,
      txTimestamp
    );

    expect(userReserveDataAfter.currentVariableDebt).to.be.closeTo(
      variableDebtBeforeTx.sub(amountToLiquidate),
      2,
      'Invalid user borrow balance after liquidation'
    );

    expect(daiReserveDataAfter.availableLiquidity).to.be.closeTo(
      daiReserveDataBefore.availableLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal available liquidity'
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

    expect(ethReserveDataAfter.availableLiquidity).to.be.closeTo(
      ethReserveDataBefore.availableLiquidity,
      2,
      'Invalid collateral available liquidity'
    );

    expect(
      (await helpersContract.getUserReserveData(weth.address, deployer.address))
        .usageAsCollateralEnabled
    ).to.be.true;
  });
});
