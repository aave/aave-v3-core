const { expect } = require('chai');
import { BigNumber, utils } from 'ethers';
import { ReserveData, UserReserveData } from './helpers/utils/interfaces';
import { waitForTx, advanceTimeAndBlock } from '../helpers/misc-utils';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { getACLManager } from '../helpers/contracts-getters';
import { MAX_UINT_AMOUNT, MAX_UNBACKED_MINT_CAP, ZERO_ADDRESS } from '../helpers/constants';
import { ACLManager } from '../types';
import AaveConfig from '../market-config';
import { TestEnv, makeSuite } from './helpers/make-suite';
import { getReserveData } from './helpers/utils/helpers';
import { getTxCostAndTimestamp } from './helpers/actions';
import './helpers/utils/wadraymath';

const expectEqual = (
  actual: UserReserveData | ReserveData,
  expected: UserReserveData | ReserveData
) => {
  expect(actual).to.be.almostEqualOrEqual(expected);
};

makeSuite('Isolation mode', (testEnv: TestEnv) => {
  const depositAmount = utils.parseEther('1000');
  const ceilingAmount = '100';

  before(async () => {
    const { configurator, dai, usdc, aave } = testEnv;

    //set debt ceiling for aave
    await configurator.setDebtCeiling(aave.address, ceilingAmount);

    await configurator.setEModeCategory('1', '9500', '9800', '10100', ZERO_ADDRESS, 'stablecoins');

    //set category 1 for DAI and USDC
    await configurator.setAssetEModeCategory(dai.address, '1');
    await configurator.setAssetEModeCategory(usdc.address, '1');
  });

  it('User 0 supply 1000 dai.', async () => {
    const { users, pool, dai } = testEnv;
    await dai.connect(users[0].signer).mint(depositAmount);
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[0].signer).supply(dai.address, depositAmount, users[0].address, 0);
  });

  it('User 1 supply 2 aave. Checks that aave is activated as collateral ', async () => {
    const { users, pool, aave, helpersContract } = testEnv;
    await aave.connect(users[1].signer).mint(utils.parseEther('2'));
    await aave.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .supply(aave.address, utils.parseEther('2'), users[1].address, 0);

    const userData = await helpersContract.getUserReserveData(aave.address, users[1].address);

    expect(userData.usageAsCollateralEnabled).to.be.eq(true);
  });

  it('User 1 supply 1 eth. Checks that eth is NOT activated as collateral ', async () => {
    const { users, pool, weth, helpersContract } = testEnv;
    await weth.connect(users[1].signer).mint(utils.parseEther('1'));
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
    await dai.connect(users[2].signer).mint(amount);
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
    const { dai, aDai, aave, weth, users, pool, helpersContract } = testEnv;

    const amount = utils.parseEther('100');
    await dai.connect(users[2].signer).mint(amount);
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

    await weth.connect(users[2].signer).mint(wethAmount);
    await weth.connect(users[2].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[2].signer).supply(weth.address, wethAmount, users[2].address, 0);

    const amount = utils.parseEther('1');

    await pool.connect(users[1].signer).supply(aave.address, amount, users[1].address, 0);

    await expect(
      pool
        .connect(users[1].signer)
        .borrow(weth.address, utils.parseEther('0.01'), '2', 0, users[1].address)
    ).to.be.revertedWith();
  });
});
