import {
  evmSnapshot,
  evmRevert,
  advanceTimeAndBlock,
  ZERO_ADDRESS,
  MintableERC20__factory,
} from '@aave/deploy-v3';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { TransactionReceipt } from '@ethersproject/providers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { RateMode } from '../helpers/types';
import { Pool, AToken } from '../types';
import { makeSuite, SignerWithAddress, TestEnv } from './helpers/make-suite';
import {
  supply,
  transfer,
  withdraw,
  getATokenEvent,
  transferFrom,
  printATokenEvents,
} from './helpers/utils/tokenization-events';

const DEBUG = false;

let balances = {
  balance: {},
};

const log = (str: string) => {
  if (DEBUG) console.log(str);
};

const printBalance = async (name: string, aToken: any, userAddress: string) => {
  console.log(
    name,
    'balanceOf',
    await ethers.utils.formatEther(await aToken.balanceOf(userAddress)),
    'scaledBalance',
    await ethers.utils.formatEther(await aToken.scaledBalanceOf(userAddress))
  );
};

const increaseSupplyIndex = async (
  pool: Pool,
  borrower: SignerWithAddress,
  collateral: string,
  assetToIncrease: string
) => {
  const collateralToken = MintableERC20__factory.connect(collateral, borrower.signer);
  const borrowingToken = MintableERC20__factory.connect(assetToIncrease, borrower.signer);

  await collateralToken
    .connect(borrower.signer)
    ['mint(address,uint256)'](
      borrower.address,
      await convertToCurrencyDecimals(collateralToken.address, '10000000')
    );
  await collateralToken.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
  await pool
    .connect(borrower.signer)
    .supply(
      collateral,
      await convertToCurrencyDecimals(collateral, '100000'),
      borrower.address,
      '0'
    );

  const { aTokenAddress } = await pool.getReserveData(assetToIncrease);
  const availableLiquidity = await borrowingToken.balanceOf(aTokenAddress);
  await pool
    .connect(borrower.signer)
    .borrow(
      assetToIncrease,
      availableLiquidity.percentMul('20'),
      RateMode.Variable,
      0,
      borrower.address
    );

  await advanceTimeAndBlock(10000000000);
};

const updateBalances = (balances: any, aToken: AToken, receipt: TransactionReceipt) => {
  let events = getATokenEvent(aToken, receipt, 'Transfer');
  for (const ev of events) {
    if (ev.from == ZERO_ADDRESS || ev.to == ZERO_ADDRESS) continue;
    balances.balance[ev.from] = balances.balance[ev.from]?.sub(ev.value);
    balances.balance[ev.to] = balances.balance[ev.to]?.add(ev.value);
  }
  events = getATokenEvent(aToken, receipt, 'Mint');
  for (const ev of events) {
    balances.balance[ev.onBehalfOf] = balances.balance[ev.onBehalfOf]?.add(ev.value);
  }
  events = getATokenEvent(aToken, receipt, 'Burn');
  for (const ev of events) {
    balances.balance[ev.from] = balances.balance[ev.from]?.sub(ev.value.add(ev.balanceIncrease));
    balances.balance[ev.from] = balances.balance[ev.from]?.add(ev.balanceIncrease);
  }
};

makeSuite('AToken: Events', (testEnv: TestEnv) => {
  let alice, bob, eve, borrower, borrower2;

  let snapId;

  before(async () => {
    const { users, pool, dai, weth } = testEnv;
    [alice, bob, eve, borrower, borrower2] = users;

    const amountToMint = await convertToCurrencyDecimals(dai.address, '10000000');
    const usersToInit = [alice, bob, eve, borrower, borrower2];
    for (const user of usersToInit) {
      await dai.connect(user.signer)['mint(uint256)'](amountToMint);
      await weth.connect(user.signer)['mint(address,uint256)'](user.address, amountToMint);
      await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
      await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    }
  });

  beforeEach(async () => {
    snapId = await evmSnapshot();

    // Init balances
    balances = {
      balance: {
        [alice.address]: BigNumber.from(0),
        [bob.address]: BigNumber.from(0),
        [eve.address]: BigNumber.from(0),
      },
    };
  });

  afterEach(async () => {
    await evmRevert(snapId);
  });

  it('Alice and Bob supplies 1000, Alice transfer 500 to Bob, and withdraws 500 (without index change)', async () => {
    await testMultipleSupplyAndTransferAndWithdraw(false);
  });

  it('Alice and Bob supplies 1000, Alice transfer 500 to Bob, and withdraws 500 (with index change)', async () => {
    await testMultipleSupplyAndTransferAndWithdraw(true);
  });

  const testMultipleSupplyAndTransferAndWithdraw = async (indexChange: boolean) => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let balanceTransferEv;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);

    log('- Alice supplies 1000 DAI');
    rcpt = await supply(pool, alice, dai.address, '1000', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Bob supplies 1000 DAI');
    rcpt = await supply(pool, bob, dai.address, '1000', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice transfers 500 aDAI to Bob');
    const [fromScaledBefore, toScaledBefore] = await Promise.all([
      aDai.scaledBalanceOf(alice.address),
      aDai.scaledBalanceOf(bob.address),
    ]);
    rcpt = await transfer(pool, alice, dai.address, '500', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);
    balanceTransferEv = getATokenEvent(aDai, rcpt, 'BalanceTransfer')[0];
    expect(await aDai.scaledBalanceOf(alice.address)).to.be.eq(
      fromScaledBefore.sub(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );
    expect(await aDai.scaledBalanceOf(bob.address)).to.be.eq(
      toScaledBefore.add(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice withdraws 500 DAI to Bob');
    rcpt = await withdraw(pool, alice, dai.address, '500', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
  };

  it('Alice supplies 1000, supplies 200, transfers 100 out, withdraws 50 withdraws 100 to Bob, withdraws 200 (without index change)', async () => {
    await testMultipleSupplyAndWithdrawalsOnBehalf(false);
  });

  it('Alice supplies 1000, supplies 200, transfers 100 out, withdraws 50 withdraws 100 to Bob, withdraws 200 (with index change)', async () => {
    await testMultipleSupplyAndWithdrawalsOnBehalf(true);
  });

  const testMultipleSupplyAndWithdrawalsOnBehalf = async (indexChange: boolean) => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let balanceTransferEv;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);

    log('- Alice supplies 1000 DAI');
    rcpt = await supply(pool, alice, dai.address, '1000', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice supplies 200 DAI');
    rcpt = await supply(pool, alice, dai.address, '200', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice transfers 100 aDAI to Bob');
    const [fromScaledBefore, toScaledBefore] = await Promise.all([
      aDai.scaledBalanceOf(alice.address),
      aDai.scaledBalanceOf(bob.address),
    ]);
    rcpt = await transfer(pool, alice, dai.address, '100', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);
    balanceTransferEv = getATokenEvent(aDai, rcpt, 'BalanceTransfer')[0];
    expect(await aDai.scaledBalanceOf(alice.address)).to.be.eq(
      fromScaledBefore.sub(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );
    expect(await aDai.scaledBalanceOf(bob.address)).to.be.eq(
      toScaledBefore.add(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice withdraws 50 DAI');
    rcpt = await withdraw(pool, alice, dai.address, '50', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice withdraws 100 DAI to Bob');
    rcpt = await withdraw(pool, alice, dai.address, '100', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice withdraws 300 DAI');
    rcpt = await withdraw(pool, alice, dai.address, '300', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
  };

  it('Alice supplies 1000, supplies 200 to Bob, Bob supplies 100, Alice transfers 100 out, Alice withdraws 100, Alice withdraws 200 to Bob (without index change)', async () => {
    await testMultipleSupplyOnBehalfOfAndWithdrawals(false);
  });

  it('Alice supplies 1000, supplies 200 to Bob, Bob supplies 100, Alice transfers 100 out, Alice withdraws 100, Alice withdraws 200 to Bob (with index change)', async () => {
    await testMultipleSupplyOnBehalfOfAndWithdrawals(true);
  });

  const testMultipleSupplyOnBehalfOfAndWithdrawals = async (indexChange: boolean) => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let balanceTransferEv;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);

    log('- Alice supplies 1000 DAI');
    rcpt = await supply(pool, alice, dai.address, '1000', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice supplies 200 DAI to Bob');
    rcpt = await supply(pool, alice, dai.address, '200', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Bob supplies 100 DAI');
    rcpt = await supply(pool, bob, dai.address, '100', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice transfers 100 aDAI to Bob');
    const [fromScaledBefore, toScaledBefore] = await Promise.all([
      aDai.scaledBalanceOf(alice.address),
      aDai.scaledBalanceOf(bob.address),
    ]);
    rcpt = await transfer(pool, alice, dai.address, '100', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);
    balanceTransferEv = getATokenEvent(aDai, rcpt, 'BalanceTransfer')[0];
    expect(await aDai.scaledBalanceOf(alice.address)).to.be.eq(
      fromScaledBefore.sub(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );
    expect(await aDai.scaledBalanceOf(bob.address)).to.be.eq(
      toScaledBefore.add(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice withdraws 200 DAI to Bob');
    rcpt = await withdraw(pool, alice, dai.address, '200', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
  };

  it('Alice supplies 1000, transfers 100 to Bob, transfers 500 to itself, Bob transfers 500 from Alice to itself, withdraws 400 to Bob (without index change)', async () => {
    await testMultipleTransfersAndWithdrawals(false);
  });

  it('Alice supplies 1000, transfers 100 to Bob, transfers 500 to itself, Bob transfers 500 from Alice to itself, withdraws 400 to Bob  (with index change)', async () => {
    await testMultipleTransfersAndWithdrawals(true);
  });

  const testMultipleTransfersAndWithdrawals = async (indexChange: boolean) => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let balanceTransferEv;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);

    log('- Alice supplies 1000 DAI');
    rcpt = await supply(pool, alice, dai.address, '1000', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice transfers 100 DAI to Bob');
    let [fromScaledBefore, toScaledBefore] = await Promise.all([
      aDai.scaledBalanceOf(alice.address),
      aDai.scaledBalanceOf(bob.address),
    ]);
    rcpt = await transfer(pool, alice, dai.address, '100', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);
    balanceTransferEv = getATokenEvent(aDai, rcpt, 'BalanceTransfer')[0];
    expect(await aDai.scaledBalanceOf(alice.address)).to.be.eq(
      fromScaledBefore.sub(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );
    expect(await aDai.scaledBalanceOf(bob.address)).to.be.eq(
      toScaledBefore.add(balanceTransferEv.value),
      'Scaled balance emitted in BalanceTransfer event does not match'
    );

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice transfers 500 DAI to itself');
    fromScaledBefore = await aDai.scaledBalanceOf(alice.address);
    rcpt = await transfer(pool, alice, dai.address, '500', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);
    expect(await aDai.scaledBalanceOf(alice.address)).to.be.eq(
      fromScaledBefore,
      'Scaled balance should remain the same'
    );

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Bob transfersFrom Alice 500 DAI to Alice');
    fromScaledBefore = await aDai.scaledBalanceOf(alice.address);
    expect(
      await aDai
        .connect(alice.signer)
        .approve(bob.address, await convertToCurrencyDecimals(dai.address, '500'))
    );
    rcpt = await transferFrom(pool, bob, alice.address, dai.address, '500', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);
    expect(await aDai.scaledBalanceOf(alice.address)).to.be.eq(
      fromScaledBefore,
      'Scaled balance should remain the same'
    );

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, borrower, weth.address, dai.address);
    }

    log('- Alice withdraws 400 DAI to Bob');
    rcpt = await withdraw(pool, alice, dai.address, '200', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
  };

  it('Alice supplies 300000, withdraws 200000 to Bob, withdraws 5 to Bob', async () => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);

    log('- Alice supplies 300000 DAI');
    rcpt = await supply(pool, alice, dai.address, '300000', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Increase index due to great borrow of DAI');
    await increaseSupplyIndex(pool, borrower, weth.address, dai.address);

    log('- Alice withdraws 200000 DAI to Bob');
    rcpt = await withdraw(pool, alice, dai.address, '200000', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Increase index due to great borrow of DAI');
    await increaseSupplyIndex(pool, borrower, weth.address, dai.address);

    log('- Alice withdraws 5 DAI to Bob');
    rcpt = await withdraw(pool, alice, dai.address, '5', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
  });

  it('Bob supplies 1000, Alice supplies 200 on behalf of Bob, Bob withdraws 200 on behalf of Alice', async () => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);

    log('- Bob supplies 1000 DAI');
    rcpt = await supply(pool, bob, dai.address, '1000', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Increase index due to great borrow of DAI');
    await increaseSupplyIndex(pool, borrower, weth.address, dai.address);

    log('- Alice supplies 200 DAI to Bob');
    rcpt = await supply(pool, alice, dai.address, '200', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Increase index due to great borrow of DAI');
    await increaseSupplyIndex(pool, borrower, weth.address, dai.address);

    log('- Bob withdraws 200 DAI to Alice');
    rcpt = await withdraw(pool, bob, dai.address, '200', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
  });

  it('Alice supplies 1000 DAI and approves aDai to Bob, Bob transfers 500 to himself and 300 to Eve, index change, principal goes back to Alice', async () => {
    const { pool, dai, aDai, weth } = testEnv;

    let rcpt;
    let aliceBalanceBefore = await aDai.balanceOf(alice.address);
    let bobBalanceBefore = await aDai.balanceOf(bob.address);
    let eveBalanceBefore = await aDai.balanceOf(eve.address);

    log('- Alice supplies 1000 DAI');
    rcpt = await supply(pool, alice, dai.address, '1000', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Alice approves aDai to Bob');
    await aDai.connect(alice.signer).approve(bob.address, MAX_UINT_AMOUNT);

    log('- Bob transfers 500 aDai from Alice to himself');
    rcpt = await transferFrom(pool, bob, alice.address, dai.address, '500', bob.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Bob transfers 300 aDai from Alice to Eve');
    rcpt = await transferFrom(pool, bob, alice.address, dai.address, '300', eve.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Increase index due to great borrow of DAI');
    await increaseSupplyIndex(pool, borrower, weth.address, dai.address);

    log('- Bob transfers 500 back to Alice');
    rcpt = await transfer(pool, bob, dai.address, '500', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    log('- Eve transfers 500 back to Alice');
    rcpt = await transfer(pool, eve, dai.address, '300', alice.address, DEBUG);
    updateBalances(balances, aDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', aDai, alice.address);
      await printBalance('bob', aDai, bob.address);
      await printBalance('eve', aDai, eve.address);
    }

    // Check final balances
    rcpt = await supply(pool, alice, dai.address, '1', alice.address, false);
    updateBalances(balances, aDai, rcpt);
    const aliceBalanceAfter = await aDai.balanceOf(alice.address);

    rcpt = await supply(pool, bob, dai.address, '1', bob.address, false);
    updateBalances(balances, aDai, rcpt);
    const bobBalanceAfter = await aDai.balanceOf(bob.address);

    rcpt = await supply(pool, eve, dai.address, '1', eve.address, false);
    updateBalances(balances, aDai, rcpt);
    const eveBalanceAfter = await aDai.balanceOf(eve.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 2);
    expect(eveBalanceAfter).to.be.closeTo(eveBalanceBefore.add(balances.balance[eve.address]), 2);
  });
});
