import { expect } from 'chai';
import { utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { advanceTimeAndBlock, setBlocktime, timeLatest } from '../helpers/misc-utils';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('AToken: Repay', (testEnv: TestEnv) => {
  before('User 0 deposits 100 DAI, user 1 deposits 1 WETH, borrows 50 DAI', async () => {
    const {
      weth,
      pool,
      dai,
      users: [user0, user1],
    } = testEnv;

    const daiAmount = utils.parseEther('100');
    const wethAmount = utils.parseEther('1');
    await dai.connect(user0.signer).mint(daiAmount);
    await weth.connect(user1.signer).mint(wethAmount);

    await dai.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await expect(
      await pool.connect(user0.signer).deposit(dai.address, daiAmount, user0.address, 0)
    );
    await expect(
      await pool.connect(user1.signer).deposit(weth.address, wethAmount, user1.address, 0)
    );

    await expect(
      await pool.connect(user1.signer).borrow(dai.address, daiAmount.div(2), 2, 0, user1.address)
    );
  });

  it('User 1 tries to repay using aTokens without actually holding aDAI', async () => {
    const {
      pool,
      dai,
      users: [, user1],
    } = testEnv;
    const repayAmount = utils.parseEther('25');

    await expect(
      pool.connect(user1.address).repayWithATokens(dai.address, repayAmount, 2, user1.address)
    ).to.be.reverted;
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

    await expect(
      await pool.connect(user1.signer).repayWithATokens(dai.address, repayAmount, 2, user1.address)
    );
    const balanceAfter = await aDai.balanceOf(user1.address);
    const debtAfter = await variableDebtDai.balanceOf(user1.address);

    expect(balanceAfter).to.be.closeTo(balanceBefore.sub(repayAmount), 2);
    expect(debtAfter).to.be.closeTo(debtBefore.sub(repayAmount), 2);
  });

  it('User 0 repays the rest of the debt on behalf of user 1 using aTokens', async () => {
    const {
      pool,
      dai,
      aDai,
      variableDebtDai,
      users: [user0, user1],
    } = testEnv;

    await advanceTimeAndBlock(86400);

    const time = await timeLatest();

    await setBlocktime(time.add(1).toNumber());

    const balanceBefore = await aDai.balanceOf(user0.address, { blockTag: 'pending' });
    const debtBefore = await variableDebtDai.balanceOf(user1.address, { blockTag: 'pending' });

    await expect(
      await pool.connect(user0.signer).repayWithATokens(dai.address, debtBefore, 2, user1.address)
    );

    const balanceAfter = await aDai.balanceOf(user0.address);
    const debtAfter = await variableDebtDai.balanceOf(user1.address);

    expect(balanceAfter).to.be.closeTo(balanceBefore.sub(debtBefore), 2);
    expect(debtAfter).to.be.equal(0);
  });
});
