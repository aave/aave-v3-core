import { expect } from 'chai';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { parseUnits } from '@ethersproject/units';
import './helpers/utils/wadraymath';
import { getUserData } from './helpers/utils/helpers';

makeSuite('Pool Liquidation: Liquidates borrows in eMode with price change', (testEnv: TestEnv) => {
  const { INVALID_HF } = ProtocolErrors;
  it('Adds category id 1 (stablecoins)', async () => {
    const { configurator, pool, poolAdmin } = testEnv;

    await configurator
      .connect(poolAdmin.signer)
      .setEModeCategory(1, '9800', '9850', '10100', ZERO_ADDRESS, 'STABLECOINS');

    const categoryData = await pool.getEModeCategoryData(1);

    expect(categoryData.ltv).to.be.equal(9800, 'invalid eMode category ltv');
    expect(categoryData.liquidationThreshold).to.be.equal(
      9850,
      'invalid eMode category liq threshold'
    );
    expect(categoryData.liquidationBonus).to.be.equal(10100, 'invalid eMode category liq bonus');
    expect(categoryData.priceSource).to.be.equal(
      ZERO_ADDRESS,
      'invalid eMode category price source'
    );
  });

  it('Add DAI and USDC to category id 1', async () => {
    const { configurator, poolAdmin, dai, usdc } = testEnv;

    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, 1);
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, 1);
  });

  it('Some funds the DAI pool', async () => {
    const {
      pool,
      users: [daiFunder],
      dai,
    } = testEnv;
    const supplyAmount = parseUnits('1', 36);

    await dai.connect(daiFunder.signer).mint(supplyAmount);
    await dai.connect(daiFunder.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(daiFunder.signer).supply(dai.address, supplyAmount, daiFunder.address, 0);
  });

  it('Deposit USDC with eMode', async () => {
    const {
      pool,
      users: [, depositor],
      usdc,
    } = testEnv;

    await usdc.connect(depositor.signer).mint(parseUnits('10000', 6));
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(depositor.signer)
      .supply(usdc.address, parseUnits('10000', 6), depositor.address, 0);

    await pool.connect(depositor.signer).setUserEMode(1);
  });

  it('Borrow 98% LTV in dai', async () => {
    const {
      pool,
      users: [, depositor],
      dai,
      oracle,
    } = testEnv;

    const userGlobalData = await pool.getUserAccountData(depositor.address);
    const daiPrice = await oracle.getAssetPrice(dai.address);

    const amountDAIToBorrow = await convertToCurrencyDecimals(
      dai.address,
      userGlobalData.availableBorrowsBase.div(daiPrice).toString()
    );

    await pool
      .connect(depositor.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, 0, depositor.address);
  });

  it('Drop HF below 1', async () => {
    const {
      dai,
      users: [, depositor],
      pool,
      oracle,
    } = testEnv;

    const daiPrice = await oracle.getAssetPrice(dai.address);

    const userGlobalDataBefore = await pool.getUserAccountData(depositor.address);
    expect(userGlobalDataBefore.healthFactor).to.be.gt(parseUnits('1', 18));

    await oracle.setAssetPrice(
      dai.address,
      daiPrice.mul(userGlobalDataBefore.healthFactor).div(parseUnits('1', 18))
    );

    const userGlobalDataMid = await pool.getUserAccountData(depositor.address);
    expect(userGlobalDataMid.healthFactor).to.be.gt(parseUnits('1', 18));

    await oracle.setAssetPrice(dai.address, (await oracle.getAssetPrice(dai.address)).add(1));

    const userGlobalDataAfter = await pool.getUserAccountData(depositor.address);
    expect(userGlobalDataAfter.healthFactor).to.be.lt(parseUnits('1', 18), INVALID_HF);
  });

  it('Liquidates the borrow', async () => {
    const {
      dai,
      usdc,
      users: [, borrower, , liquidator],
      pool,
      helpersContract,
    } = testEnv;

    await dai.connect(liquidator.signer).mint(parseUnits('100000', 18));
    await dai.connect(liquidator.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentVariableDebt.div(2);

    const userGlobalDataBefore = await pool.getUserAccountData(borrower.address);

    await pool
      .connect(liquidator.signer)
      .liquidationCall(usdc.address, dai.address, borrower.address, amountToLiquidate, false);

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    expect(userGlobalDataAfter.healthFactor).to.be.gt(userGlobalDataBefore.healthFactor);
    expect(userGlobalDataAfter.totalCollateralBase).to.be.lt(
      userGlobalDataBefore.totalCollateralBase
    );
    expect(userGlobalDataAfter.totalDebtBase).to.be.lt(userGlobalDataBefore.totalDebtBase);
  });
});
