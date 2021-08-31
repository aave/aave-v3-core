import { expect } from 'chai';
import { BigNumber, ethers } from 'ethers';
import { APPROVAL_AMOUNT_POOL, MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { MockFlashLoanReceiver } from '../types/MockFlashLoanReceiver';
import { ProtocolErrors } from '../helpers/types';
import {
  getMockFlashLoanReceiver,
  getStableDebtToken,
  getVariableDebtToken,
} from '../helpers/contracts-getters';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('Pool: FlashLoan', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  const {
    VL_COLLATERAL_BALANCE_IS_0,
    TRANSFER_AMOUNT_EXCEEDS_BALANCE,
    SAFEERC20_LOWLEVEL_CALL,
    P_INVALID_FLASH_LOAN_EXECUTOR_RETURN,
  } = ProtocolErrors;

  const TOTAL_PREMIUM = 9;
  const PREMIUM_TO_PROTOCOL = 3;
  const PREMIUM_TO_LP = TOTAL_PREMIUM - PREMIUM_TO_PROTOCOL;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('Configurator sets total premium = 9 bps, premium to protocol = 3 bps', async () => {
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

    await weth.mint(amountToDeposit);

    await weth.approve(pool.address, APPROVAL_AMOUNT_POOL);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');

    await aave.mint(amountToDeposit);

    await aave.approve(pool.address, APPROVAL_AMOUNT_POOL);

    await pool.deposit(aave.address, amountToDeposit, userAddress, '0');
    await dai.mint(amountToDeposit);

    await dai.approve(pool.address, APPROVAL_AMOUNT_POOL);

    await pool.deposit(dai.address, amountToDeposit, userAddress, '0');
  });

  it('Takes WETH + Dai flash loan with mode = 0, returns the funds correctly', async () => {
    const { pool, helpersContract, weth, aWETH, dai, aDai } = testEnv;

    const wethFlashBorrowedAmount = ethers.utils.parseEther('0.8');
    const daiFlashBorrowedAmount = ethers.utils.parseEther('0.3');
    const wethTotalFees = wethFlashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const wethFeesToProtocol = wethFlashBorrowedAmount.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const wethFeesToLp = wethFlashBorrowedAmount.mul(PREMIUM_TO_LP).div(10000);
    const daiTotalFees = daiFlashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const daiFeesToProtocol = daiFlashBorrowedAmount.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const daiFeesToLp = daiFlashBorrowedAmount.mul(PREMIUM_TO_LP).div(10000);

    const wethLiquidityIndexAdded = wethFeesToLp
      .mul(BigNumber.from(10).pow(27))
      .div(await aWETH.totalSupply());

    const daiLiquidityIndexAdded = daiFeesToLp
      .mul(ethers.BigNumber.from(10).pow(27))
      .div(await aDai.totalSupply());

    let wethReserveData = await helpersContract.getReserveData(weth.address);
    let daiReserveData = await helpersContract.getReserveData(dai.address);

    const wethLiquidityIndexBefore = wethReserveData.liquidityIndex;
    const daiLiquidityIndexBefore = daiReserveData.liquidityIndex;

    const wethTotalLiquidityBefore = wethReserveData.availableLiquidity
      .add(wethReserveData.totalStableDebt)
      .add(wethReserveData.totalVariableDebt);

    const daiTotalLiquidityBefore = daiReserveData.availableLiquidity
      .add(daiReserveData.totalStableDebt)
      .add(daiReserveData.totalVariableDebt);

    const wethReservesBefore = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());
    const daiReservesBefore = await aDai.balanceOf(await aDai.RESERVE_TREASURY_ADDRESS());

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address, dai.address],
      [wethFlashBorrowedAmount, daiFlashBorrowedAmount],
      [0, 0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.mintToTreasury([weth.address, dai.address]);

    wethReserveData = await helpersContract.getReserveData(weth.address);
    daiReserveData = await helpersContract.getReserveData(dai.address);

    const wethCurrentLiquidityRate = wethReserveData.liquidityRate;
    const wethCurrentLiquidityIndex = wethReserveData.liquidityIndex;
    const daiCurrentLiquidityRate = daiReserveData.liquidityRate;
    const daiCurrentLiquidityIndex = daiReserveData.liquidityIndex;

    const wethTotalLiquidityAfter = wethReserveData.availableLiquidity
      .add(wethReserveData.totalStableDebt)
      .add(wethReserveData.totalVariableDebt);

    const daiTotalLiquidityAfter = daiReserveData.availableLiquidity
      .add(daiReserveData.totalStableDebt)
      .add(daiReserveData.totalVariableDebt);

    const wethReservesAfter = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());
    const daiReservesAfter = await aDai.balanceOf(await aDai.RESERVE_TREASURY_ADDRESS());

    expect(wethTotalLiquidityBefore.add(wethTotalFees)).to.be.equal(wethTotalLiquidityAfter);
    expect(wethCurrentLiquidityRate).to.be.equal(0);
    expect(wethCurrentLiquidityIndex).to.be.equal(
      wethLiquidityIndexBefore.add(wethLiquidityIndexAdded)
    );
    expect(wethReservesAfter).to.be.equal(wethReservesBefore.add(wethFeesToProtocol));

    expect(daiTotalLiquidityBefore.add(daiTotalFees)).to.be.equal(daiTotalLiquidityAfter);
    expect(daiCurrentLiquidityRate).to.be.equal(0);
    expect(daiCurrentLiquidityIndex).to.be.equal(
      daiLiquidityIndexBefore.add(daiLiquidityIndexAdded)
    );
    expect(daiReservesAfter).to.be.equal(daiReservesBefore.add(daiFeesToProtocol));
  });
  it('Takes an authorized AAVE flash loan with mode = 0, returns the funds correctly', async () => {
    const {
      pool,
      helpersContract,
      aave,
      configurator,
      users: [, , , authorizedUser],
    } = testEnv;
    await configurator.authorizeFlashBorrower(authorizedUser.address);

    const flashBorrowedAmount = ethers.utils.parseEther('0.8');
    const totalFees = BigNumber.from(0);

    let reserveData = await helpersContract.getReserveData(aave.address);

    const totalLiquidityBefore = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

    await pool
      .connect(authorizedUser.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [aave.address],
        [flashBorrowedAmount],
        [0],
        _mockFlashLoanReceiver.address,
        '0x10',
        '0'
      );

    await pool.mintToTreasury([aave.address]);

    reserveData = await helpersContract.getReserveData(aave.address);

    const totalLiquidityAfter = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

    expect(totalLiquidityBefore.add(totalFees)).to.be.equal(totalLiquidityAfter);
  });
  it('Takes an ETH flashloan with mode = 0 as big as the available liquidity', async () => {
    const { pool, helpersContract, weth, aWETH } = testEnv;

    let reserveData = await helpersContract.getReserveData(weth.address);

    const totalLiquidityBefore = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

    const flashBorrowedAmount = totalLiquidityBefore;

    const totalFees = flashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const feesToProtocol = flashBorrowedAmount.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const feesToLp = flashBorrowedAmount.mul(PREMIUM_TO_LP).div(10000);
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

    const totalLiquidityAfter = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

    const reservesAfter = await aWETH.balanceOf(await aWETH.RESERVE_TREASURY_ADDRESS());
    expect(totalLiquidityBefore.add(totalFees)).to.be.equal(totalLiquidityAfter);
    expect(currentLiquidityRate).to.be.equal(0);
    expect(currentLiquidityIndex).to.be.equal(liquidityIndexBefore.add(liquidityIndexAdded));
    expect(
      reservesAfter.sub(feesToProtocol).mul(liquidityIndexBefore).div(currentLiquidityIndex)
    ).to.be.equal(reservesBefore);
  });
  it('Takes WETH flashloan, does not return the funds with mode = 0 and reverts', async () => {
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

  it('Takes WETH flashloan, simulating a receiver as EOA and reverts', async () => {
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

  it('Takes a WETH flashloan with an invalid mode and reverts', async () => {
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

    let reserveData = await helpersContract.getReserveData(weth.address);

    let totalLiquidityBefore = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

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
    reserveData = await helpersContract.getReserveData(weth.address);

    const totalLiquidityAfter = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

    expect(totalLiquidityAfter).to.be.equal(totalLiquidityBefore);

    const wethDebtToken = await getVariableDebtToken(variableDebtTokenAddress);
    const callerDebt = await wethDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('800000000000000000', 'Invalid user debt');
    // repays debt for later, so no interest accrue
    await weth.connect(caller.signer).mint(await convertToCurrencyDecimals(weth.address, '1000'));
    await weth.connect(caller.signer).approve(pool.address, APPROVAL_AMOUNT_POOL);
    await pool.connect(caller.signer).repay(weth.address, MAX_UINT_AMOUNT, 2, caller.address);
  });
  it('Tries to take a flashloan that is bigger than the available liquidity and reverts', async () => {
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

  it('Tries to take a flashloan using a non contract address as receiver and reverts', async () => {
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
    const { usdc, aUsdc, pool, helpersContract, deployer: depositor } = testEnv;

    await _mockFlashLoanReceiver.setFailExecutionTransfer(false);

    const flashBorrowedAmount = await convertToCurrencyDecimals(usdc.address, '500');
    const totalFees = flashBorrowedAmount.mul(TOTAL_PREMIUM).div(10000);
    const feesToProtocol = flashBorrowedAmount.mul(PREMIUM_TO_PROTOCOL).div(10000);
    const feesToLp = flashBorrowedAmount.mul(PREMIUM_TO_LP).div(10000);
    const liquidityIndexAdded = feesToLp
      .mul(ethers.BigNumber.from(10).pow(27))
      .div(await aUsdc.totalSupply());

    let reserveData = await helpersContract.getReserveData(usdc.address);

    const liquidityIndexBefore = reserveData.liquidityIndex;

    const totalLiquidityBefore = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

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

    const totalLiquidityAfter = reserveData.availableLiquidity
      .add(reserveData.totalStableDebt)
      .add(reserveData.totalVariableDebt);

    const reservesAfter = await aUsdc.balanceOf(await aUsdc.RESERVE_TREASURY_ADDRESS());

    expect(totalLiquidityBefore.add(totalFees)).to.be.equal(totalLiquidityAfter);
    expect(currentLiquidityRate).to.be.equal(0);
    expect(currentLiquidityIndex).to.be.equal(liquidityIndexBefore.add(liquidityIndexAdded));
    expect(reservesAfter).to.be.equal(reservesBefore.add(feesToProtocol));
  });

  it('Takes out a 500 USDC flashloan with mode = 0, does not return the funds and reverts', async () => {
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

  it('Caller takes a WETH flashloan with mode = 1', async () => {
    const { pool, weth, users, helpersContract } = testEnv;

    const caller = users[3];

    const flashAmount = ethers.utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [weth.address],
        [flashAmount],
        [1],
        caller.address,
        '0x10',
        '0'
      );

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    const callerDebt = await wethDebtToken.balanceOf(caller.address);

    expect(callerDebt.toString()).to.be.equal('800000000000000000', 'Invalid user debt');
  });

  it('Caller takes a WETH flashloan with mode = 1 onBehalfOf user without allowance', async () => {
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
    ).to.be.reverted;
  });

  it('Caller takes a WETH flashloan with mode = 1 onBehalfOf user with allowance. A loan for onBehalfOf is creatd.', async () => {
    const { pool, weth, users, helpersContract } = testEnv;

    const caller = users[5];
    const onBehalfOf = users[4];

    const flashAmount = ethers.utils.parseEther('0.8');

    const reserveData = await pool.getReserveData(weth.address);

    const stableDebtToken = await getStableDebtToken(reserveData.stableDebtTokenAddress);

    // Deposited for onBehalfOf user already, delegate borrow allowance
    await stableDebtToken.connect(onBehalfOf.signer).approveDelegation(caller.address, flashAmount);

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    await pool
      .connect(caller.signer)
      .flashLoan(
        _mockFlashLoanReceiver.address,
        [weth.address],
        [flashAmount],
        [1],
        onBehalfOf.address,
        '0x10',
        '0'
      );

    const { stableDebtTokenAddress } = await helpersContract.getReserveTokensAddresses(
      weth.address
    );

    const wethDebtToken = await getStableDebtToken(stableDebtTokenAddress);

    const onBehalfOfDebt = await wethDebtToken.balanceOf(onBehalfOf.address);

    expect(onBehalfOfDebt.toString()).to.be.equal(
      '800000000000000000',
      'Invalid onBehalfOf user debt'
    );
  });
});
