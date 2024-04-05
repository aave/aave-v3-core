import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { RateMode } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';

import './helpers/utils/wadraymath';
import {
  evmSnapshot,
  evmRevert,
  waitForTx,
  AToken__factory,
  StableDebtToken__factory,
  VariableDebtToken__factory,
} from '@aave/deploy-v3';

makeSuite('Pool Liquidation: Edge cases', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  before(async () => {
    const { addressesProvider, oracle } = testEnv;

    await waitForTx(await addressesProvider.setPriceOracle(oracle.address));
  });

  after(async () => {
    const { aaveOracle, addressesProvider } = testEnv;
    await waitForTx(await addressesProvider.setPriceOracle(aaveOracle.address));
  });

  it('ValidationLogic `executeLiquidationCall` where user has variable and stable debt, but variable debt is insufficient to cover the full liquidation amount', async () => {
    const { pool, users, dai, weth, oracle } = testEnv;

    const depositor = users[0];
    const borrower = users[1];

    // Deposit dai
    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000000'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '10000'),
        depositor.address,
        0
      );

    // Deposit eth, borrow dai
    await weth
      .connect(borrower.signer)
      ['mint(address,uint256)'](borrower.address, utils.parseEther('0.9'));
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(weth.address, utils.parseEther('0.9'), borrower.address, 0);

    const daiPrice = await oracle.getAssetPrice(dai.address);

    await oracle.setAssetPrice(dai.address, daiPrice.percentDiv('2700'));

    // Borrow
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '500'),
        RateMode.Stable,
        0,
        borrower.address
      );

    // Borrow
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '220'),
        RateMode.Variable,
        0,
        borrower.address
      );

    await oracle.setAssetPrice(dai.address, daiPrice.percentMul(600_00));

    expect(
      await pool
        .connect(depositor.signer)
        .liquidationCall(weth.address, dai.address, borrower.address, MAX_UINT_AMOUNT, false)
    );
  });

  it('Liquidation repay asset completely, asset should not be set as borrowed anymore', async () => {
    const { pool, users, dai, usdc, weth, oracle } = testEnv;

    const depositor = users[0];
    const borrower = users[1];

    // Deposit dai
    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000000'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '10000'),
        depositor.address,
        0
      );

    // Deposit usdc
    await usdc
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '1000'));
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, '1000'),
        depositor.address,
        0
      );

    // Deposit eth, borrow dai
    await weth
      .connect(borrower.signer)
      ['mint(address,uint256)'](borrower.address, utils.parseEther('0.9'));
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(weth.address, utils.parseEther('0.9'), borrower.address, 0);

    // Borrow usdc
    await pool
      .connect(borrower.signer)
      .borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, '1000'),
        RateMode.Variable,
        0,
        borrower.address
      );

    // Borrow dai stable
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '100'),
        RateMode.Stable,
        0,
        borrower.address
      );

    // Borrow dai variable
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '100'),
        RateMode.Variable,
        0,
        borrower.address
      );

    // Increase usdc price to allow liquidation
    const usdcPrice = await oracle.getAssetPrice(usdc.address);
    await oracle.setAssetPrice(usdc.address, usdcPrice.mul(10));

    const daiData = await pool.getReserveData(dai.address);
    const variableDebtToken = VariableDebtToken__factory.connect(
      daiData.variableDebtTokenAddress,
      depositor.signer
    );
    const stableDebtToken = StableDebtToken__factory.connect(
      daiData.stableDebtTokenAddress,
      depositor.signer
    );

    expect(await variableDebtToken.balanceOf(borrower.address)).to.be.gt(0);
    expect(await stableDebtToken.balanceOf(borrower.address)).to.be.gt(0);

    const userConfigBefore = BigNumber.from(
      (await pool.getUserConfiguration(borrower.address)).data
    );

    expect(
      await pool
        .connect(depositor.signer)
        .liquidationCall(weth.address, dai.address, borrower.address, MAX_UINT_AMOUNT, false)
    );

    const userConfigAfter = BigNumber.from(
      (await pool.getUserConfiguration(borrower.address)).data
    );

    const isBorrowing = (conf, id) =>
      conf
        .div(BigNumber.from(2).pow(BigNumber.from(id).mul(2)))
        .and(1)
        .gt(0);

    expect(await variableDebtToken.balanceOf(borrower.address)).to.be.eq(0);
    expect(await stableDebtToken.balanceOf(borrower.address)).to.be.eq(0);

    expect(isBorrowing(userConfigBefore, daiData.id)).to.be.true;
    expect(isBorrowing(userConfigAfter, daiData.id)).to.be.false;
  });

  it('Liquidate the whole WETH collateral with 10% liquidation fee, asset should not be set as collateralized anymore', async () => {
    const { pool, users, dai, usdc, weth, aWETH, oracle, configurator } = testEnv;

    await configurator.setLiquidationProtocolFee(weth.address, '1000'); // 10%

    const depositor = users[0];
    const borrower = users[1];

    // Deposit dai
    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000000'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '10000'),
        depositor.address,
        0
      );

    // Deposit usdc
    await usdc
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '1000000'));
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, '1000'),
        depositor.address,
        0
      );

    // Deposit eth, borrow dai
    await weth
      .connect(borrower.signer)
      ['mint(address,uint256)'](borrower.address, utils.parseEther('0.9'));
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(weth.address, utils.parseEther('0.9'), borrower.address, 0);

    // Borrow usdc
    await pool
      .connect(borrower.signer)
      .borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, '1000'),
        RateMode.Variable,
        0,
        borrower.address
      );

    // Borrow dai stable
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '100'),
        RateMode.Stable,
        0,
        borrower.address
      );

    // Borrow dai variable
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '100'),
        RateMode.Variable,
        0,
        borrower.address
      );

    // HF = (0.9 * 0.85) / (1000 * 0.0005 + 100 * 0.0005 + 100 * 0.0005) = 1.275

    // Increase usdc price to allow liquidation
    const usdcPrice = await oracle.getAssetPrice(usdc.address);
    await oracle.setAssetPrice(usdc.address, usdcPrice.mul(10));

    // HF = (0.9 * 0.85) / (1000 * 0.005 + 100 * 0.0005 + 100 * 0.0005) = 0.15
    //
    // close factor = 1
    // $WETH_collateral = 0.9
    // $USDC_debt = 1000 * 0.005 = 5

    const wethData = await pool.getReserveData(weth.address);
    const aWETHToken = AToken__factory.connect(wethData.aTokenAddress, depositor.signer);

    expect(await aWETHToken.balanceOf(borrower.address)).to.be.gt(0);

    const userConfigBefore = BigNumber.from(
      (await pool.getUserConfiguration(borrower.address)).data
    );

    expect(await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool
        .connect(depositor.signer)
        .liquidationCall(weth.address, usdc.address, borrower.address, MAX_UINT_AMOUNT, false)
    );

    const userConfigAfter = BigNumber.from(
      (await pool.getUserConfiguration(borrower.address)).data
    );

    const isUsingAsCollateral = (conf, id) =>
      conf
        .div(BigNumber.from(2).pow(BigNumber.from(id).mul(2).add(1)))
        .and(1)
        .gt(0);

    expect(await aWETHToken.balanceOf(borrower.address)).to.be.eq(0);

    expect(isUsingAsCollateral(userConfigBefore, wethData.id)).to.be.true;
    expect(isUsingAsCollateral(userConfigAfter, wethData.id)).to.be.false;
  });
});
