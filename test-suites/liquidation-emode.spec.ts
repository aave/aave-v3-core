import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { getReserveData, getUserData } from './helpers/utils/helpers';
import './helpers/utils/wadraymath';
import { evmRevert, evmSnapshot, waitForTx } from '@aave/deploy-v3';

makeSuite('Pool Liquidation: Liquidates borrows in eMode with price change', (testEnv: TestEnv) => {
  const { INVALID_HF } = ProtocolErrors;

  const CATEGORY = {
    id: BigNumber.from('1'),
    ltv: BigNumber.from('9800'),
    lt: BigNumber.from('9850'),
    lb: BigNumber.from('10100'),
    oracle: ZERO_ADDRESS,
    label: 'STABLECOINS',
  };

  let snap: string;

  before(async () => {
    const { addressesProvider, oracle } = testEnv;
    await waitForTx(await addressesProvider.setPriceOracle(oracle.address));
    snap = await evmSnapshot();
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
          1,
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
    const { configurator, pool, helpersContract, poolAdmin, dai, usdc } = testEnv;

    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, CATEGORY.id);
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, CATEGORY.id);

    expect(await helpersContract.getReserveEModeCategory(dai.address)).to.be.eq(CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(usdc.address)).to.be.eq(CATEGORY.id);
  });

  it('Someone funds the DAI pool', async () => {
    const {
      pool,
      users: [daiFunder],
      dai,
    } = testEnv;
    const supplyAmount = utils.parseUnits('1', 36);

    await dai.connect(daiFunder.signer)['mint(uint256)'](supplyAmount);
    await dai.connect(daiFunder.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(daiFunder.signer).supply(dai.address, supplyAmount, daiFunder.address, 0);
  });

  it('Deposit USDC with eMode', async () => {
    const {
      pool,
      users: [, depositor],
      usdc,
    } = testEnv;

    await usdc.connect(depositor.signer)['mint(uint256)'](utils.parseUnits('10000', 6));
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(depositor.signer)
      .supply(usdc.address, utils.parseUnits('10000', 6), depositor.address, 0);

    await pool.connect(depositor.signer).setUserEMode(CATEGORY.id);
    expect(await pool.getUserEMode(depositor.address)).to.be.eq(CATEGORY.id);
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
    expect(userGlobalDataBefore.healthFactor).to.be.gt(utils.parseUnits('1', 18));

    await oracle.setAssetPrice(
      dai.address,
      daiPrice.mul(userGlobalDataBefore.healthFactor).div(utils.parseUnits('1', 18))
    );

    const userGlobalDataMid = await pool.getUserAccountData(depositor.address);
    expect(userGlobalDataMid.healthFactor).to.be.gt(utils.parseUnits('1', 18));

    await oracle.setAssetPrice(dai.address, (await oracle.getAssetPrice(dai.address)).add(1));

    const userGlobalDataAfter = await pool.getUserAccountData(depositor.address);
    expect(userGlobalDataAfter.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);
  });

  it('Liquidates the borrow', async () => {
    const {
      dai,
      usdc,
      users: [, borrower, , liquidator],
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

    await pool
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

    expect(userReserveDataAfter.currentVariableDebt).to.be.closeTo(
      userReserveDataBefore.currentVariableDebt.sub(amountToLiquidate),
      3,
      'Invalid user borrow balance after liquidation'
    );

    //the liquidity index of the principal reserve needs to be bigger than the index before
    expect(daiReserveDataAfter.liquidityIndex).to.be.eq(
      daiReserveDataBefore.liquidityIndex,
      'Invalid liquidity index'
    );

    //the principal APY after a liquidation needs to be lower than the APY before
    expect(daiReserveDataAfter.liquidityRate).to.be.eq(0, 'Invalid liquidity APY');

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

  it('Liquidation of non-eMode collateral with eMode debt for user in EMode', async () => {
    await evmRevert(snap);
    snap = await evmSnapshot();

    const {
      helpersContract,
      oracle,
      configurator,
      pool,
      poolAdmin,
      dai,
      usdc,
      weth,
      aWETH,
      users: [user1, user2],
    } = testEnv;

    // Create category
    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory(
          1,
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

    // Add Dai and USDC to category
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, CATEGORY.id);
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(dai.address)).to.be.eq(CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(usdc.address)).to.be.eq(CATEGORY.id);

    // User 1 supply 1 dai + 1 eth, user 2 supply 10000 usdc
    const wethSupplyAmount = utils.parseUnits('1', 18);
    const daiSupplyAmount = utils.parseUnits('1', 18);
    const usdcSupplyAmount = utils.parseUnits('10000', 6);

    expect(await dai.connect(user1.signer)['mint(uint256)'](daiSupplyAmount));
    expect(await weth.connect(user1.signer)['mint(uint256)'](wethSupplyAmount));
    expect(await usdc.connect(user2.signer)['mint(uint256)'](usdcSupplyAmount.mul(2)));

    expect(await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(await pool.connect(user1.signer).supply(dai.address, daiSupplyAmount, user1.address, 0));
    expect(
      await pool.connect(user1.signer).supply(weth.address, wethSupplyAmount, user1.address, 0)
    );
    expect(
      await pool.connect(user2.signer).supply(usdc.address, usdcSupplyAmount, user2.address, 0)
    );

    // Activate emode
    expect(await pool.connect(user1.signer).setUserEMode(CATEGORY.id));

    // Borrow a as much usdc as possible
    const userData = await pool.getUserAccountData(user1.address);
    const toBorrow = userData.availableBorrowsBase.div(100);

    expect(
      await pool
        .connect(user1.signer)
        .borrow(usdc.address, toBorrow, RateMode.Variable, 0, user1.address)
    );

    // Drop weth price
    const wethPrice = await oracle.getAssetPrice(weth.address);

    const userGlobalDataBefore = await pool.getUserAccountData(user1.address);
    expect(userGlobalDataBefore.healthFactor).to.be.gt(utils.parseUnits('1', 18));

    await oracle.setAssetPrice(weth.address, wethPrice.percentMul(9000));

    const userGlobalDataAfter = await pool.getUserAccountData(user1.address);
    expect(userGlobalDataAfter.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);

    const balanceBefore = await aWETH.balanceOf(user1.address);

    // Liquidate
    await pool
      .connect(user2.signer)
      .liquidationCall(weth.address, usdc.address, user1.address, toBorrow.div(2), false);

    const balanceAfter = await aWETH.balanceOf(user1.address);

    const debtPrice = await oracle.getAssetPrice(usdc.address);
    const collateralPrice = await oracle.getAssetPrice(weth.address);

    const wethConfig = await helpersContract.getReserveConfigurationData(weth.address);

    const expectedCollateralLiquidated = debtPrice
      .mul(toBorrow.div(2))
      .percentMul(wethConfig.liquidationBonus)
      .mul(BigNumber.from(10).pow(18))
      .div(collateralPrice.mul(BigNumber.from(10).pow(6)));

    const collateralLiquidated = balanceBefore.sub(balanceAfter);
    expect(collateralLiquidated).to.be.closeTo(expectedCollateralLiquidated, 2);
  });

  it('Liquidation of eMode collateral with eMode debt in EMode with custom price feed', async () => {
    await evmRevert(snap);
    snap = await evmSnapshot();

    const {
      helpersContract,
      oracle,
      configurator,
      pool,
      poolAdmin,
      dai,
      usdc,
      weth,
      aDai,
      users: [user1, user2],
    } = testEnv;

    // We need an extra oracle for prices. USe user address as asset in price oracle
    const EMODE_ORACLE_ADDRESS = user1.address;
    await oracle.setAssetPrice(EMODE_ORACLE_ADDRESS, utils.parseUnits('1', 8));
    await oracle.setAssetPrice(dai.address, utils.parseUnits('0.99', 8));
    await oracle.setAssetPrice(usdc.address, utils.parseUnits('1.01', 8));
    await oracle.setAssetPrice(weth.address, utils.parseUnits('4000', 8));

    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory(
          1,
          CATEGORY.ltv,
          CATEGORY.lt,
          CATEGORY.lb,
          EMODE_ORACLE_ADDRESS,
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
      EMODE_ORACLE_ADDRESS,
      'invalid eMode category price source'
    );

    // Add Dai and USDC to category
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, CATEGORY.id);
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(dai.address)).to.be.eq(CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(usdc.address)).to.be.eq(CATEGORY.id);

    // User 1 supply 5000 dai + 1 eth, user 2 supply 10000 usdc
    const wethSupplyAmount = utils.parseUnits('1', 18);
    const daiSupplyAmount = utils.parseUnits('5000', 18);
    const usdcSupplyAmount = utils.parseUnits('10000', 6);

    expect(await dai.connect(user1.signer)['mint(uint256)'](daiSupplyAmount));
    expect(await weth.connect(user1.signer)['mint(uint256)'](wethSupplyAmount));
    expect(await usdc.connect(user2.signer)['mint(uint256)'](usdcSupplyAmount.mul(2)));

    expect(await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(await pool.connect(user1.signer).supply(dai.address, daiSupplyAmount, user1.address, 0));
    expect(
      await pool.connect(user1.signer).supply(weth.address, wethSupplyAmount, user1.address, 0)
    );
    expect(
      await pool.connect(user2.signer).supply(usdc.address, usdcSupplyAmount, user2.address, 0)
    );

    // Activate emode
    expect(await pool.connect(user1.signer).setUserEMode(CATEGORY.id));

    // Borrow as much usdc as possible
    const userData = await pool.getUserAccountData(user1.address);
    const toBorrow = userData.availableBorrowsBase.div(100);

    expect(
      await pool
        .connect(user1.signer)
        .borrow(usdc.address, toBorrow, RateMode.Variable, 0, user1.address)
    );

    // Increase EMODE oracle price
    const oraclePrice = await oracle.getAssetPrice(EMODE_ORACLE_ADDRESS);

    const userGlobalDataBefore = await pool.getUserAccountData(user1.address);
    expect(userGlobalDataBefore.healthFactor).to.be.gt(utils.parseUnits('1', 18));

    await oracle.setAssetPrice(EMODE_ORACLE_ADDRESS, oraclePrice.mul(2));

    const userGlobalDataAfter = await pool.getUserAccountData(user1.address);
    expect(userGlobalDataAfter.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);

    const balanceBefore = await aDai.balanceOf(user1.address);

    // Liquidate
    await pool
      .connect(user2.signer)
      .liquidationCall(dai.address, usdc.address, user1.address, toBorrow.div(2), false);

    const balanceAfter = await aDai.balanceOf(user1.address);

    const debtPrice = await oracle.getAssetPrice(EMODE_ORACLE_ADDRESS);
    const collateralPrice = await oracle.getAssetPrice(EMODE_ORACLE_ADDRESS);

    const expectedCollateralLiquidated = debtPrice
      .mul(toBorrow.div(2))
      .percentMul(CATEGORY.lb)
      .mul(BigNumber.from(10).pow(18))
      .div(collateralPrice.mul(BigNumber.from(10).pow(6)));

    const collateralLiquidated = balanceBefore.sub(balanceAfter);

    expect(collateralLiquidated).to.be.closeTo(expectedCollateralLiquidated, 2);
  });

  it('Liquidation of non-eMode collateral with eMode debt in eMode with custom price feed', async () => {
    await evmRevert(snap);
    snap = await evmSnapshot();

    const {
      helpersContract,
      oracle,
      configurator,
      pool,
      poolAdmin,
      dai,
      usdc,
      weth,
      aWETH,
      users: [user1, user2],
    } = testEnv;

    // We need an extra oracle for prices. USe user address as asset in price oracle
    const EMODE_ORACLE_ADDRESS = user1.address;
    await oracle.setAssetPrice(EMODE_ORACLE_ADDRESS, utils.parseUnits('1', 8));
    await oracle.setAssetPrice(dai.address, utils.parseUnits('0.99', 8));
    await oracle.setAssetPrice(usdc.address, utils.parseUnits('1.01', 8));
    await oracle.setAssetPrice(weth.address, utils.parseUnits('4000', 8));

    // Create category
    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory(
          1,
          CATEGORY.ltv,
          CATEGORY.lt,
          CATEGORY.lb,
          EMODE_ORACLE_ADDRESS,
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
      EMODE_ORACLE_ADDRESS,
      'invalid eMode category price source'
    );

    // Add Dai and USDC to category
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, CATEGORY.id);
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(dai.address)).to.be.eq(CATEGORY.id);
    expect(await helpersContract.getReserveEModeCategory(usdc.address)).to.be.eq(CATEGORY.id);

    // User 1 supply 1 dai + 1 eth, user 2 supply 10000 usdc
    const wethSupplyAmount = utils.parseUnits('1', 18);
    const daiSupplyAmount = utils.parseUnits('1', 18);
    const usdcSupplyAmount = utils.parseUnits('10000', 6);

    expect(await dai.connect(user1.signer)['mint(uint256)'](daiSupplyAmount));
    expect(await weth.connect(user1.signer)['mint(uint256)'](wethSupplyAmount));
    expect(await usdc.connect(user2.signer)['mint(uint256)'](usdcSupplyAmount.mul(2)));

    expect(await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(await pool.connect(user1.signer).supply(dai.address, daiSupplyAmount, user1.address, 0));
    expect(
      await pool.connect(user1.signer).supply(weth.address, wethSupplyAmount, user1.address, 0)
    );
    expect(
      await pool.connect(user2.signer).supply(usdc.address, usdcSupplyAmount, user2.address, 0)
    );

    // Activate emode
    expect(await pool.connect(user1.signer).setUserEMode(CATEGORY.id));

    // Borrow a as much usdc as possible
    const userData = await pool.getUserAccountData(user1.address);
    const toBorrow = userData.availableBorrowsBase.div(100);

    expect(
      await pool
        .connect(user1.signer)
        .borrow(usdc.address, toBorrow, RateMode.Variable, 0, user1.address)
    );

    // Drop weth price
    const oraclePrice = await oracle.getAssetPrice(EMODE_ORACLE_ADDRESS);

    const userGlobalDataBefore = await pool.getUserAccountData(user1.address);
    expect(userGlobalDataBefore.healthFactor).to.be.gt(utils.parseUnits('1', 18));

    await oracle.setAssetPrice(EMODE_ORACLE_ADDRESS, oraclePrice.mul(2));

    const userGlobalDataAfter = await pool.getUserAccountData(user1.address);
    expect(userGlobalDataAfter.healthFactor).to.be.lt(utils.parseUnits('1', 18), INVALID_HF);

    const balanceBefore = await aWETH.balanceOf(user1.address);

    // Liquidate
    await pool
      .connect(user2.signer)
      .liquidationCall(weth.address, usdc.address, user1.address, toBorrow.div(2), false);

    const balanceAfter = await aWETH.balanceOf(user1.address);

    const debtPrice = await oracle.getAssetPrice(EMODE_ORACLE_ADDRESS);
    const collateralPrice = await oracle.getAssetPrice(weth.address);

    const wethConfig = await helpersContract.getReserveConfigurationData(weth.address);

    const expectedCollateralLiquidated = debtPrice
      .mul(toBorrow.div(2))
      .percentMul(wethConfig.liquidationBonus)
      .mul(BigNumber.from(10).pow(18))
      .div(collateralPrice.mul(BigNumber.from(10).pow(6)));

    const collateralLiquidated = balanceBefore.sub(balanceAfter);
    expect(collateralLiquidated).to.be.closeTo(expectedCollateralLiquidated, 2);
  });
});
