import { expect } from 'chai';
import { BigNumber, ethers } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { MockFlashLoanReceiver } from '../types/MockFlashLoanReceiver';
import { ProtocolErrors } from '../helpers/types';
import {
  getMockFlashLoanReceiver,
  getStableDebtToken,
  getVariableDebtToken,
} from '@aave/deploy-v3/dist/helpers/contract-getters';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';

makeSuite('Pool: FlashLoan for gas comparison', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  const { ERC20_TRANSFER_AMOUNT_EXCEEDS_BALANCE, INVALID_FLASHLOAN_EXECUTOR_RETURN } =
    ProtocolErrors;

  const TOTAL_PREMIUM = 9;
  const PREMIUM_TO_PROTOCOL = 3000;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('Configurator sets total premium = 9 bps, premium to protocol = 30%', async () => {
    const { configurator, pool } = testEnv;
    await configurator.updateFlashloanPremiumTotal(TOTAL_PREMIUM);
    await configurator.updateFlashloanPremiumToProtocol(PREMIUM_TO_PROTOCOL);

    expect(await pool.FLASHLOAN_PREMIUM_TOTAL()).to.be.equal(TOTAL_PREMIUM);
    expect(await pool.FLASHLOAN_PREMIUM_TO_PROTOCOL()).to.be.equal(PREMIUM_TO_PROTOCOL);
  });
  it('Deposits WETH into the reserve', async () => {
    const { pool, weth, aave, dai } = testEnv;
    const userAddress = await pool.signer.getAddress();
    const amountToDeposit = ethers.utils.parseEther('1');

    await weth['mint(uint256)'](amountToDeposit);

    await weth.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');

    await aave['mint(uint256)'](amountToDeposit);

    await aave.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(aave.address, amountToDeposit, userAddress, '0');
    await dai['mint(uint256)'](amountToDeposit);

    await dai.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(dai.address, amountToDeposit, userAddress, '0');
  });

  it('Takes WETH flash loan with mode = 0, returns the funds correctly', async () => {
    const { pool, helpersContract, weth, aWETH, dai, aDai } = testEnv;

    const wethFlashBorrowedAmount = ethers.utils.parseEther('0.8');
    const wethTotalFees = wethFlashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const wethFeesToProtocol = wethTotalFees.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const wethFeesToLp = wethTotalFees.sub(wethFeesToProtocol);

    const wethLiquidityIndexAdded = wethFeesToLp
      .mul(BigNumber.from(10).pow(27))
      .div(await aWETH.totalSupply());

    let wethReserveData = await helpersContract.getReserveData(weth.address);

    const wethLiquidityIndexBefore = wethReserveData.liquidityIndex;

    const wethTotalLiquidityBefore = wethReserveData.totalAToken;

    const wethReservesBefore = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [wethFlashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.mintToTreasury([weth.address, dai.address]);

    wethReserveData = await helpersContract.getReserveData(weth.address);

    const wethCurrentLiquidityRate = wethReserveData.liquidityRate;
    const wethCurrentLiquidityIndex = wethReserveData.liquidityIndex;

    const wethTotalLiquidityAfter = wethReserveData.totalAToken;

    const wethReservesAfter = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());

    expect(wethTotalLiquidityBefore.add(wethTotalFees)).to.be.closeTo(wethTotalLiquidityAfter, 2);
    expect(wethCurrentLiquidityRate).to.be.equal(0);
    expect(wethCurrentLiquidityIndex).to.be.equal(
      wethLiquidityIndexBefore.add(wethLiquidityIndexAdded)
    );
    expect(wethReservesAfter).to.be.equal(wethReservesBefore.add(wethFeesToProtocol));
  });

  it('Takes an ETH flashloan with mode = 0 as big as the available liquidity', async () => {
    const { pool, helpersContract, weth, aWETH } = testEnv;

    let reserveData = await helpersContract.getReserveData(weth.address);

    const totalLiquidityBefore = reserveData.totalAToken;

    const flashBorrowedAmount = totalLiquidityBefore;

    const totalFees = flashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const feesToProtocol = totalFees.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const feesToLp = totalFees.sub(feesToProtocol);
    const liquidityIndexBefore = reserveData.liquidityIndex;
    const liquidityIndexAdded = feesToLp
      .mul(BigNumber.from(10).pow(27))
      .div((await aWETH.totalSupply()).toString())
      .mul(liquidityIndexBefore)
      .div(BigNumber.from(10).pow(27));

    const reservesBefore = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());

    const txResult = await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [flashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.mintToTreasury([weth.address]);

    reserveData = await helpersContract.getReserveData(weth.address);

    const currentLiquidityRate = reserveData.liquidityRate;
    const currentLiquidityIndex = reserveData.liquidityIndex;

    const totalLiquidityAfter = reserveData.totalAToken;

    const reservesAfter = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());
    expect(totalLiquidityBefore.add(totalFees)).to.be.closeTo(totalLiquidityAfter, 2);
    expect(currentLiquidityRate).to.be.equal(0);
    expect(currentLiquidityIndex).to.be.equal(liquidityIndexBefore.add(liquidityIndexAdded));
    expect(
      reservesAfter.sub(feesToProtocol).mul(liquidityIndexBefore).div(currentLiquidityIndex)
    ).to.be.closeTo(reservesBefore, 2);
  });
  it('Takes WETH flashloan, does not return the funds with mode = 0 (revert expected)', async () => {
    const { pool, weth, users } = testEnv;
    const caller = users[1];
    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [ethers.utils.parseEther('0.8')],
          [0],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.reverted;
  });

  it('Takes WETH flashloan, simulating a receiver as EOA (revert expected)', async () => {
    const { pool, weth, users } = testEnv;
    const caller = users[1];
    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);
    await _mockFlashLoanReceiver.setSimulateEOA(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [ethers.utils.parseEther('0.8')],
          [0],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(INVALID_FLASHLOAN_EXECUTOR_RETURN);
  });

  it('Tries to take a flashloan that is bigger than the available liquidity (revert expected)', async () => {
    const { pool, weth, users } = testEnv;
    const caller = users[1];

    await expect(
      pool.connect(caller.signer).flashLoan(
        _mockFlashLoanReceiver.address,
        [weth.address],
        ['1004415000000000000'], //slightly higher than the available liquidity
        [2],
        caller.address,
        '0x10',
        '0'
      ),
      ERC20_TRANSFER_AMOUNT_EXCEEDS_BALANCE
    ).to.be.reverted;
  });

  it('Tries to take a flashloan using a non contract address as receiver (revert expected)', async () => {
    const { pool, deployer, weth, users } = testEnv;
    const caller = users[1];

    await expect(
      pool.flashLoan(
        deployer.address,
        [weth.address],
        ['1000000000000000000'],
        [2],
        caller.address,
        '0x10',
        '0'
      )
    ).to.be.reverted;
  });

  it('Deposits USDC into the reserve', async () => {
    const { usdc, pool } = testEnv;
    const userAddress = await pool.signer.getAddress();

    await usdc['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '1000'));

    await usdc.approve(pool.address, MAX_UINT_AMOUNT);

    const amountToDeposit = await convertToCurrencyDecimals(usdc.address, '1000');

    await pool.deposit(usdc.address, amountToDeposit, userAddress, '0');
  });

  it('Takes out a 500 USDC flashloan, returns the funds correctly', async () => {
    const { usdc, aUsdc, pool, helpersContract, deployer: depositor } = testEnv;

    await _mockFlashLoanReceiver.setFailExecutionTransfer(false);

    const flashBorrowedAmount = await convertToCurrencyDecimals(usdc.address, '500');
    const totalFees = flashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const feesToProtocol = totalFees.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const feesToLp = totalFees.sub(feesToProtocol);
    const liquidityIndexAdded = feesToLp
      .mul(ethers.BigNumber.from(10).pow(27))
      .div(await aUsdc.totalSupply());

    let reserveData = await helpersContract.getReserveData(usdc.address);

    const liquidityIndexBefore = reserveData.liquidityIndex;

    const totalLiquidityBefore = reserveData.totalAToken;

    const reservesBefore = await aUsdc.balanceOf(await aUsdc.RESERVE_TREASURY_ADDRESS());

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [usdc.address],
      [flashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.mintToTreasury([usdc.address]);

    reserveData = await helpersContract.getReserveData(usdc.address);

    const currentLiquidityRate = reserveData.liquidityRate;
    const currentLiquidityIndex = reserveData.liquidityIndex;

    const totalLiquidityAfter = reserveData.totalAToken;

    const reservesAfter = await aUsdc.balanceOf(await aUsdc.RESERVE_TREASURY_ADDRESS());

    expect(totalLiquidityBefore.add(totalFees)).to.be.closeTo(totalLiquidityAfter, 2);
    expect(currentLiquidityRate).to.be.equal(0);
    expect(currentLiquidityIndex).to.be.equal(liquidityIndexBefore.add(liquidityIndexAdded));
    expect(reservesAfter).to.be.equal(reservesBefore.add(feesToProtocol));
  });

  it('Takes out a 500 USDC flashloan with mode = 0, does not return the funds (revert expected)', async () => {
    const { usdc, pool, users } = testEnv;
    const caller = users[2];

    const flashloanAmount = await convertToCurrencyDecimals(usdc.address, '500');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [usdc.address],
          [flashloanAmount],
          [2],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(INVALID_FLASHLOAN_EXECUTOR_RETURN);
  });

  it('Caller deposits 1000 DAI as collateral, Takes a WETH flashloan with mode = 0, does not approve the transfer of the funds', async () => {
    const { dai, pool, weth, users } = testEnv;
    const caller = users[3];

    await dai
      .connect(caller.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));

    await dai.connect(caller.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const amountToDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await pool.connect(caller.signer).deposit(dai.address, amountToDeposit, caller.address, '0');

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(false);
    await _mockFlashLoanReceiver.setAmountToApprove(flashAmount.div(2));

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [0],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.reverted;
  });
});
