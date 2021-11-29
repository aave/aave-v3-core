import { waitForTx, advanceTimeAndBlock, evmSnapshot, evmRevert } from '@aave/deploy-v3';
import { parseUnits } from '@ethersproject/units';
import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { setBlocktime, timeLatest } from '../helpers/misc-utils';
import { RateMode } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('AToken: Repay', (testEnv: TestEnv) => {
  let snapFresh: string;
  before('User 0 deposits 100 DAI, user 1 deposits 1 WETH, borrows 50 DAI', async () => {
    snapFresh = await evmSnapshot();
    const {
      weth,
      pool,
      dai,
      users: [user0, user1],
    } = testEnv;

    const daiAmount = utils.parseEther('100');
    const wethAmount = utils.parseEther('1');
    await waitForTx(await dai.connect(user0.signer)['mint(uint256)'](daiAmount));
    await waitForTx(await weth.connect(user1.signer)['mint(uint256)'](wethAmount));

    await waitForTx(await dai.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT));
    await waitForTx(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));

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
      pool.connect(user1.signer).repayWithATokens(dai.address, repayAmount, 2, user1.address)
    )
      .to.emit(pool, 'Repay')
      .withArgs(dai.address, user1.address, user1.address, repayAmount, true);
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

  it('Repaying with ATokens to create bad debt for the protocol (revert expect)', async () => {
    await evmRevert(snapFresh);
    const {
      pool,
      usdc,
      weth,
      dai,
      users: [alice, bob, depositor],
    } = testEnv;

    // This is not the optimal attack, can be done better if you want to steal as much as possible.

    const bobSupplyDai = parseUnits('1000', 18);
    const bobBorrowUSDC = parseUnits('700', 6);
    expect(await dai.connect(bob.signer)['mint(uint256)'](bobSupplyDai));

    const aliceSupplyWeth = parseUnits('10', 18);
    const aliceBorrowDai = parseUnits('999', 18);
    expect(await weth.connect(alice.signer)['mint(uint256)'](aliceSupplyWeth));

    const wethValueBefore = await weth.balanceOf(alice.address);
    const usdValueBefore = (await dai.balanceOf(bob.address)).add(
      (await usdc.balanceOf(bob.address))
        .mul(BigNumber.from(10).pow(12))
        .add(await dai.balanceOf(alice.address))
    );

    // Fund pool with usdc
    expect(await usdc.connect(depositor.signer)['mint(uint256)'](parseUnits('1000', 6)));
    expect(await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool
        .connect(depositor.signer)
        .supply(usdc.address, parseUnits('1000', 6), depositor.address, 0)
    );

    // Bob supply dai and borrow usdc
    expect(await dai.connect(bob.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await pool.connect(bob.signer).supply(dai.address, bobSupplyDai, bob.address, 0));
    expect(
      await pool
        .connect(bob.signer)
        .borrow(usdc.address, bobBorrowUSDC, RateMode.Variable, 0, bob.address)
    );

    // Alice supply eth and borrow dai
    expect(await weth.connect(alice.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(alice.signer).supply(weth.address, aliceSupplyWeth, alice.address, 0)
    );
    expect(
      await pool
        .connect(alice.signer)
        .borrow(dai.address, aliceBorrowDai, RateMode.Variable, 0, alice.address)
    );
    console.log(`Here`);

    // Bob repay
    expect(
      await pool
        .connect(bob.signer)
        .repayWithATokens(dai.address, bobSupplyDai, RateMode.Variable, alice.address)
    );
    expect(await pool.connect(alice.signer).withdraw(weth.address, MAX_UINT_AMOUNT, alice.address));

    const wethValueAfter = await weth.balanceOf(alice.address);
    const usdValueAfter = (await dai.balanceOf(bob.address)).add(
      (await usdc.balanceOf(bob.address))
        .mul(BigNumber.from(10).pow(12))
        .add(await dai.balanceOf(alice.address))
    );

    expect(wethValueAfter).to.be.lte(wethValueBefore);
    expect(usdValueAfter).to.be.lte(usdValueBefore);
  });
});
