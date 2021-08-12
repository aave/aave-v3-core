import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils';
import { MAX_UINT_AMOUNT, RAY, WAD_RAY_RATIO } from '../../helpers/constants';
import {
  advanceTimeAndBlock,
  DRE,
  evmRevert,
  evmSnapshot,
  increaseTime,
  waitForTx,
} from '../../helpers/misc-utils';
import { TestEnv, makeSuite } from './helpers/make-suite';
const { expect } = require('chai');

import {
  calcExpectedReserveDataAfterMintUnbacked,
  calcExpectedReserveDataAfterBackUnbacked,
  configuration as calculationsConfiguration,
} from './helpers/utils/calculations';

import { BigNumber } from 'bignumber.js';
import './helpers/utils/math';
import {
  borrow,
  configuration,
  deposit,
  getContractsData,
  getTxCostAndTimestamp,
  mint,
} from './helpers/actions';
import { AavePools, iAavePoolAssets, IReserveParams, RateMode } from '../../helpers/types';
import { getReserveData } from './helpers/utils/helpers';
import { getReservesConfigByPool } from '../../helpers/configuration';
import { ReserveData, UserReserveData } from './helpers/utils/interfaces';
import { time } from 'console';

BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_DOWN });

const expectEqual = (
  actual: UserReserveData | ReserveData,
  expected: UserReserveData | ReserveData
) => {
  expect(actual).to.be.almostEqualOrEqual(expected);
};

makeSuite('Bridge-logic testing with borrows', (testEnv: TestEnv) => {
  const depositAmount = new BigNumber(parseEther('1000').toString());
  const borrowAmount = new BigNumber(parseEther('200').toString());
  const withdrawAmount = new BigNumber(parseEther('100').toString());
  const feeBP = new BigNumber(30);
  const denominatorBP = new BigNumber(10000);

  const mintAmount = withdrawAmount.multipliedBy(denominatorBP.minus(feeBP)).div(denominatorBP);
  const feeAmount = withdrawAmount.multipliedBy(feeBP).div(denominatorBP);

  before('setup', async () => {
    // TODO: Taken from `scenario.spec.ts`
    calculationsConfiguration.reservesParams = <iAavePoolAssets<IReserveParams>>(
      getReservesConfigByPool(AavePools.proto)
    );
  });

  it('User 0 deposit 1000 dai.', async () => {
    const { users, pool, dai, aDai } = testEnv;
    await dai.connect(users[0].signer).mint(depositAmount.toFixed(0));
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, depositAmount.toFixed(0), users[0].address, 0);
  });

  it('User 1 deposit 2 eth', async () => {
    const { users, pool, weth, aWETH } = testEnv;
    await weth.connect(users[1].signer).deposit({ value: parseEther('2') });
    await weth.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[1].signer).deposit(weth.address, parseEther('2'), users[1].address, 0);
  });

  it('User 1 borrows 200 dai with variable debt', async () => {
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    await pool
      .connect(users[1].signer)
      .borrow(dai.address, borrowAmount.toFixed(0), RateMode.Variable, 0, users[1].address);
  });

  it('User 1 borrows 200 dai with stable debt', async () => {
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    await pool
      .connect(users[1].signer)
      .borrow(dai.address, borrowAmount.toFixed(0), RateMode.Stable, 0, users[1].address);
  });

  it('User 2 perform fast withdraw 100 aDAi from L2', async () => {
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    const reserveDataBefore = await getReserveData(helpersContract, dai.address);
    const tx = await waitForTx(
      await pool
        .connect(users[2].signer)
        .mintUnbacked(dai.address, mintAmount.toFixed(0), users[2].address, 0)
    );
    const { txTimestamp } = await getTxCostAndTimestamp(tx);
    const expectedDataAfter = calcExpectedReserveDataAfterMintUnbacked(
      mintAmount.toFixed(0),
      reserveDataBefore,
      txTimestamp
    );
    const reserveDataAfter = await getReserveData(helpersContract, dai.address);
    expectEqual(reserveDataAfter, expectedDataAfter);
  });

  it('User 2 perform another fast withdraw 100 aDAi from L2', async () => {
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    const reserveDataBefore = await getReserveData(helpersContract, dai.address);
    const tx = await waitForTx(
      await pool
        .connect(users[2].signer)
        .mintUnbacked(dai.address, mintAmount.toFixed(0), users[2].address, 0)
    );
    const { txTimestamp } = await getTxCostAndTimestamp(tx);
    const reserveDataAfter = await getReserveData(helpersContract, dai.address);
    const expectedDataAfter = calcExpectedReserveDataAfterMintUnbacked(
      mintAmount.toFixed(0),
      reserveDataBefore,
      txTimestamp
    );
    expectEqual(reserveDataAfter, expectedDataAfter);
  });

  it('Wait 1 days', async () => {
    await advanceTimeAndBlock(60 * 60 * 24);
  });

  it('User 2 perform invalid fast withdraw 100 aDai from L2', async () => {
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    const reserveDataBefore = await getReserveData(helpersContract, dai.address);
    const tx = await waitForTx(
      await pool
        .connect(users[2].signer)
        .mintUnbacked(dai.address, mintAmount.toFixed(0), users[2].address, 0)
    );
    const { txTimestamp } = await getTxCostAndTimestamp(tx);
    const reserveDataAfter = await getReserveData(helpersContract, dai.address);
    const expectedDataAfter = calcExpectedReserveDataAfterMintUnbacked(
      mintAmount.toFixed(0),
      reserveDataBefore,
      txTimestamp
    );
    expectEqual(reserveDataAfter, expectedDataAfter);
  });

  it('Wait 6 days', async () => {
    await advanceTimeAndBlock(60 * 60 * 24 * 6);
  });

  it('100 bridged dai used to back unbacked', async () => {
    // Let user 3 be bridge for now
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    await dai.connect(users[3].signer).mint(withdrawAmount.toFixed(0));
    await dai.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);

    const reserveDataBefore = await getReserveData(helpersContract, dai.address);

    const tx = await waitForTx(
      await pool
        .connect(users[3].signer)
        .backUnbacked(dai.address, mintAmount.toFixed(0), feeAmount.toFixed(0))
    );

    const { txTimestamp } = await getTxCostAndTimestamp(tx);

    const reserveDataAfter = await getReserveData(helpersContract, dai.address);

    const expectedReserveDataAfter = calcExpectedReserveDataAfterBackUnbacked(
      (await aDai.scaledTotalSupply()).toString(),
      mintAmount.toFixed(0),
      feeAmount.toFixed(0),
      reserveDataBefore,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveDataAfter);
  });

  it('100 bridged dai used to back unbacked', async () => {
    // Let user 3 be bridge for now
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    await dai.connect(users[3].signer).mint(withdrawAmount.toFixed(0));
    await dai.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);

    const reserveDataBefore = await getReserveData(helpersContract, dai.address);

    const tx = await waitForTx(
      await pool
        .connect(users[3].signer)
        .backUnbacked(dai.address, mintAmount.toFixed(0), feeAmount.toFixed(0))
    );

    const { txTimestamp } = await getTxCostAndTimestamp(tx);

    const reserveDataAfter = await getReserveData(helpersContract, dai.address);

    const expectedReserveDataAfter = calcExpectedReserveDataAfterBackUnbacked(
      (await aDai.scaledTotalSupply()).toString(),
      mintAmount.toFixed(0),
      feeAmount.toFixed(0),
      reserveDataBefore,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveDataAfter);
  });

  it('User donates 100 dai to aDai holders', async () => {
    // Let user 3 be bridge for now
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    await dai.connect(users[3].signer).mint(withdrawAmount.toFixed(0));
    await dai.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);

    const reserveDataBefore = await getReserveData(helpersContract, dai.address);

    const tx = await waitForTx(
      await pool.connect(users[3].signer).backUnbacked(dai.address, '0', withdrawAmount.toFixed(0))
    );

    const { txTimestamp } = await getTxCostAndTimestamp(tx);
    const reserveDataAfter = await getReserveData(helpersContract, dai.address);

    const expectedReserveDataAfter = calcExpectedReserveDataAfterBackUnbacked(
      (await aDai.scaledTotalSupply()).toString(),
      '0',
      withdrawAmount.toFixed(0),
      reserveDataBefore,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveDataAfter);
    expect(reserveDataBefore.unbackedUnderlying.toFixed(0)).to.be.eq(mintAmount.toFixed(0));
    expect(reserveDataAfter.unbackedUnderlying.toFixed(0)).to.be.eq(mintAmount.toFixed(0));
    expect(reserveDataAfter.liquidityIndex.gt(reserveDataBefore.liquidityIndex)).to.be.eq(true);
  });

  it('Safety module cover 100 unbacked dai', async () => {
    // Let user 3 be bridge for now
    const { users, pool, dai, aDai, helpersContract } = testEnv;
    await dai.connect(users[3].signer).mint(withdrawAmount.toFixed(0));
    await dai.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);

    const reserveDataBefore = await getReserveData(helpersContract, dai.address);

    const tx = await waitForTx(
      await pool.connect(users[3].signer).backUnbacked(dai.address, mintAmount.toFixed(0), '0')
    );

    const { txTimestamp } = await getTxCostAndTimestamp(tx);
    const reserveDataAfter = await getReserveData(helpersContract, dai.address);

    const expectedReserveDataAfter = calcExpectedReserveDataAfterBackUnbacked(
      (await aDai.scaledTotalSupply()).toString(),
      mintAmount.toFixed(0),
      '0',
      reserveDataBefore,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveDataAfter);
    expect(reserveDataBefore.unbackedUnderlying.toFixed(0)).to.be.eq(mintAmount.toFixed(0));
    expect(reserveDataAfter.unbackedUnderlying.toFixed(0)).to.be.eq('0');
  });
});
