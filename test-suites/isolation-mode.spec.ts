const { expect } = require('chai');
import { utils, BigNumber } from 'ethers';
import { ReserveData, UserReserveData } from './helpers/utils/interfaces';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { AAVE_REFERRAL, MAX_UINT_AMOUNT, MAX_UNBACKED_MINT_CAP } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import {
  increaseTime,
  waitForTx,
  evmSnapshot,
  evmRevert,
  advanceTimeAndBlock,
} from '@aave/deploy-v3';
import { getReserveData, getUserData } from './helpers/utils/helpers';
import { getTxCostAndTimestamp } from './helpers/actions';
import AaveConfig from '@aave/deploy-v3/dist/markets/test';
import { getACLManager } from '@aave/deploy-v3/dist/helpers/contract-getters';
import {
  calcExpectedReserveDataAfterMintUnbacked,
  configuration as calculationsConfiguration,
} from './helpers/utils/calculations';

const expectEqual = (
  actual: UserReserveData | ReserveData,
  expected: UserReserveData | ReserveData
) => {
  expect(actual).to.be.almostEqualOrEqual(expected);
};

makeSuite('Isolation mode', (testEnv: TestEnv) => {
  const depositAmount = utils.parseEther('1000');
  const borrowAmount = utils.parseEther('200');
  const ceilingAmount = '10000';

  const withdrawAmount = utils.parseEther('100');
  const feeBps = BigNumber.from(30);
  const denominatorBP = BigNumber.from(10000);
  const mintAmount = withdrawAmount.mul(denominatorBP.sub(feeBps)).div(denominatorBP);
  const bridgeProtocolFeeBps = BigNumber.from(2000);

  const { ASSET_NOT_BORROWABLE_IN_ISOLATION, DEBT_CEILING_EXCEEDED, USER_IN_ISOLATION_MODE } =
    ProtocolErrors;

  let aclManager;
  let oracleBaseDecimals;
  let snapshot;

  before(async () => {
    const { configurator, dai, usdc, aave, users, poolAdmin } = testEnv;
    calculationsConfiguration.reservesParams = AaveConfig.ReservesConfig;

    //set debt ceiling for aave
    await configurator.setDebtCeiling(aave.address, ceilingAmount);

    //set category 1 for DAI and USDC
    await configurator.setBorrowableInIsolation(dai.address, true);
    await configurator.setBorrowableInIsolation(usdc.address, true);

    // configure bridge
    aclManager = await getACLManager();
    await waitForTx(await aclManager.addBridge(users[2].address));

    await waitForTx(
      await configurator.connect(poolAdmin.signer).updateBridgeProtocolFee(bridgeProtocolFeeBps)
    );

    // configure oracle
    const { aaveOracle, addressesProvider, oracle } = testEnv;
    oracleBaseDecimals = (await aaveOracle.BASE_CURRENCY_UNIT()).toString().length - 1;
    await waitForTx(await addressesProvider.setPriceOracle(oracle.address));

    snapshot = await evmSnapshot();
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

  it('User 1 tries to use eth as collateral (revert expected)', async () => {
    const { users, pool, weth, helpersContract } = testEnv;

    const userDataBefore = await helpersContract.getUserReserveData(weth.address, users[1].address);
    expect(userDataBefore.usageAsCollateralEnabled).to.be.eq(false);

    await expect(
      pool.connect(users[1].signer).setUserUseReserveAsCollateral(weth.address, true)
    ).to.be.revertedWith(USER_IN_ISOLATION_MODE);

    const userDataAfter = await helpersContract.getUserReserveData(weth.address, users[1].address);
    expect(userDataAfter.usageAsCollateralEnabled).to.be.eq(false);
  });

  it('User 2 deposit dai and aave, then tries to use aave as collateral (revert expected)', async () => {
    const snap = await evmSnapshot();
    const {
      users: [, , user2],
      pool,
      dai,
      aave,
      helpersContract,
    } = testEnv;

    await dai.connect(user2.signer)['mint(uint256)'](utils.parseEther('1'));
    await dai.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user2.signer).supply(dai.address, utils.parseEther('1'), user2.address, 0);

    await aave.connect(user2.signer)['mint(uint256)'](utils.parseEther('1'));
    await aave.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user2.signer).supply(aave.address, utils.parseEther('1'), user2.address, 0);

    const userDaiDataBefore = await helpersContract.getUserReserveData(dai.address, user2.address);
    expect(userDaiDataBefore.usageAsCollateralEnabled).to.be.eq(true);

    const userAaveDataBefore = await helpersContract.getUserReserveData(
      aave.address,
      user2.address
    );
    expect(userAaveDataBefore.usageAsCollateralEnabled).to.be.eq(false);

    await expect(
      pool.connect(user2.signer).setUserUseReserveAsCollateral(aave.address, true)
    ).to.be.revertedWith(USER_IN_ISOLATION_MODE);

    const userDataAfter = await helpersContract.getUserReserveData(aave.address, user2.address);
    expect(userDataAfter.usageAsCollateralEnabled).to.be.eq(false);

    await evmRevert(snap);
  });

  it('User 2 (as bridge) mint 100 unbacked dai to user 1. Checks that dai is NOT activated as collateral', async () => {
    const { users, riskAdmin, pool, configurator, dai, helpersContract } = testEnv;

    // configure unbacked cap for dai
    expect(await configurator.connect(riskAdmin.signer).setUnbackedMintCap(dai.address, '10'));
    expect(
      await configurator
        .connect(riskAdmin.signer)
        .setUnbackedMintCap(dai.address, MAX_UNBACKED_MINT_CAP)
    );

    const reserveDataBefore = await getReserveData(helpersContract, dai.address);
    const tx = await waitForTx(
      await pool.connect(users[2].signer).mintUnbacked(dai.address, mintAmount, users[1].address, 0)
    );
    const { txTimestamp } = await getTxCostAndTimestamp(tx);
    const expectedDataAfter = calcExpectedReserveDataAfterMintUnbacked(
      mintAmount.toString(),
      reserveDataBefore,
      txTimestamp
    );
    const reserveDataAfter = await getReserveData(helpersContract, dai.address);
    expectEqual(reserveDataAfter, expectedDataAfter);

    const userData = await helpersContract.getUserReserveData(dai.address, users[1].address);
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

    await pool.connect(users[1].signer).withdraw(dai.address, MAX_UINT_AMOUNT, users[1].address);

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
    const { dai, aave, weth, users, pool } = testEnv;

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
    ).to.be.revertedWith(ASSET_NOT_BORROWABLE_IN_ISOLATION);
  });

  it('User 2 tries to borrow some ETH on behalf of User 1 (revert expected)', async () => {
    const { users, pool, dai, weth } = testEnv;

    await expect(
      pool
        .connect(users[2].signer)
        .borrow(
          weth.address,
          utils.parseEther('0.0000001'),
          RateMode.Variable,
          AAVE_REFERRAL,
          users[1].address
        )
    ).to.be.revertedWith(ASSET_NOT_BORROWABLE_IN_ISOLATION);
  });

  it('User 1 borrows 10 DAI. Check debt ceiling', async () => {
    const { dai, aave, users, pool } = testEnv;

    const borrowAmount = utils.parseEther('10');
    await expect(
      pool.connect(users[1].signer).borrow(dai.address, borrowAmount, '2', 0, users[1].address)
    )
      .to.emit(pool, 'IsolationModeTotalDebtUpdated')
      .withArgs(aave.address, 1000);

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
    await expect(
      pool.connect(users[3].signer).borrow(dai.address, borrowAmount, '2', 0, users[3].address)
    )
      .to.emit(pool, 'IsolationModeTotalDebtUpdated')
      .withArgs(aave.address, 2000);
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
    ).to.be.revertedWith(DEBT_CEILING_EXCEEDED);
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

    await expect(
      pool.connect(users[1].signer).repay(dai.address, MAX_UINT_AMOUNT, '2', users[1].address)
    )
      .to.emit(pool, 'IsolationModeTotalDebtUpdated')
      .withArgs(aave.address, 0);
    const reserveData = await pool.getReserveData(aave.address);

    expect(reserveData.isolationModeTotalDebt).to.be.eq('0');
  });

  it('Perform liquidation of isolation mode asset', async () => {
    // We need to look at how the user getting liquidated was positioned. If the asset is isolation mode, then it needs to impact that as well
    const {
      dai,
      aave,
      oracle,
      addressesProvider,
      helpersContract,
      users: [, , , , borrower, liquidator],
      pool,
    } = testEnv;

    // Fund depositor and liquidator
    const liquidatorAmount = utils.parseUnits('1000', 18);
    await dai.connect(liquidator.signer)['mint(uint256)'](liquidatorAmount.mul(2));
    await dai.connect(liquidator.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(liquidator.signer)
      .supply(dai.address, liquidatorAmount, liquidator.address, 0);

    const userGlobalDataBefore = await pool.getUserAccountData(borrower.address);
    expect(userGlobalDataBefore.totalCollateralBase).to.be.eq(0);

    const depositAmount = utils.parseUnits('1', 18);
    await aave.connect(borrower.signer)['mint(uint256)'](depositAmount);
    await aave.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(borrower.signer).supply(aave.address, depositAmount, borrower.address, 0);

    const userData = await helpersContract.getUserReserveData(aave.address, borrower.address);
    expect(userData.usageAsCollateralEnabled).to.be.eq(true);

    const borrowAmount = utils.parseUnits('50', 18);
    await pool
      .connect(borrower.signer)
      .borrow(dai.address, borrowAmount, RateMode.Variable, '0', borrower.address);

    const daiPrice = await oracle.getAssetPrice(dai.address);
    await oracle.setAssetPrice(dai.address, daiPrice.mul(10));

    const userGlobalData = await pool.getUserAccountData(borrower.address);

    expect(userGlobalData.healthFactor).to.be.lt(utils.parseEther('1'));

    const isolationModeTotalDebtBefore = (await pool.getReserveData(aave.address))
      .isolationModeTotalDebt;
    const expectedAmountAfter = isolationModeTotalDebtBefore.sub(
      borrowAmount.div(2).div(BigNumber.from(10).pow(16))
    );

    await expect(
      pool
        .connect(liquidator.signer)
        .liquidationCall(aave.address, dai.address, borrower.address, borrowAmount.div(2), false)
    )
      .to.emit(pool, 'IsolationModeTotalDebtUpdated')
      .withArgs(aave.address, expectedAmountAfter);

    const isolationModeTotalDebtAfter = (await pool.getReserveData(aave.address))
      .isolationModeTotalDebt;

    expect(isolationModeTotalDebtAfter).to.be.eq(expectedAmountAfter);
  });

  it('User 5 supplies weth and dai. User 6 supplies AAVE and transfers to User 5', async () => {
    const { weth, dai, aave, aAave, users, pool, helpersContract } = testEnv;

    const wethAmount = utils.parseEther('1');
    await weth.connect(users[5].signer)['mint(uint256)'](wethAmount);
    await weth.connect(users[5].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[5].signer).supply(weth.address, wethAmount, users[5].address, 0);

    const daiAmount = utils.parseEther('100');
    await dai.connect(users[5].signer)['mint(uint256)'](daiAmount);
    await dai.connect(users[5].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[5].signer).supply(dai.address, daiAmount, users[5].address, 0);

    const aaveAmount = utils.parseEther('100');
    await aave.connect(users[6].signer)['mint(uint256)'](aaveAmount);
    await aave.connect(users[6].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[6].signer).supply(aave.address, aaveAmount, users[6].address, 0);
    await aAave.connect(users[6].signer).transfer(users[5].address, aaveAmount);

    const wethUserData = await helpersContract.getUserReserveData(weth.address, users[5].address);
    const daiUserData = await helpersContract.getUserReserveData(dai.address, users[5].address);
    const aaveUserData = await helpersContract.getUserReserveData(aave.address, users[5].address);
    expect(daiUserData.usageAsCollateralEnabled).to.be.eq(true);
    expect(wethUserData.usageAsCollateralEnabled).to.be.eq(true);
    expect(aaveUserData.usageAsCollateralEnabled).to.be.eq(false);
  });

  it('User 5s isolation mode asset is liquidated by User 6', async () => {
    const { weth, dai, aave, aAave, users, pool, helpersContract, oracle } = testEnv;

    await evmRevert(snapshot);
    snapshot = await evmSnapshot();

    const daiAmount = utils.parseEther('700');
    await dai.connect(users[5].signer)['mint(uint256)'](daiAmount);
    await dai.connect(users[5].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[5].signer).supply(dai.address, daiAmount, users[5].address, 0);

    const aaveAmount = utils.parseEther('.3');
    await aave.connect(users[6].signer)['mint(uint256)'](aaveAmount);
    await aave.connect(users[6].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[6].signer).supply(aave.address, aaveAmount, users[6].address, 0);

    // borrow with health factor just above 1
    const userGlobalData = await pool.getUserAccountData(users[6].address);
    const daiPrice = await oracle.getAssetPrice(dai.address);
    let amountDAIToBorrow = await convertToCurrencyDecimals(
      dai.address,
      userGlobalData.availableBorrowsBase.div(daiPrice.toString()).percentMul(9999).toString()
    );
    await pool
      .connect(users[6].signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, 0, users[6].address);

    // advance time so health factor is less than one and liquidate
    await advanceTimeAndBlock(86400 * 365 * 100);
    const userDaiReserveDataBefore = await getUserData(
      pool,
      helpersContract,
      dai.address,
      users[6].address
    );
    const amountToLiquidate = userDaiReserveDataBefore.currentVariableDebt.div(2);
    await dai.connect(users[5].signer)['mint(uint256)'](daiAmount);
    const tx = await pool
      .connect(users[5].signer)
      .liquidationCall(aave.address, dai.address, users[6].address, amountToLiquidate, true);
    await tx.wait();

    // confirm the newly received aave tokens (in isolation mode) cannot be used as collateral
    const userData = await helpersContract.getUserReserveData(aave.address, users[5].address);
    expect(userData.usageAsCollateralEnabled).to.be.eq(false);
  });

  it('User 1 supplies AAVE and borrows DAI in isolation, AAVE exits isolation. User 1 repay and withdraw. AAVE enters isolation again', async () => {
    await evmRevert(snapshot);

    const { pool, configurator, helpersContract, users, poolAdmin, dai, aave } = testEnv;

    // Depositor supplies DAI
    await dai.connect(users[0].signer)['mint(uint256)'](depositAmount);
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[0].signer).supply(dai.address, depositAmount, users[0].address, 0);

    // User 1 supplies AAVE in isolation mode
    const aaveAmountToSupply = utils.parseEther('2');
    await aave.connect(users[1].signer)['mint(uint256)'](aaveAmountToSupply);
    await aave.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .supply(aave.address, aaveAmountToSupply, users[1].address, 0);

    // User 1 borrows DAI against isolated AAVE
    const { isolationModeTotalDebt: isolationModeTotalDebtBeforeBorrow } =
      await pool.getReserveData(aave.address);
    const isolationModeTotalDebtAfterBorrow = isolationModeTotalDebtBeforeBorrow.add(1000);
    const daiAmountToBorrow = utils.parseEther('10');
    expect(
      await pool
        .connect(users[1].signer)
        .borrow(dai.address, daiAmountToBorrow, '2', 0, users[1].address)
    )
      .to.emit(pool, 'IsolationModeTotalDebtUpdated')
      .withArgs(aave.address, isolationModeTotalDebtAfterBorrow);

    const reserveDataAfterBorrow = await pool.getReserveData(aave.address);
    expect(reserveDataAfterBorrow.isolationModeTotalDebt).to.be.eq(
      isolationModeTotalDebtAfterBorrow
    );

    // AAVE exits isolation mode (debt ceiling = 0)
    const oldAaveDebtCeiling = await helpersContract.getDebtCeiling(aave.address);
    const newAaveDebtCeiling = 0;
    expect(
      await configurator.connect(poolAdmin.signer).setDebtCeiling(aave.address, newAaveDebtCeiling)
    )
      .to.emit(configurator, 'DebtCeilingChanged')
      .withArgs(aave.address, oldAaveDebtCeiling, newAaveDebtCeiling);

    expect(await helpersContract.getDebtCeiling(aave.address)).to.be.eq(newAaveDebtCeiling);
    expect((await pool.getReserveData(aave.address)).isolationModeTotalDebt).to.be.eq(
      0,
      'isolationModeTotalDebt when entering isolation mode'
    );

    // User 1 borrows 1 DAI
    await pool
      .connect(users[1].signer)
      .borrow(dai.address, utils.parseEther('1'), '2', 0, users[1].address);

    // User 1 repays debt and withdraw
    await dai.connect(users[1].signer)['mint(uint256)'](utils.parseEther('20'));
    await dai.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[1].signer).repay(dai.address, MAX_UINT_AMOUNT, '2', users[1].address);
    await pool.connect(users[1].signer).withdraw(aave.address, MAX_UINT_AMOUNT, users[1].address);

    // AAVE enters isolation mode again
    expect(await configurator.connect(poolAdmin.signer).setDebtCeiling(aave.address, 100))
      .to.emit(configurator, 'DebtCeilingChanged')
      .withArgs(aave.address, 0, 100);

    expect(await helpersContract.getDebtCeiling(aave.address)).to.be.eq(100);
    expect((await pool.getReserveData(aave.address)).isolationModeTotalDebt).to.be.eq(
      0,
      'isolationModeTotalDebt when entering isolation mode'
    );
  });
});
