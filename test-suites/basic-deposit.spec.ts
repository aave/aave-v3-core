import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { DRE, increaseTime } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { RateMode } from '../helpers/types';
import { makeSuite } from './helpers/make-suite';

makeSuite('Basic Deposit Test', (testEnv) => {
  let firstDaiDeposit;
  let secondDaiDeposit;
  let thirdDaiDeposit;
  let accruedInterest: BigNumber = BigNumber.from(0);

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
    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '10000'));

    // approve protocol to access depositor wallet
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

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
      users: [borrower],
      pool,
      helpersContract,
    } = testEnv;

    //user 2 deposits 100 ETH
    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '10000');

    //mints WETH to borrower
    await weth
      .connect(borrower.signer)
      .mint(await convertToCurrencyDecimals(weth.address, '10000'));

    //approve protocol to access the borrower wallet
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(borrower.signer)
      .deposit(weth.address, amountETHtoDeposit, borrower.address, '0');

    // Borrow dai
    const amountDAIToBorrow = await convertToCurrencyDecimals(dai.address, '5000');

    await pool
      .connect(borrower.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, '0', borrower.address);

    const borrowerWethData = await helpersContract.getUserReserveData(
      weth.address,
      borrower.address
    );
    const borrowerDaiData = await helpersContract.getUserReserveData(dai.address, borrower.address);

    expect(borrowerWethData.currentATokenBalance).to.be.equal(amountETHtoDeposit);
    expect(borrowerDaiData.currentVariableDebt).to.be.equal(amountDAIToBorrow);
  });

  it('User 1 - deposit more Dai', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    //mints DAI to depositor
    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '20000'));

    //user 1 deposits 2000 DAI
    const depositTx = await pool
      .connect(depositor.signer)
      .deposit(dai.address, secondDaiDeposit, depositor.address, '0');

    const depositReceipt = await depositTx.wait();

    const aDaiBalance = await aDai.balanceOf(depositor.address);

    const mintEventSignature = utils.keccak256(utils.toUtf8Bytes('Mint(address,uint256,uint256)'));
    const rawMintEvents = depositReceipt.logs.filter((log) => log.topics[0] === mintEventSignature);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = aDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(depositor.address);
    expect(parsedMintEvent.args.value).to.equal(aDaiBalance.sub(firstDaiDeposit));
    accruedInterest = aDaiBalance.sub(firstDaiDeposit).sub(secondDaiDeposit);

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedMintEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });

  it('User 1 - deposit more Dai again', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    //mints DAI to depositor
    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '50000'));

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
    expect(parsedMintEvent.args.value).to.equal(
      aDaiBalance.sub(firstDaiDeposit).sub(secondDaiDeposit).sub(accruedInterest)
    );

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedMintEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });
});
