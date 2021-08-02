import BigNumber from 'bignumber.js';

import { TestEnv, makeSuite } from './helpers/make-suite';
import { APPROVAL_AMOUNT_POOL, oneRay } from '../../helpers/constants';
import { convertToCurrencyDecimals, getContract } from '../../helpers/contracts-helpers';
import { ethers } from 'ethers';
import { MockFlashLoanReceiver } from '../../types/MockFlashLoanReceiver';
import { ProtocolErrors, eContractid } from '../../helpers/types';
import { VariableDebtToken } from '../../types/VariableDebtToken';
import { StableDebtToken } from '../../types/StableDebtToken';
import {
  getMockFlashLoanReceiver,
  getStableDebtToken,
  getVariableDebtToken,
} from '../../helpers/contracts-getters';

const { expect } = require('chai');

makeSuite('Pool FlashLoan function', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;
  const {
    VL_COLLATERAL_BALANCE_IS_0,
    TRANSFER_AMOUNT_EXCEEDS_BALANCE,
    P_INVALID_FLASHLOAN_MODE,
    VL_STABLE_BORROWING_NOT_ENABLED,
    SAFEERC20_LOWLEVEL_CALL,
    P_INVALID_FLASH_LOAN_EXECUTOR_RETURN,
    LP_BORROW_ALLOWANCE_NOT_ENOUGH,
  } = ProtocolErrors;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('Deposits WETH into the reserve', async () => {
    const { pool, weth } = testEnv;
    const userAddress = await pool.signer.getAddress();
    const amountToDeposit = ethers.utils.parseEther('1');

    await weth.mint(amountToDeposit);

    await weth.approve(pool.address, APPROVAL_AMOUNT_POOL);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');
  });

  it('Takes WETH flashloan with mode = 0, returns the funds correctly', async () => {
    const { pool, helpersContract, weth } = testEnv;

    const borrowedAmount = ethers.utils.parseEther('0.8');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [borrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    ethers.utils.parseUnits('10000');

    const reserveData = await helpersContract.getReserveData(weth.address);

    const currentLiquidityRate = reserveData.liquidityRate;
    const currentLiquidityIndex = reserveData.liquidityIndex;

    const totalLiquidity = new BigNumber(reserveData.availableLiquidity.toString())
      .plus(reserveData.totalStableDebt.toString())
      .plus(reserveData.totalVariableDebt.toString());

    expect(totalLiquidity.toString()).to.be.equal('1000720000000000000');
    expect(currentLiquidityRate.toString()).to.be.equal('0');
    expect(currentLiquidityIndex.toString()).to.be.equal('1000720000000000000000000000');
  });

  it('Takes an ETH flashloan with mode = 0 as big as the available liquidity', async () => {
    const { pool, helpersContract, weth } = testEnv;

    const reserveDataBefore = await helpersContract.getReserveData(weth.address);
    const txResult = await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      ['1000720000000000000'],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    const reserveData = await helpersContract.getReserveData(weth.address);

    const currentLiqudityRate = reserveData.liquidityRate;
    const currentLiquidityIndex = reserveData.liquidityIndex;

    const totalLiquidity = new BigNumber(reserveData.availableLiquidity.toString())
      .plus(reserveData.totalStableDebt.toString())
      .plus(reserveData.totalVariableDebt.toString());

    expect(totalLiquidity.toString()).to.be.equal('1001620648000000000');
    expect(currentLiqudityRate.toString()).to.be.equal('0');
    expect(currentLiquidityIndex.toString()).to.be.equal('1001620648000000000000000000');
  });

  it('Takes WETH flashloan, does not return the funds with mode = 0. (revert expected)', async () => {
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
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
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
    ).to.be.revertedWith(P_INVALID_FLASH_LOAN_EXECUTOR_RETURN);
  });

  it('Takes a WETH flashloan with an invalid mode. (revert expected)', async () => {
    const { pool, weth, users } = testEnv;
    const caller = users[1];
    await _mockFlashLoanReceiver.setSimulateEOA(false);
    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [ethers.utils.parseEther('0.8')],
          [4],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.reverted;
  });

  it('Caller deposits 1000 DAI as collateral, Takes WETH flashloan with mode = 2, does not return the funds. A variable loan for caller is created', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[1];

    await dai.connect(caller.signer).mint(await convertToCurrencyDecimals(dai.address, '1000'));

    await dai.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await pool.connect(caller.signer).deposit(dai.address, amountToDeposit, caller.address, '0');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [weth.address],
        [ethers.utils.parseEther('0.8')],
        [2],
        caller.address,
        '0x10',
        '0'
      );
    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const callerDebt = await wethDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('800000000000000000', 'Invalid user debt');
  });

  it('tries to take a flashloan that is bigger than the available liquidity (revert expected)', async () => {
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
      TRANSFER_AMOUNT_EXCEEDS_BALANCE
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('tries to take a flashloan using a non contract address as receiver (revert expected)', async () => {
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

    await usdc.mint(await convertToCurrencyDecimals(usdc.address, '1000'));

    await usdc.approve(pool.address, APPROVAL_AMOUNT_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(usdc.address, '1000');

    await pool.deposit(usdc.address, amountToDeposit, userAddress, '0');
  });

  it('Takes out a 500 USDC flashloan, returns the funds correctly', async () => {
    const { usdc, pool, helpersContract, deployer: depositor } = testEnv;

    await _mockFlashLoanReceiver.setFailExecutionTransfer(false);

    const reserveDataBefore = await helpersContract.getReserveData(usdc.address);

    const flashloanAmount = await convertToCurrencyDecimals(usdc.address, '500');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [usdc.address],
      [flashloanAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    const reserveDataAfter = helpersContract.getReserveData(usdc.address);

    const reserveData = await helpersContract.getReserveData(usdc.address);
    const userData = await helpersContract.getUserReserveData(usdc.address, depositor.address);

    const totalLiquidity = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt)
      .toString();
    const currentLiqudityRate = reserveData.liquidityRate.toString();
    const currentLiquidityIndex = reserveData.liquidityIndex.toString();
    const currentUserBalance = userData.currentATokenBalance.toString();

    const expectedLiquidity = await convertToCurrencyDecimals(usdc.address, '1000.450');

    expect(totalLiquidity).to.be.equal(expectedLiquidity, 'Invalid total liquidity');
    expect(currentLiqudityRate).to.be.equal('0', 'Invalid liquidity rate');
    expect(currentLiquidityIndex).to.be.equal(
      new BigNumber('1.00045').multipliedBy(oneRay).toFixed(),
      'Invalid liquidity index'
    );
    expect(currentUserBalance.toString()).to.be.equal(expectedLiquidity, 'Invalid user balance');
  });

  it('Takes out a 500 USDC flashloan with mode = 0, does not return the funds. (revert expected)', async () => {
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
    ).to.be.revertedWith(VL_COLLATERAL_BALANCE_IS_0);
  });

  it('Caller deposits 5 WETH as collateral, Takes a USDC flashloan with mode = 2, does not return the funds. A loan for caller is created', async () => {
    const { usdc, pool, weth, users, helpersContract } = testEnv;

    const caller = users[2];

    await weth.connect(caller.signer).mint(await convertToCurrencyDecimals(weth.address, '5'));

    await weth.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(weth.address, '5');

    await pool.connect(caller.signer).deposit(weth.address, amountToDeposit, caller.address, '0');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    const flashloanAmount = await convertToCurrencyDecimals(usdc.address, '500');

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [usdc.address],
        [flashloanAmount],
        [2],
        caller.address,
        '0x10',
        '0'
      );
    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      usdc.address
    );

    const usdcDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const callerDebt = await usdcDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('500000000', 'Invalid user debt');
  });

  it('Caller deposits 1000 DAI as collateral, Takes a WETH flashloan with mode = 0, does not approve the transfer of the funds', async () => {
    const { dai, pool, weth, users } = testEnv;
    const caller = users[3];

    await dai.connect(caller.signer).mint(await convertToCurrencyDecimals(dai.address, '1000'));

    await dai.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

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
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('Caller takes a WETH flashloan with mode = 1, should revert since stable borrowing is disabled', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[3];

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [1],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    const callerDebt = await wethDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('0', 'Invalid user debt');
  });

  it('Caller takes a WETH flashloan with mode = 2', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[3];

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [weth.address],
        [flashAmount],
        [2],
        caller.address,
        '0x10',
        '0'
      );

    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getStableDebtToken(variableDebtTokenAddress);

    const callerDebt = await wethDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal(ethers.utils.parseEther('0.8'), 'Invalid user debt');
  });

  it('Caller takes a WETH flashloan with mode = 1 onBehalfOf user without allowance, should revert since stable borrowing is disabled', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    // Deposit 1000 dai for onBehalfOf user
    await dai.connect(onBehalfOf.signer).mint(await convertToCurrencyDecimals(dai.address, '1000'));

    await dai.connect(onBehalfOf.signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await pool
      .connect(onBehalfOf.signer)
      .deposit(dai.address, amountToDeposit, onBehalfOf.address, '0');

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [1],
          onBehalfOf.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);
  });

  it('Caller takes a WETH flashloan with mode = 2 onBehalfOf user without allowance, should revert since allowance is 0', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    // Deposit 1000 dai for onBehalfOf user
    await dai.connect(onBehalfOf.signer).mint(await convertToCurrencyDecimals(dai.address, '1000'));

    await dai.connect(onBehalfOf.signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

    const amountToDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await pool
      .connect(onBehalfOf.signer)
      .deposit(dai.address, amountToDeposit, onBehalfOf.address, '0');

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [2],
          onBehalfOf.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(LP_BORROW_ALLOWANCE_NOT_ENOUGH);
  });

  it('Caller takes a WETH flashloan with mode = 1 onBehalfOf user with allowance. Should revert since stable borrowing is disabled.', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    const flashAmount = ethers.utils.parseEther('0.8');

    const reserveData = await pool.getReserveData(weth.address);

    const stableDebtToken = await getStableDebtToken(reserveData.stableDebtTokenAddress);

    // Deposited for onBehalfOf user already, delegate borrow allowance
    await stableDebtToken.connect(onBehalfOf.signer).approveDelegation(caller.address, flashAmount);

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [1],
          onBehalfOf.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    const onBehalfOfDebt = await wethDebtToken.balanceOf(onBehalfOf.address);

    expect(onBehalfOfDebt.toString()).to.be.equal('0', 'Invalid onBehalfOf user debt');
  });

  it('Caller takes a WETH flashloan with mode = 2 onBehalfOf user with allowance. A loan for onBehalfOf is created.', async () => {
    const { dai, pool, weth, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    const flashAmount = ethers.utils.parseEther('0.8');

    const reserveData = await pool.getReserveData(weth.address);

    const variableDebtToken = await getVariableDebtToken(reserveData.variableDebtTokenAddress);

    // Deposited for onBehalfOf user already, delegate borrow allowance
    await variableDebtToken
      .connect(onBehalfOf.signer)
      .approveDelegation(caller.address, flashAmount);

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [2],
          onBehalfOf.address,
          '0x10',
          '0'
        )
    ).to.not.be.reverted;

    const { variableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getVariableDebtToken(variableDebtTokenAddress);

    const onBehalfOfDebt = await wethDebtToken.balanceOf(onBehalfOf.address);

    expect(onBehalfOfDebt.toString()).to.be.equal(
      ethers.utils.parseEther('0.8'),
      'Invalid onBehalfOf user debt'
    );
  });
});
