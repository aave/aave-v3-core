import { MockATokenRepayment } from './../types/mocks/tokens/MockATokenRepayment';
import { MockATokenRepayment__factory } from './../types/factories/mocks/tokens/MockATokenRepayment__factory';
import {
  waitForTx,
  evmSnapshot,
  evmRevert,
  DefaultReserveInterestRateStrategy__factory,
  IStableDebtToken__factory,
  IVariableDebtToken__factory,
} from '@aave/deploy-v3';
import { parseUnits } from '@ethersproject/units';
import { expect } from 'chai';
import { utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { setBlocktime, timeLatest } from '../helpers/misc-utils';
import { RateMode } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { AaveDistributionManager__factory } from '@aave/deploy-v3/dist/types/typechain/factories/@aave/safety-module/contracts/stake';

makeSuite('AToken: Repay', (testEnv: TestEnv) => {
  let snapShot: string;
  let aTokenRepayImpl: MockATokenRepayment;

  before('User 0 deposits 100 DAI, user 1 deposits 1 WETH, borrows 50 DAI', async () => {
    const {
      weth,
      pool,
      dai,
      aDai,
      users: [user0, user1],
      deployer,
      configurator,
    } = testEnv;

    const daiAmount = utils.parseEther('100');
    const wethAmount = utils.parseEther('1');
    await waitForTx(await dai.connect(user0.signer)['mint(uint256)'](daiAmount));
    await waitForTx(await weth.connect(user1.signer)['mint(uint256)'](wethAmount));

    await waitForTx(await dai.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT));
    await waitForTx(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));

    aTokenRepayImpl = await new MockATokenRepayment__factory(deployer.signer).deploy(pool.address);

    await configurator.updateAToken({
      asset: dai.address,
      treasury: await aDai.RESERVE_TREASURY_ADDRESS(),
      incentivesController: await aDai.getIncentivesController(),
      name: await aDai.name(),
      symbol: await aDai.symbol(),
      implementation: aTokenRepayImpl.address,
      params: '0x',
    });

    expect(await pool.connect(user0.signer).deposit(dai.address, daiAmount, user0.address, 0));
    expect(await pool.connect(user1.signer).deposit(weth.address, wethAmount, user1.address, 0));

    expect(
      await pool.connect(user1.signer).borrow(dai.address, daiAmount.div(2), 2, 0, user1.address)
    );
  });

  beforeEach(async () => {
    snapShot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapShot);
  });

  it('User 1 tries to repay using aTokens without actually holding aDAI', async () => {
    const {
      pool,
      dai,
      users: [, user1],
    } = testEnv;
    const repayAmount = utils.parseEther('25');

    await expect(pool.connect(user1.signer).repayWithATokens(dai.address, repayAmount, 2)).to.be
      .reverted;
  });

  it('User 1 receives 25 aDAI from user 0, repays half of the debt', async () => {
    const {
      pool,
      dai,
      aDai,
      variableDebtDai,
      users: [user0, user1],
    } = testEnv;

    const repayAmount = utils.parseEther('25');

    await expect(await aDai.connect(user0.signer).transfer(user1.address, repayAmount));

    const time = await timeLatest();

    await setBlocktime(time.add(1).toNumber());

    const balanceBefore = await aDai.balanceOf(user1.address, { blockTag: 'pending' });
    const debtBefore = await variableDebtDai.balanceOf(user1.address, { blockTag: 'pending' });

    await expect(pool.connect(user1.signer).repayWithATokens(dai.address, repayAmount, 2))
      .to.emit(pool, 'Repay')
      .withArgs(dai.address, user1.address, user1.address, repayAmount, true)
      .and.not.to.emit(aTokenRepayImpl.attach(aDai.address), 'MockRepayment');
    const balanceAfter = await aDai.balanceOf(user1.address);
    const debtAfter = await variableDebtDai.balanceOf(user1.address);

    expect(balanceAfter).to.be.closeTo(balanceBefore.sub(repayAmount), 2);
    expect(debtAfter).to.be.closeTo(debtBefore.sub(repayAmount), 2);
  });

  it('User 1 receives 25 aDAI from user 0, use all aDai to repay debt', async () => {
    const {
      pool,
      dai,
      aDai,
      variableDebtDai,
      users: [user0, user1],
    } = testEnv;

    const transferAmount = utils.parseEther('25');
    expect(await aDai.connect(user0.signer).transfer(user1.address, transferAmount));

    const time = await timeLatest();
    await setBlocktime(time.add(1).toNumber());

    const balanceBefore = await aDai.balanceOf(user1.address, { blockTag: 'pending' });
    expect(balanceBefore).to.be.gt(transferAmount);

    const debtBefore = await variableDebtDai.balanceOf(user1.address, { blockTag: 'pending' });

    const action = await pool
      .connect(user1.signer)
      .repayWithATokens(dai.address, MAX_UINT_AMOUNT, 2);

    const tx = await waitForTx(action);

    const repayEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Repay(address,address,address,uint256,bool)')
    );

    await expect(action).to.not.emit(aTokenRepayImpl.attach(aDai.address), 'MockRepayment');

    const rawRepayEvents = tx.logs.filter((log) => log.topics[0] === repayEventSignature);
    const parsedRepayEvent = pool.interface.parseLog(rawRepayEvents[0]);

    expect(parsedRepayEvent.args.useATokens).to.be.true;
    expect(parsedRepayEvent.args.reserve).to.be.eq(dai.address);
    expect(parsedRepayEvent.args.repayer).to.be.eq(user1.address);
    expect(parsedRepayEvent.args.user).to.be.eq(user1.address);

    const repayAmount = parsedRepayEvent.args.amount;
    const balanceAfter = await aDai.balanceOf(user1.address);
    const debtAfter = await variableDebtDai.balanceOf(user1.address);

    expect(balanceAfter).to.be.eq(0);
    expect(debtAfter).to.be.closeTo(debtBefore.sub(repayAmount), 2);
  });

  it('User 1 receives 55 aDAI from user 0, repay all debt', async () => {
    const {
      pool,
      dai,
      aDai,
      variableDebtDai,
      users: [user0, user1],
    } = testEnv;

    const transferAmount = utils.parseEther('55');
    expect(await aDai.connect(user0.signer).transfer(user1.address, transferAmount));

    const time = await timeLatest();
    await setBlocktime(time.add(1).toNumber());

    const balanceBefore = await aDai.balanceOf(user1.address, { blockTag: 'pending' });
    const debtBefore = await variableDebtDai.balanceOf(user1.address, { blockTag: 'pending' });
    expect(debtBefore).to.be.gt(parseUnits('50', 18));

    const action = await pool
      .connect(user1.signer)
      .repayWithATokens(dai.address, MAX_UINT_AMOUNT, 2);

    const tx = await waitForTx(action);

    await expect(action).to.not.emit(aTokenRepayImpl.attach(aDai.address), 'MockRepayment');

    const repayEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Repay(address,address,address,uint256,bool)')
    );

    const rawRepayEvents = tx.logs.filter((log) => log.topics[0] === repayEventSignature);
    const parsedRepayEvent = pool.interface.parseLog(rawRepayEvents[0]);

    expect(parsedRepayEvent.args.useATokens).to.be.true;
    expect(parsedRepayEvent.args.reserve).to.be.eq(dai.address);
    expect(parsedRepayEvent.args.repayer).to.be.eq(user1.address);
    expect(parsedRepayEvent.args.user).to.be.eq(user1.address);

    const repayAmount = parsedRepayEvent.args.amount;
    const balanceAfter = await aDai.balanceOf(user1.address);
    const debtAfter = await variableDebtDai.balanceOf(user1.address);

    expect(debtAfter).to.be.eq(0);
    expect(balanceAfter).to.be.eq(balanceBefore.sub(repayAmount));
  });

  it('Check interest rates after repaying with aTokens', async () => {
    const {
      weth,
      dai,
      aDai,
      pool,
      helpersContract,
      users: [user],
    } = testEnv;

    const depositAmount = parseUnits('1000', 18);
    await dai.connect(user.signer)['mint(uint256)'](depositAmount);
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).supply(dai.address, depositAmount, user.address, 0);

    const collateralAmount = parseUnits('100', 18);
    await weth.connect(user.signer)['mint(uint256)'](collateralAmount);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).supply(weth.address, collateralAmount, user.address, 0);

    const borrowAmount = parseUnits('500', 18);
    await pool
      .connect(user.signer)
      .borrow(dai.address, borrowAmount, RateMode.Variable, 0, user.address);

    // Now we repay 250 with aTokens
    const repayAmount = parseUnits('250', 18);
    const action = await pool
      .connect(user.signer)
      .repayWithATokens(dai.address, repayAmount, RateMode.Variable);

    await expect(action).to.not.emit(aTokenRepayImpl.attach(aDai.address), 'MockRepayment');

    const reserveData = await pool.getReserveData(dai.address);
    const strategy = DefaultReserveInterestRateStrategy__factory.connect(
      reserveData.interestRateStrategyAddress,
      user.signer
    );

    const stableDebtToken = IStableDebtToken__factory.connect(
      reserveData.stableDebtTokenAddress,
      user.signer
    );
    const stableDebtData = await stableDebtToken.getSupplyData();

    const variableDebtToken = IVariableDebtToken__factory.connect(
      reserveData.variableDebtTokenAddress,
      user.signer
    );
    const scaledTotalSupply = await variableDebtToken.scaledTotalSupply();
    const variableDebt = scaledTotalSupply.rayMul(
      await pool.getReserveNormalizedVariableDebt(dai.address)
    );

    const expectedRates = await strategy.calculateInterestRates({
      unbacked: 0,
      liquidityAdded: 0,
      liquidityTaken: 0,
      totalStableDebt: stableDebtData[1],
      totalVariableDebt: variableDebt,
      aToken: aDai.address,
      reserve: dai.address,
      reserveFactor: (await helpersContract.getReserveConfigurationData(dai.address)).reserveFactor,
      averageStableBorrowRate: stableDebtData[2],
    });

    expect(reserveData.currentLiquidityRate).to.be.eq(expectedRates[0]);
    expect(reserveData.currentStableBorrowRate).to.be.eq(expectedRates[1]);
    expect(reserveData.currentVariableBorrowRate).to.be.eq(expectedRates[2]);
  });
});
