const { expect } = require('chai');
import { utils } from 'ethers';
import { ReserveData, UserReserveData } from './helpers/utils/interfaces';
import { ProtocolErrors } from '../helpers/types';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { increaseTime } from '@aave/deploy-v3';

const expectEqual = (
  actual: UserReserveData | ReserveData,
  expected: UserReserveData | ReserveData
) => {
  expect(actual).to.be.almostEqualOrEqual(expected);
};

makeSuite('Isolation mode', (testEnv: TestEnv) => {
  const depositAmount = utils.parseEther('1000');
  const ceilingAmount = '10000';

  const { VL_ASSET_NOT_BORROWABLE_IN_ISOLATION, VL_DEBT_CEILING_CROSSED } = ProtocolErrors;

  before(async () => {
    const { configurator, dai, usdc, aave } = testEnv;

    //set debt ceiling for aave
    await configurator.setDebtCeiling(aave.address, ceilingAmount);

    //set category 1 for DAI and USDC
    await configurator.setBorrowableInIsolation(dai.address, true);
    await configurator.setBorrowableInIsolation(usdc.address, true);
  });

  it('User 0 supply 1000 dai.', async () => {
    const { users, pool, dai } = testEnv;
    await dai.connect(users[0].signer)['mint(uint256)'](depositAmount);
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[0].signer).supply(dai.address, depositAmount, users[0].address, 0);
  });

  it('User 1 supply 2 aave. Checks that aave is activated as collateral ', async () => {
    const { users, pool, aave, helpersContract } = testEnv;
    await aave.connect(users[1].signer)['mint(uint256)'](utils.parseEther('2'));
    await aave.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .supply(aave.address, utils.parseEther('2'), users[1].address, 0);

    const userData = await helpersContract.getUserReserveData(aave.address, users[1].address);

    expect(userData.usageAsCollateralEnabled).to.be.eq(true);
  });

  it('User 1 supply 1 eth. Checks that eth is NOT activated as collateral ', async () => {
    const { users, pool, weth, helpersContract } = testEnv;
    await weth.connect(users[1].signer)['mint(uint256)'](utils.parseEther('1'));
    await weth.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .supply(weth.address, utils.parseEther('1'), users[1].address, 0);

    const userData = await helpersContract.getUserReserveData(weth.address, users[1].address);

    expect(userData.usageAsCollateralEnabled).to.be.eq(false);
  });

  it('User 2 supply 100 DAI, transfers to user 1. Checks that DAI is NOT activated as collateral for user 1', async () => {
    const { dai, aDai, users, pool, helpersContract } = testEnv;

    const amount = utils.parseEther('100');
    await dai.connect(users[2].signer)['mint(uint256)'](amount);
    await dai.connect(users[2].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[2].signer).supply(dai.address, amount, users[2].address, 0);

    await aDai.connect(users[2].signer).transfer(users[1].address, amount);

    const userData = await helpersContract.getUserReserveData(dai.address, users[1].address);

    expect(userData.usageAsCollateralEnabled).to.be.eq(false);
  });

  it('User 1 withdraws everything. User supplies WETH then AAVE. Checks AAVE is not enabled as collateral', async () => {
    const { dai, aave, weth, users, pool, helpersContract } = testEnv;

    await pool
      .connect(users[1].signer)
      .withdraw(weth.address, utils.parseEther('1'), users[1].address);

    await pool
      .connect(users[1].signer)
      .withdraw(aave.address, utils.parseEther('2'), users[1].address);

    await pool
      .connect(users[1].signer)
      .withdraw(dai.address, utils.parseEther('100'), users[1].address);

    const amount = utils.parseEther('1');

    await pool.connect(users[1].signer).supply(weth.address, amount, users[1].address, 0);

    await pool.connect(users[1].signer).supply(aave.address, amount, users[1].address, 0);

    const userData = await helpersContract.getUserReserveData(aave.address, users[1].address);

    expect(userData.usageAsCollateralEnabled).to.be.eq(false);
  });

  it('User 2 supplies DAI, transfers to user 1. Checks DAI is enabled as collateral', async () => {
    const { dai, aDai, users, pool, helpersContract } = testEnv;

    const amount = utils.parseEther('100');
    await dai.connect(users[2].signer)['mint(uint256)'](amount);
    await pool.connect(users[2].signer).supply(dai.address, amount, users[2].address, 0);

    await aDai.connect(users[2].signer).transfer(users[1].address, amount);

    const userData = await helpersContract.getUserReserveData(dai.address, users[1].address);

    expect(userData.usageAsCollateralEnabled).to.be.eq(true);
  });

  it('User 1 withdraws everything. User 2 supplies ETH, User 1 supplies AAVE, tries to borrow ETH (revert expected)', async () => {
    const { dai, aave, weth, users, pool, helpersContract } = testEnv;

    await pool
      .connect(users[1].signer)
      .withdraw(weth.address, utils.parseEther('1'), users[1].address);

    await pool
      .connect(users[1].signer)
      .withdraw(aave.address, utils.parseEther('1'), users[1].address);

    await pool
      .connect(users[1].signer)
      .withdraw(dai.address, utils.parseEther('100'), users[1].address);

    const wethAmount = utils.parseEther('1');

    await weth.connect(users[2].signer)['mint(uint256)'](wethAmount);
    await weth.connect(users[2].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[2].signer).supply(weth.address, wethAmount, users[2].address, 0);

    const aaveAmount = utils.parseEther('100');
    await aave.connect(users[1].signer)['mint(uint256)'](aaveAmount);
    await aave.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[1].signer).supply(aave.address, aaveAmount, users[1].address, 0);

    await expect(
      pool
        .connect(users[1].signer)
        .borrow(weth.address, utils.parseEther('0.01'), '2', 0, users[1].address)
    ).to.be.revertedWith(VL_ASSET_NOT_BORROWABLE_IN_ISOLATION);
  });

  it('User 1 borrows 10 DAI. Check debt ceiling', async () => {
    const { dai, aave, users, pool } = testEnv;

    const borrowAmount = utils.parseEther('10');
    await pool.connect(users[1].signer).borrow(dai.address, borrowAmount, '2', 0, users[1].address);

    const reserveData = await pool.getReserveData(aave.address);

    expect(reserveData.isolationModeTotalDebt).to.be.eq('1000');
  });

  it('User 3 deposits 100 AAVE, borrows 10 DAI. Check debt ceiling', async () => {
    const { dai, aave, users, pool } = testEnv;

    const aaveAmount = utils.parseEther('100');
    await aave.connect(users[3].signer)['mint(uint256)'](aaveAmount);
    await aave.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[3].signer).supply(aave.address, aaveAmount, users[3].address, 0);

    const borrowAmount = utils.parseEther('10');
    await pool.connect(users[3].signer).borrow(dai.address, borrowAmount, '2', 0, users[3].address);

    const reserveData = await pool.getReserveData(aave.address);

    expect(reserveData.isolationModeTotalDebt).to.be.eq('2000');
  });

  it('User 4 deposits 500 AAVE, tries to borrow past the debt ceiling (revert expected)', async () => {
    const { dai, aave, users, pool } = testEnv;

    const aaveAmount = utils.parseEther('500');
    await aave.connect(users[3].signer)['mint(uint256)'](aaveAmount);
    await aave.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[3].signer).supply(aave.address, aaveAmount, users[3].address, 0);

    const borrowAmount = utils.parseEther('100');
    await expect(
      pool.connect(users[3].signer).borrow(dai.address, borrowAmount, '2', 0, users[3].address)
    ).to.be.revertedWith(VL_DEBT_CEILING_CROSSED);
  });

  it('Push time forward one year. User 1, User 3 repay debt. Ensure debt ceiling is 0', async () => {
    const { dai, aave, users, pool } = testEnv;

    await increaseTime(60 * 60 * 24 * 365);

    const mintAmount = utils.parseEther('100');
    await dai.connect(users[3].signer)['mint(uint256)'](mintAmount);
    await dai.connect(users[3].signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(users[3].signer).repay(dai.address, MAX_UINT_AMOUNT, '2', users[3].address);

    await dai.connect(users[1].signer)['mint(uint256)'](mintAmount);
    await dai.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(users[1].signer).repay(dai.address, MAX_UINT_AMOUNT, '2', users[1].address);

    const reserveData = await pool.getReserveData(aave.address);

    expect(reserveData.isolationModeTotalDebt).to.be.eq('0');
  });
});
