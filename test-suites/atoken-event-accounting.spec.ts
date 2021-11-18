import { waitForTx, increaseTime } from '@aave/deploy-v3';
import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { RateMode } from '../helpers/types';
import { makeSuite } from './helpers/make-suite';

makeSuite('AToken Mint and Burn Event Accounting', (testEnv) => {
  let firstDaiDeposit;
  let secondDaiDeposit;
  let thirdDaiDeposit;
  let accruedInterest1: BigNumber = BigNumber.from(0);
  let accruedInterest2: BigNumber = BigNumber.from(0);
  let accruedInterest3: BigNumber = BigNumber.from(0);

  let firstDaiBorrow;
  let secondDaiBorrow;
  let accruedDebt1: BigNumber = BigNumber.from(0);
  let accruedDebt2: BigNumber = BigNumber.from(0);
  let accruedDebt3: BigNumber = BigNumber.from(0);

  before('User 0 deposits 100 DAI, user 1 deposits 1 WETH, borrows 50 DAI', async () => {
    const { dai } = testEnv;
    firstDaiDeposit = await convertToCurrencyDecimals(dai.address, '10000');
    secondDaiDeposit = await convertToCurrencyDecimals(dai.address, '20000');
    thirdDaiDeposit = await convertToCurrencyDecimals(dai.address, '50000');
  });

  it('User 1 Deposit dai', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    // mints DAI to depositor
    await waitForTx(
      await dai
        .connect(depositor.signer)
        ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '10000'))
    );

    // approve protocol to access depositor wallet
    await waitForTx(await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT));

    const daiReserveData = await helpersContract.getReserveData(dai.address);

    await expect(
      pool.connect(depositor.signer).deposit(dai.address, firstDaiDeposit, depositor.address, '0')
    )
      .to.emit(aDai, 'Mint')
      .withArgs(depositor.address, firstDaiDeposit, daiReserveData.liquidityIndex);

    const aDaiBalance = await aDai.balanceOf(depositor.address);

    expect(aDaiBalance).to.be.equal(firstDaiDeposit);
  });

  it('User 2 - deposit ETH, borrow Dai', async () => {
    const {
      dai,
      weth,
      users: [, borrower],
      pool,
      helpersContract,
    } = testEnv;

    //user 2 deposits 100 ETH
    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '20000');

    //mints WETH to borrower
    await waitForTx(
      await weth
        .connect(borrower.signer)
        ['mint(uint256)'](await convertToCurrencyDecimals(weth.address, '20000'))
    );

    //approve protocol to access the borrower wallet
    await waitForTx(await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT));

    await waitForTx(
      await pool
        .connect(borrower.signer)
        .deposit(weth.address, amountETHtoDeposit, borrower.address, '0')
    );

    // Borrow dai
    firstDaiBorrow = await convertToCurrencyDecimals(dai.address, '5000');

    await waitForTx(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, firstDaiBorrow, RateMode.Variable, '0', borrower.address)
    );

    const borrowerWethData = await helpersContract.getUserReserveData(
      weth.address,
      borrower.address
    );
    const borrowerDaiData = await helpersContract.getUserReserveData(dai.address, borrower.address);
    expect(borrowerWethData.currentATokenBalance).to.be.equal(amountETHtoDeposit);
    expect(borrowerDaiData.currentVariableDebt).to.be.equal(firstDaiBorrow);
  });

  it('User 2 - borrow more Dai  - confirm mint event includes accrued interest', async () => {
    const {
      dai,
      variableDebtDai,
      users: [, borrower],
      pool,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    // Borrow dai
    secondDaiBorrow = await convertToCurrencyDecimals(dai.address, '2000');

    const borrowTx = await pool
      .connect(borrower.signer)
      .borrow(dai.address, secondDaiBorrow, RateMode.Variable, '0', borrower.address);

    const borrowReceipt = await borrowTx.wait();
    const borrowerDaiData = await helpersContract.getUserReserveData(dai.address, borrower.address);

    const mintEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Mint(address,address,uint256,uint256)')
    );
    const rawMintEvents = borrowReceipt.logs.filter((log) => log.topics[0] === mintEventSignature);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = variableDebtDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(borrower.address);
    accruedDebt1 = borrowerDaiData.currentVariableDebt.sub(firstDaiBorrow).sub(secondDaiBorrow);

    expect(parsedMintEvent.args.value).to.be.closeTo(secondDaiBorrow.add(accruedDebt1), 2);
  });

  it('User 1 - deposit more Dai - confirm mint event includes accrued interest', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    //mints DAI to depositor
    await waitForTx(
      await dai
        .connect(depositor.signer)
        ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '20000'))
    );

    //user 1 deposits 2000 DAI

    const depositTx = await waitForTx(
      await pool
        .connect(depositor.signer)
        .deposit(dai.address, secondDaiDeposit, depositor.address, '0')
    );

    const aDaiBalance = await aDai.balanceOf(depositor.address);

    const mintEventSignature = utils.keccak256(utils.toUtf8Bytes('Mint(address,uint256,uint256)'));
    const rawMintEvents = depositTx.logs.filter((log) => log.topics[0] === mintEventSignature);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = aDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(depositor.address);
    accruedInterest1 = aDaiBalance.sub(firstDaiDeposit).sub(secondDaiDeposit);
    expect(parsedMintEvent.args.value).to.be.closeTo(secondDaiDeposit.add(accruedInterest1), 2);

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedMintEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });

  it('User 1 - deposit more Dai again - confirm mint event includes accrued interest', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    //mints DAI to depositor
    await waitForTx(
      await dai
        .connect(depositor.signer)
        ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '50000'))
    );

    //user 1 deposits 2000 DAI
    const depositTx = await pool
      .connect(depositor.signer)
      .deposit(dai.address, thirdDaiDeposit, depositor.address, '0');

    const depositReceipt = await depositTx.wait();

    const aDaiBalance = await aDai.balanceOf(depositor.address);

    const mintEventSignature = utils.keccak256(utils.toUtf8Bytes('Mint(address,uint256,uint256)'));
    const rawMintEvents = depositReceipt.logs.filter((log) => log.topics[0] === mintEventSignature);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = aDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(depositor.address);
    accruedInterest2 = aDaiBalance
      .sub(firstDaiDeposit)
      .sub(secondDaiDeposit)
      .sub(thirdDaiDeposit)
      .sub(accruedInterest1);
    expect(parsedMintEvent.args.value).to.be.closeTo(thirdDaiDeposit.add(accruedInterest2), 2);

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedMintEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });

  it('User 2 - repay all remaining dai', async () => {
    const {
      dai,
      variableDebtDai,
      users: [, borrower],
      pool,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    //mints DAI to borrower
    await waitForTx(
      await dai
        .connect(borrower.signer)
        ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '50000'))
    );

    // approve protocol to access depositor wallet
    await waitForTx(await dai.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT));

    const daiBalanceBefore = await dai.balanceOf(borrower.address);

    // repay dai loan
    const repayTx = await pool
      .connect(borrower.signer)
      .repay(dai.address, MAX_UINT_AMOUNT, RateMode.Variable, borrower.address);

    const repayReceipt = await repayTx.wait();

    const burnEventSignature = utils.keccak256(utils.toUtf8Bytes('Burn(address,uint256,uint256)'));
    const rawBurnEvents = repayReceipt.logs.filter((log) => log.topics[0] === burnEventSignature);

    expect(rawBurnEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedBurnEvent = variableDebtDai.interface.parseLog(rawBurnEvents[0]);

    expect(parsedBurnEvent.args.user).to.equal(borrower.address);

    const daiBalanceAfter = await dai.balanceOf(borrower.address);
    const daiRepaid = daiBalanceBefore.sub(daiBalanceAfter);

    accruedDebt3 = daiRepaid
      .sub(firstDaiBorrow)
      .sub(accruedDebt1)
      .sub(secondDaiBorrow)
      .sub(accruedDebt2);

    expect(parsedBurnEvent.args.amount).to.be.closeTo(daiRepaid.sub(accruedDebt3), 2);

    const borrowerDaiData = await helpersContract.getUserReserveData(dai.address, borrower.address);
    expect(borrowerDaiData.currentVariableDebt).to.be.equal(0);
  });

  it('User 1 - withdraws all deposited funds and interest', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;
    const daiBalanceBefore = await dai.balanceOf(depositor.address);

    const withdrawTx = await pool
      .connect(depositor.signer)
      .withdraw(dai.address, MAX_UINT_AMOUNT, depositor.address);

    const depositReceipt = await withdrawTx.wait();

    const burnEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Burn(address,address,uint256,uint256)')
    );
    const rawBurnEvents = depositReceipt.logs.filter((log) => log.topics[0] === burnEventSignature);

    const aDaiBalance = await aDai.balanceOf(depositor.address);
    expect(aDaiBalance).to.be.equal(0);

    const daiBalanceAfter = await dai.balanceOf(depositor.address);
    const daiWithdrawn = daiBalanceAfter.sub(daiBalanceBefore);

    expect(rawBurnEvents.length).to.equal(1, 'Incorrect number of Burn Events');
    const parsedBurnEvent = aDai.interface.parseLog(rawBurnEvents[0]);

    accruedInterest3 = daiWithdrawn
      .sub(firstDaiDeposit)
      .sub(accruedInterest1)
      .sub(secondDaiDeposit)
      .sub(accruedInterest2)
      .sub(thirdDaiDeposit);

    expect(parsedBurnEvent.args.from).to.equal(depositor.address);
    expect(parsedBurnEvent.args.target).to.equal(depositor.address);
    expect(parsedBurnEvent.args.value).to.be.closeTo(daiWithdrawn.sub(accruedInterest3), 2);

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedBurnEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });

  it('User 2 - borrow, pass time and repay dai less than accrued debt', async () => {
    const {
      dai,
      variableDebtDai,
      users: [depositor, borrower],
      pool,
    } = testEnv;
    // User 1 - Deposit dai
    await waitForTx(
      await pool
        .connect(depositor.signer)
        .deposit(dai.address, firstDaiDeposit, depositor.address, '0')
    );

    // User 2 - Borrow dai
    const borrowAmount = await convertToCurrencyDecimals(dai.address, '8000');

    await waitForTx(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, borrowAmount, RateMode.Variable, '0', borrower.address)
    );

    const debtBalanceBefore = await variableDebtDai.balanceOf(borrower.address);

    await increaseTime(86400);

    // repay a very small amount - less than accrued debt
    const smallRepay = BigNumber.from('100000');

    // approve protocol to access depositor wallet
    await waitForTx(await dai.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT));

    // repay dai loan
    const repayTx = await pool
      .connect(borrower.signer)
      .repay(dai.address, smallRepay, RateMode.Variable, borrower.address);

    const repayReceipt = await repayTx.wait();

    const debtBalanceAfter = await variableDebtDai.balanceOf(borrower.address);

    const mintEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Mint(address,address,uint256,uint256)')
    );
    const rawMintEvents = repayReceipt.logs.filter((log) => log.topics[0] === mintEventSignature);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = variableDebtDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(borrower.address);
    expect(parsedMintEvent.args.value).to.be.closeTo(debtBalanceAfter.sub(debtBalanceBefore), 2);
  });

  it('User 1 - withdraw amount less than accrued interest', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    // repay a very small amount - less than accrued debt
    const smallWithdrawal = BigNumber.from('100000');

    const withdrawTx = await pool
      .connect(depositor.signer)
      .withdraw(dai.address, smallWithdrawal, depositor.address);

    const withdrawReceipt = await withdrawTx.wait();

    const mintEventSignature = utils.keccak256(utils.toUtf8Bytes('Mint(address,uint256,uint256)'));
    const rawMintEvents = withdrawReceipt.logs.filter(
      (log) => log.topics[0] === mintEventSignature
    );

    const aTokenSupplyAfter = await aDai.balanceOf(depositor.address);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = aDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(depositor.address);

    expect(parsedMintEvent.args.value).to.be.closeTo(aTokenSupplyAfter.sub(firstDaiDeposit), 2);

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedMintEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });
});
