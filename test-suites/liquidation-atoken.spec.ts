import { MockATokenRepayment__factory } from './../types/factories/mocks/tokens/MockATokenRepayment__factory';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { MAX_UINT_AMOUNT, oneEther } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { calcExpectedVariableDebtTokenBalance } from './helpers/utils/calculations';
import { getUserData, getReserveData } from './helpers/utils/helpers';
import { makeSuite } from './helpers/make-suite';
import { waitForTx } from '@aave/deploy-v3';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool Liquidation: Liquidator receiving aToken', (testEnv) => {
  const {
    HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
    INVALID_HF,
    SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER,
    COLLATERAL_CANNOT_BE_LIQUIDATED,
  } = ProtocolErrors;

  let oracleBaseDecimals: number;

  before(async () => {
    const { aaveOracle, addressesProvider, oracle, deployer, pool, configurator, aDai, dai } =
      testEnv;
    oracleBaseDecimals = (await (await aaveOracle.BASE_CURRENCY_UNIT()).toString().length) - 1;

    await waitForTx(await addressesProvider.setPriceOracle(oracle.address));

    const aTokenRepayImpl = await new MockATokenRepayment__factory(deployer.signer).deploy(
      pool.address
    );

    await configurator.updateAToken({
      asset: dai.address,
      treasury: await aDai.RESERVE_TREASURY_ADDRESS(),
      incentivesController: await aDai.getIncentivesController(),
      name: await aDai.name(),
      symbol: await aDai.symbol(),
      implementation: aTokenRepayImpl.address,
      params: '0x',
    });
  });

  after(async () => {
    const { aaveOracle, addressesProvider } = testEnv;
    await waitForTx(await addressesProvider.setPriceOracle(aaveOracle.address));
  });

  it('Deposits WETH, borrows DAI/Check liquidation fails because health factor is above 1', async () => {
    const {
      dai,
      weth,
      users: [depositor, borrower],
      pool,
      oracle,
    } = testEnv;

    //mints DAI to depositor
    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));

    //approve protocol to access depositor wallet
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 1 deposits DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');
    await pool
      .connect(depositor.signer)
      .deposit(dai.address, amountDAItoDeposit, depositor.address, '0');

    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '0.3');

    //mints WETH to borrower
    await weth.connect(borrower.signer)['mint(uint256)'](amountETHtoDeposit);

    //approve protocol to access borrower wallet
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 2 deposits WETH
    await pool
      .connect(borrower.signer)
      .deposit(weth.address, amountETHtoDeposit, borrower.address, '0');

    //user 2 borrows
    const userGlobalData = await pool.getUserAccountData(borrower.address);
    const daiPrice = await oracle.getAssetPrice(dai.address);
    const amountDAIToBorrow = await convertToCurrencyDecimals(
      dai.address,
      userGlobalData.availableBorrowsBase.div(daiPrice.toString()).percentMul(9500).toString()
    );
    await pool
      .connect(borrower.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, '0', borrower.address);

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    expect(userGlobalDataAfter.currentLiquidationThreshold).to.be.equal(
      8250,
      'Invalid liquidation threshold'
    );

    //someone tries to liquidate user 2
    await expect(
      pool.liquidationCall(weth.address, dai.address, borrower.address, 1, true)
    ).to.be.revertedWith(HEALTH_FACTOR_NOT_BELOW_THRESHOLD);
  });

  it('Drop the health factor below 1', async () => {
    const {
      dai,
      users: [, borrower],
      pool,
      oracle,
      aaveOracle,
    } = testEnv;

    const daiPrice = await oracle.getAssetPrice(dai.address);

    await oracle.setAssetPrice(dai.address, daiPrice.percentMul(11500));

    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor).to.be.lt(oneEther, INVALID_HF);
  });

  it('Tries to liquidate a different currency than the loan principal (revert expected)', async () => {
    const {
      pool,
      users: [, borrower],
      weth,
    } = testEnv;
    //user 2 tries to borrow
    await expect(
      pool.liquidationCall(weth.address, weth.address, borrower.address, oneEther, true)
    ).to.be.revertedWith(SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER);
  });

  it('Tries to liquidate a different collateral than the borrower collateral (revert expected)', async () => {
    const {
      pool,
      dai,
      users: [, borrower],
    } = testEnv;

    await expect(
      pool.liquidationCall(dai.address, dai.address, borrower.address, oneEther, true)
    ).to.be.revertedWith(COLLATERAL_CANNOT_BE_LIQUIDATED);
  });

  it('Liquidates the borrow', async () => {
    const {
      pool,
      dai,
      aDai,
      weth,
      users: [, borrower],
      oracle,
      helpersContract,
      deployer,
    } = testEnv;

    //mints dai to the caller

    await dai['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));

    //approve protocol to access depositor wallet
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

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    const daiReserveDataAfter = await getReserveData(helpersContract, dai.address);
    const ethReserveDataAfter = await getReserveData(helpersContract, weth.address);

    const collateralPrice = await oracle.getAssetPrice(weth.address);
    const principalPrice = await oracle.getAssetPrice(dai.address);

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

    expect(userGlobalDataAfter.healthFactor).to.be.gt(oneEther, 'Invalid health factor');

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

    expect(ethReserveDataAfter.availableLiquidity).to.be.closeTo(
      ethReserveDataBefore.availableLiquidity,
      2,
      'Invalid collateral available liquidity'
    );

    expect(daiReserveDataAfter.totalLiquidity).to.be.closeTo(
      daiReserveDataBefore.totalLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal total liquidity'
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

    // We need the scaled balances here
    expect(ethReserveDataAfter.totalLiquidity).to.be.closeTo(
      ethReserveDataBefore.totalLiquidity,
      2,
      'Invalid collateral total liquidity'
    );

    expect(
      (await helpersContract.getUserReserveData(weth.address, deployer.address))
        .usageAsCollateralEnabled
    ).to.be.true;

    // check handleRepayment function is correctly called
    await expect(tx)
      .to.emit(MockATokenRepayment__factory.connect(aDai.address, borrower.signer), 'MockRepayment')
      .withArgs(deployer.address, borrower.address, amountToLiquidate);
  });

  it('User 3 deposits 2000 USDC, user 4 0.12 WETH, user 4 borrows - drops HF, liquidates the borrow', async () => {
    const {
      users: [, , , depositor, borrower],
      pool,
      usdc,
      oracle,
      weth,
      helpersContract,
    } = testEnv;

    //mints USDC to depositor
    await usdc
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '2000'));

    //approve protocol to access depositor wallet
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 3 deposits 1000 USDC
    const amountUSDCtoDeposit = await convertToCurrencyDecimals(usdc.address, '2000');

    await pool
      .connect(depositor.signer)
      .deposit(usdc.address, amountUSDCtoDeposit, depositor.address, '0');

    //user 4 deposits ETH
    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '0.12');

    //mints WETH to borrower
    await weth.connect(borrower.signer)['mint(uint256)'](amountETHtoDeposit);

    //approve protocol to access borrower wallet
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(borrower.signer)
      .deposit(weth.address, amountETHtoDeposit, borrower.address, '0');

    //user 4 borrows
    const userGlobalData = await pool.getUserAccountData(borrower.address);

    const usdcPrice = await oracle.getAssetPrice(usdc.address);

    const amountUSDCToBorrow = await convertToCurrencyDecimals(
      usdc.address,
      userGlobalData.availableBorrowsBase.div(usdcPrice).percentMul(9502).toString()
    );

    await pool
      .connect(borrower.signer)
      .borrow(usdc.address, amountUSDCToBorrow, RateMode.Stable, '0', borrower.address);

    //drops HF below 1

    await oracle.setAssetPrice(usdc.address, usdcPrice.percentMul(11200));

    //mints dai to the liquidator

    await usdc['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '1000'));

    //approve protocol to access depositor wallet
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      usdc.address,
      borrower.address
    );

    const usdcReserveDataBefore = await getReserveData(helpersContract, usdc.address);
    const ethReserveDataBefore = await getReserveData(helpersContract, weth.address);
    const userWethReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      weth.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentStableDebt.div(2);

    await pool.liquidationCall(
      weth.address,
      usdc.address,
      borrower.address,
      amountToLiquidate,
      true
    );

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      usdc.address,
      borrower.address
    );

    const userWethReserveDataAfter = await helpersContract.getUserReserveData(
      weth.address,
      borrower.address
    );

    const userGlobalDataAfter = await pool.getUserAccountData(borrower.address);

    const usdcReserveDataAfter = await getReserveData(helpersContract, usdc.address);
    const ethReserveDataAfter = await getReserveData(helpersContract, weth.address);

    const collateralPrice = await oracle.getAssetPrice(weth.address);
    const principalPrice = await oracle.getAssetPrice(usdc.address);

    const collateralDecimals = (await helpersContract.getReserveConfigurationData(weth.address))
      .decimals;
    const principalDecimals = (await helpersContract.getReserveConfigurationData(usdc.address))
      .decimals;

    const expectedCollateralLiquidated = principalPrice
      .mul(amountToLiquidate)
      .percentMul(10500)
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(principalDecimals)));

    expect(expectedCollateralLiquidated).to.be.eq(
      userWethReserveDataBefore.currentATokenBalance.sub(
        userWethReserveDataAfter.currentATokenBalance
      ),
      'Invalid collateral amount liquidated'
    );

    expect(userGlobalDataAfter.healthFactor).to.be.gt(oneEther, 'Invalid health factor');

    expect(userReserveDataAfter.currentStableDebt).to.be.closeTo(
      userReserveDataBefore.currentStableDebt.sub(amountToLiquidate),
      2,
      'Invalid user borrow balance after liquidation'
    );

    expect(usdcReserveDataAfter.availableLiquidity).to.be.closeTo(
      usdcReserveDataBefore.availableLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal available liquidity'
    );

    expect(usdcReserveDataAfter.totalLiquidity).to.be.closeTo(
      usdcReserveDataBefore.totalLiquidity.add(amountToLiquidate),
      2,
      'Invalid principal total liquidity'
    );

    //the liquidity index of the principal reserve needs to be bigger than the index before
    expect(usdcReserveDataAfter.liquidityIndex).to.be.gte(
      usdcReserveDataBefore.liquidityIndex,
      'Invalid liquidity index'
    );

    //the principal APY after a liquidation needs to be lower than the APY before
    expect(usdcReserveDataAfter.liquidityRate).to.be.lt(
      usdcReserveDataBefore.liquidityRate,
      'Invalid liquidity APY'
    );

    expect(ethReserveDataAfter.availableLiquidity).to.be.closeTo(
      ethReserveDataBefore.availableLiquidity,
      2,
      'Invalid collateral available liquidity'
    );

    expect(ethReserveDataAfter.totalLiquidity).to.be.closeTo(
      ethReserveDataBefore.totalLiquidity,
      2,
      'Invalid collateral total liquidity'
    );
  });
});
