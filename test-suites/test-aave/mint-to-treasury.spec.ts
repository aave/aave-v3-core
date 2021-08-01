import { makeSuite, TestEnv } from './helpers/make-suite';
import { RateMode } from '../../helpers/types';
import { APPROVAL_AMOUNT_POOL, ONE_YEAR } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { BigNumber } from 'bignumber.js';
import { advanceTimeAndBlock, waitForTx } from '../../helpers/misc-utils';
import './helpers/utils/math';

const { expect } = require('chai');

makeSuite('Mint to treasury', (testEnv: TestEnv) => {
  it('User 0 deposits 1000 DAI. Borrower borrows 100 DAI. Clock moved forward one year. Calculates and verifies the amount accrued to the treasury', async () => {
    const { users, pool, dai, helpersContract } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');
    const amountDAItoBorrow = await convertToCurrencyDecimals(dai.address, '100');

    await waitForTx(await dai.connect(users[0].signer).mint(amountDAItoDeposit));

    // user 0 deposits 1000 DAI
    await waitForTx(
      await dai.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_POOL)
    );
    await waitForTx(
      await pool
        .connect(users[0].signer)
        .deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    );

    await waitForTx(
      await pool
        .connect(users[0].signer)
        .borrow(dai.address, amountDAItoBorrow, RateMode.Variable, '0', users[0].address)
    );

    const { reserveFactor } = await helpersContract.getReserveConfigurationData(dai.address);

    await advanceTimeAndBlock(parseInt(ONE_YEAR));

    await waitForTx(await dai.connect(users[0].signer).mint(amountDAItoDeposit));

    await waitForTx(
      await pool
        .connect(users[0].signer)
        .deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    );

    const { liquidityIndex, variableBorrowIndex } = await pool.getReserveData(dai.address);

    const amountBorrowedBN = new BigNumber(amountDAItoBorrow.toString());
    const liquidityIndexBN = new BigNumber(liquidityIndex.toString());
    const variableBorrowIndexBN = new BigNumber(variableBorrowIndex.toString());

    const expectedAccruedToTreasury = amountBorrowedBN
      .rayMul(variableBorrowIndexBN)
      .minus(amountBorrowedBN)
      .times(reserveFactor.toString())
      .div(10000)
      .rayDiv(liquidityIndexBN)
      .toFixed(0);

    const { accruedToTreasury } = await pool.getReserveData(dai.address);

    expect(accruedToTreasury.toString()).to.be.bignumber.almostEqual(
      expectedAccruedToTreasury,
      'Invalid amount accrued to the treasury'
    );
  });

  it('Mints the accrued to the treasury', async () => {
    const { users, pool, dai, aDai, helpersContract } = testEnv;

    const treasuryAddress = await aDai.RESERVE_TREASURY_ADDRESS();
    const { accruedToTreasury } = await pool.getReserveData(dai.address);

    await waitForTx(await pool.connect(users[0].signer).mintToTreasury([dai.address]));
    const normalizedIncome =  await pool.getReserveNormalizedIncome(dai.address);

    const treasuryBalance = await aDai.balanceOf(treasuryAddress);

    const expectedTreasuryBalance = new BigNumber(accruedToTreasury.toString()).rayMul(
      new BigNumber(normalizedIncome.toString())
    );
    
    expect(treasuryBalance.toString()).to.be.bignumber.almostEqual(expectedTreasuryBalance, "Invalid treasury balance after minting");

  });
});
