import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { calcExpectedVariableDebtTokenBalance } from './helpers/utils/calculations';
import { getReserveData, getUserData } from './helpers/utils/helpers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { waitForTx, increaseTime } from '@aave/deploy-v3';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool Liquidation: Liquidates borrows in eMode through interest', (testEnv: TestEnv) => {
  const { INVALID_HF } = ProtocolErrors;

  const CATEGORY = {
    id: BigNumber.from('1'),
    ltv: BigNumber.from('9800'),
    lt: BigNumber.from('9850'),
    lb: BigNumber.from('10100'),
    oracle: ZERO_ADDRESS,
    label: 'STABLECOINS',
  };

  before(async () => {
    const { addressesProvider, oracle } = testEnv;

    await waitForTx(await addressesProvider.setPriceOracle(oracle.address));
  });

  after(async () => {
    const { aaveOracle, addressesProvider } = testEnv;
    await waitForTx(await addressesProvider.setPriceOracle(aaveOracle.address));
  });

  it('Adds category id 1 (stablecoins)', async () => {
    const { configurator, pool, poolAdmin } = testEnv;

    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory(
          CATEGORY.id,
          CATEGORY.ltv,
          CATEGORY.lt,
          CATEGORY.lb,
          CATEGORY.oracle,
          CATEGORY.label
        )
    );

    const categoryData = await pool.getEModeCategoryData(CATEGORY.id);

    expect(categoryData.ltv).to.be.equal(CATEGORY.ltv, 'invalid eMode category ltv');
    expect(categoryData.liquidationThreshold).to.be.equal(
      CATEGORY.lt,
      'invalid eMode category liq threshold'
    );
    expect(categoryData.liquidationBonus).to.be.equal(
      CATEGORY.lb,
      'invalid eMode category liq bonus'
    );
    expect(categoryData.priceSource).to.be.equal(
      CATEGORY.oracle,
      'invalid eMode category price source'
    );
  });

  it('Add DAI and USDC to category id 1', async () => {
    const { configurator, poolAdmin, dai, usdc } = testEnv;

    expect(
      await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, CATEGORY.id)
    );
    expect(
      await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, CATEGORY.id)
    );
  });

  it('Someone funds the DAI pool', async () => {
    const {
      pool,
      users: [daiFunder],
      dai,
    } = testEnv;
    const supplyAmount = utils.parseUnits('10000', 18);

    await dai.connect(daiFunder.signer)['mint(uint256)'](supplyAmount);
    await dai.connect(daiFunder.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(daiFunder.signer).supply(dai.address, supplyAmount, daiFunder.address, 0);
  });

  it('Deposit USDC with eMode', async () => {
    const {
      pool,
      users: [, borrower],
      usdc,
    } = testEnv;

    await usdc.connect(borrower.signer)['mint(uint256)'](utils.parseUnits('10000', 6));
    await usdc.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(borrower.signer)
      .supply(usdc.address, utils.parseUnits('10000', 6), borrower.address, 0);

    await pool.connect(borrower.signer).setUserEMode(CATEGORY.id);
  });

  it('Borrow as much DAI as possible', async () => {
    const {
      pool,
      users: [, borrower],
      dai,
      oracle,
    } = testEnv;

    const userGlobalData = await pool.getUserAccountData(borrower.address);
    const daiPrice = await oracle.getAssetPrice(dai.address);

    const amountDAIToBorrow = await convertToCurrencyDecimals(
      dai.address,
      userGlobalData.availableBorrowsBase.div(daiPrice).toString()
    );

    await pool
      .connect(borrower.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, 0, borrower.address);
  });

  it('Drop HF below 1', async () => {
    const {
      users: [, borrower],
      pool,
    } = testEnv;

    const userGlobalDataBefore = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataBefore.healthFactor).to.be.gt(utils.parseUnits('1', 18), INVALID_HF);
    await increaseTime(60 * 60 * 24 * 3);

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataAfter.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);
  });

  it('Liquidates the borrow', async () => {
    const {
      dai,
      usdc,
      users: [, borrower, liquidator],
      pool,
      oracle,
      helpersContract,
    } = testEnv;

    await dai.connect(liquidator.signer)['mint(uint256)'](utils.parseUnits('100000', 18));
    await dai.connect(liquidator.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const daiReserveDataBefore = await getReserveData(helpersContract, dai.address);
    const usdcReserveDataBefore = await getReserveData(helpersContract, usdc.address);
    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2);
    const userGlobalDataBefore = await pool.getUserAccountData(borrower.address);

    const tx = await pool
      .connect(liquidator.signer)
      .liquidationCall(usdc.address, dai.address, borrower.address, amountToLiquidate, false);

    const daiReserveDataAfter = await getReserveData(helpersContract, dai.address);
    const usdcReserveDataAfter = await getReserveData(helpersContract, usdc.address);
    const userReserveDataAfter = await helpersContract.getUserReserveData(
      dai.address,
      borrower.address
    );

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    expect(userGlobalDataAfter.healthFactor).to.be.gt(userGlobalDataBefore.healthFactor);
    expect(userGlobalDataAfter.totalCollateralBase).to.be.lt(
      userGlobalDataBefore.totalCollateralBase
    );
    expect(userGlobalDataAfter.totalDebtBase).to.be.lt(userGlobalDataBefore.totalDebtBase);

    const collateralPrice = await oracle.getAssetPrice(usdc.address);
    const principalPrice = await oracle.getAssetPrice(dai.address);
    const collateralDecimals = (await helpersContract.getReserveConfigurationData(usdc.address))
      .decimals;
    const principalDecimals = (await helpersContract.getReserveConfigurationData(dai.address))
      .decimals;

    const expectedCollateralLiquidated = principalPrice
      .mul(amountToLiquidate)
      .percentMul(CATEGORY.lb)
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(principalDecimals)));

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
  });
});
