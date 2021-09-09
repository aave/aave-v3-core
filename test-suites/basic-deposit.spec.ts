import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { DRE, increaseTime } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, oneEther } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { calcExpectedStableDebtTokenBalance } from './helpers/utils/calculations';
import { getUserData } from './helpers/utils/helpers';
import { makeSuite } from './helpers/make-suite';

makeSuite('Pool Liquidation: Liquidator receiving the underlying asset', (testEnv) => {
  it('User 1 Deposit dai', async () => {
    const {
      dai,
      aDai,
      users: [depositor],
      pool,
      helpersContract,
    } = testEnv;

    //mints DAI to depositor
    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '10000'));

    //approve protocol to access depositor wallet
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '10000');

    const daiReserveData = await helpersContract.getReserveData(dai.address);

    await expect(
      pool
        .connect(depositor.signer)
        .deposit(dai.address, amountDAItoDeposit, depositor.address, '0')
    )
      .to.emit(aDai, 'Mint')
      .withArgs(depositor.address, amountDAItoDeposit, daiReserveData.liquidityIndex);

    const aDaiBalance = await aDai.balanceOf(depositor.address);
    const scaledADaiBalance = await aDai.scaledBalanceOf(depositor.address);

    console.log(aDaiBalance.toString());
    console.log(scaledADaiBalance.toString());
    expect(aDaiBalance).to.be.equal(scaledADaiBalance);
  });

  it('User 2 - deposit ETH, borrow Dai', async () => {
    const {
      dai,
      weth,
      users: [borrower],
      pool,
      oracle,
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
      weth,
      aDai,
      users: [depositor],
      pool,
      oracle,
      helpersContract,
    } = testEnv;

    await increaseTime(86400);

    //mints DAI to depositor
    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '20000'));

    //user 1 deposits 2000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '20000');

    const depositTx = await pool
      .connect(depositor.signer)
      .deposit(dai.address, amountDAItoDeposit, depositor.address, '0');

    const depositReceipt = await depositTx.wait();

    const mintEventSignature = utils.keccak256(utils.toUtf8Bytes('Mint(address,uint256,uint256)'));
    const rawMintEvents = depositReceipt.logs.filter((log) => log.topics[0] === mintEventSignature);

    expect(rawMintEvents.length).to.equal(1, 'Incorrect number of Mint Events');
    const parsedMintEvent = aDai.interface.parseLog(rawMintEvents[0]);

    expect(parsedMintEvent.args.from).to.equal(depositor.address);
    expect(parsedMintEvent.args.value).to.equal(amountDAItoDeposit);

    const daiReserveData = await helpersContract.getReserveData(dai.address);
    expect(parsedMintEvent.args.index).to.equal(daiReserveData.liquidityIndex);
  });
});
