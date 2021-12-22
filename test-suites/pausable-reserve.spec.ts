import { expect } from 'chai';
import { utils } from 'ethers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { MockFlashLoanReceiver } from '../types/MockFlashLoanReceiver';
import { getMockFlashLoanReceiver } from '@aave/deploy-v3/dist/helpers/contract-getters';
import { makeSuite, TestEnv } from './helpers/make-suite';
import './helpers/utils/wadraymath';

makeSuite('PausableReserve', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  const { RESERVE_PAUSED, INVALID_FROM_BALANCE_AFTER_TRANSFER, INVALID_TO_BALANCE_AFTER_TRANSFER } =
    ProtocolErrors;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('User 0 deposits 1000 DAI. Configurator pauses pool. Transfers to user 1 reverts. Configurator unpauses the network and next transfer succeeds', async () => {
    const { users, pool, dai, aDai, configurator } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await dai.connect(users[0].signer)['mint(uint256)'](amountDAItoDeposit);

    // user 0 deposits 1000 DAI
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, amountDAItoDeposit, users[0].address, '0');

    const user0Balance = await aDai.balanceOf(users[0].address);
    const user1Balance = await aDai.balanceOf(users[1].address);

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, true);

    // User 0 tries the transfer to User 1
    await expect(
      aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit)
    ).to.revertedWith(RESERVE_PAUSED);

    const pausedFromBalance = await aDai.balanceOf(users[0].address);
    const pausedToBalance = await aDai.balanceOf(users[1].address);

    expect(pausedFromBalance).to.be.equal(
      user0Balance.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
    expect(pausedToBalance.toString()).to.be.equal(
      user1Balance.toString(),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, false);

    // User 0 succeeds transfer to User 1
    await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit);

    const fromBalance = await aDai.balanceOf(users[0].address);
    const toBalance = await aDai.balanceOf(users[1].address);

    expect(fromBalance.toString()).to.be.equal(
      user0Balance.sub(amountDAItoDeposit),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );
    expect(toBalance.toString()).to.be.equal(
      user1Balance.add(amountDAItoDeposit),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
  });

  it('Deposit', async () => {
    const { users, pool, dai, aDai, configurator } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await dai.connect(users[0].signer)['mint(uint256)'](amountDAItoDeposit);

    // user 0 deposits 1000 DAI
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, true);
    await expect(
      pool.connect(users[0].signer).deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    ).to.revertedWith(RESERVE_PAUSED);

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, false);
  });

  it('Withdraw', async () => {
    const { users, pool, dai, aDai, configurator } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await dai.connect(users[0].signer)['mint(uint256)'](amountDAItoDeposit);

    // user 0 deposits 1000 DAI
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, amountDAItoDeposit, users[0].address, '0');

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, true);

    // user tries to burn
    await expect(
      pool.connect(users[0].signer).withdraw(dai.address, amountDAItoDeposit, users[0].address)
    ).to.revertedWith(RESERVE_PAUSED);

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, false);
  });

  it('Borrow', async () => {
    const { pool, dai, users, configurator } = testEnv;

    const user = users[1];
    // Pause the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, true);

    // Try to execute liquidation
    await expect(
      pool.connect(user.signer).borrow(dai.address, '1', '1', '0', user.address)
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, false);
  });

  it('Repay', async () => {
    const { pool, dai, users, configurator } = testEnv;

    const user = users[1];
    // Pause the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, true);

    // Try to execute liquidation
    await expect(
      pool.connect(user.signer).repay(dai.address, '1', '1', user.address)
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause the pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, false);
  });

  it('Flash loan', async () => {
    const { dai, pool, weth, users, configurator } = testEnv;

    const caller = users[3];

    const flashAmount = utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    // Pause pool
    await configurator.connect(users[1].signer).setReservePause(weth.address, true);

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
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setReservePause(weth.address, false);
  });

  it('Liquidation call', async () => {
    const { users, pool, usdc, oracle, weth, configurator, helpersContract } = testEnv;
    const depositor = users[3];
    const borrower = users[4];

    //mints USDC to depositor
    await usdc
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '1000'));

    //approve protocol to access depositor wallet
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 3 deposits 1000 USDC
    const amountUSDCtoDeposit = await convertToCurrencyDecimals(usdc.address, '1000');

    await pool
      .connect(depositor.signer)
      .deposit(usdc.address, amountUSDCtoDeposit, depositor.address, '0');

    //user 4 deposits ETH
    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '0.06775');

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

    // Drops HF below 1
    await oracle.setAssetPrice(usdc.address, usdcPrice.percentMul(12000));

    //mints dai to the liquidator
    await usdc['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '1000'));
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      usdc.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentStableDebt.div(2);

    // Pause pool
    await configurator.connect(users[1].signer).setReservePause(usdc.address, true);

    // Do liquidation
    await expect(
      pool.liquidationCall(weth.address, usdc.address, borrower.address, amountToLiquidate, true)
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setReservePause(usdc.address, false);
  });

  it('SwapBorrowRateMode', async () => {
    const { pool, weth, dai, usdc, users, configurator } = testEnv;
    const user = users[1];
    const amountWETHToDeposit = utils.parseEther('10');
    const amountDAIToDeposit = utils.parseEther('120');
    const amountToBorrow = await convertToCurrencyDecimals(usdc.address, '65');

    await weth.connect(user.signer)['mint(uint256)'](amountWETHToDeposit);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(weth.address, amountWETHToDeposit, user.address, '0');

    await dai.connect(user.signer)['mint(uint256)'](amountDAIToDeposit);
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, amountDAIToDeposit, user.address, '0');

    await pool.connect(user.signer).borrow(usdc.address, amountToBorrow, 2, 0, user.address);

    // Pause pool
    await configurator.connect(users[1].signer).setReservePause(usdc.address, true);

    // Try to repay
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(usdc.address, RateMode.Stable)
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setReservePause(usdc.address, false);
  });

  it('RebalanceStableBorrowRate', async () => {
    const { pool, dai, users, configurator } = testEnv;
    const user = users[1];
    // Pause pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, true);

    await expect(
      pool.connect(user.signer).rebalanceStableBorrowRate(dai.address, user.address)
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setReservePause(dai.address, false);
  });

  it('setUserUseReserveAsCollateral', async () => {
    const { pool, weth, users, configurator } = testEnv;
    const user = users[1];

    const amountWETHToDeposit = utils.parseEther('1');
    await weth.connect(user.signer)['mint(uint256)'](amountWETHToDeposit);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(weth.address, amountWETHToDeposit, user.address, '0');

    // Pause pool
    await configurator.connect(users[1].signer).setReservePause(weth.address, true);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(weth.address, false)
    ).to.be.revertedWith(RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setReservePause(weth.address, false);
  });
});
