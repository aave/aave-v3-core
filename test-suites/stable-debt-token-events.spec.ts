import {
  evmSnapshot,
  evmRevert,
  advanceTimeAndBlock,
  MintableERC20__factory,
} from '@aave/deploy-v3';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from '@ethersproject/bignumber';
import { TransactionReceipt } from '@ethersproject/providers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { RateMode } from '../helpers/types';
import { Pool, StableDebtToken } from '../types';
import { makeSuite, SignerWithAddress, TestEnv } from './helpers/make-suite';
import {
  supply,
  stableBorrow,
  repayStableBorrow,
  getStableDebtTokenEvent,
} from './helpers/utils/tokenization-events';

const DEBUG = false;

let balances = {
  balance: {},
};

const log = (str: string) => {
  if (DEBUG) console.log(str);
};

const printBalance = async (name: string, debtToken: StableDebtToken, userAddress: string) => {
  console.log(
    name,
    'balanceOf',
    await ethers.utils.formatEther(await debtToken.balanceOf(userAddress))
  );
};

const increaseSupplyIndex = async (
  pool: Pool,
  depositor: SignerWithAddress,
  collateral: string,
  assetToIncrease: string
) => {
  const collateralToken = MintableERC20__factory.connect(collateral, depositor.signer);
  const borrowingToken = MintableERC20__factory.connect(assetToIncrease, depositor.signer);

  await collateralToken
    .connect(depositor.signer)
    ['mint(address,uint256)'](
      depositor.address,
      await convertToCurrencyDecimals(collateralToken.address, '10000000')
    );
  await collateralToken.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
  await pool
    .connect(depositor.signer)
    .deposit(
      collateral,
      await convertToCurrencyDecimals(collateral, '100000'),
      depositor.address,
      '0'
    );

  const { aTokenAddress } = await pool.getReserveData(assetToIncrease);
  const availableLiquidity = await borrowingToken.balanceOf(aTokenAddress);
  await pool
    .connect(depositor.signer)
    .borrow(
      assetToIncrease,
      availableLiquidity.percentMul('20'),
      RateMode.Variable,
      0,
      depositor.address
    );

  await advanceTimeAndBlock(10000000);
};

const updateBalances = (
  balances: any,
  stableDebtDai: StableDebtToken,
  receipt: TransactionReceipt
) => {
  let events = getStableDebtTokenEvent(stableDebtDai, receipt, 'Mint');
  for (const ev of events) {
    balances.balance[ev.onBehalfOf] = balances.balance[ev.onBehalfOf]?.add(ev.amount);
  }
  events = getStableDebtTokenEvent(stableDebtDai, receipt, 'Burn');
  for (const ev of events) {
    balances.balance[ev.from] = balances.balance[ev.from]?.sub(ev.amount.add(ev.balanceIncrease));
    balances.balance[ev.from] = balances.balance[ev.from]?.add(ev.balanceIncrease);
  }
};

makeSuite('StableDebtToken: Events', (testEnv: TestEnv) => {
  let alice, bob, depositor, depositor2;

  let snapId;

  before(async () => {
    const { users, pool, dai, weth } = testEnv;
    [alice, bob, depositor, depositor2] = users;

    const amountToMint = await convertToCurrencyDecimals(dai.address, '10000000');
    const usersToInit = [alice, bob, depositor, depositor2];
    for (const user of usersToInit) {
      await dai.connect(user.signer)['mint(uint256)'](amountToMint);
      await weth.connect(user.signer)['mint(address,uint256)'](user.address, amountToMint);
      await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
      await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    }

    // Depositors
    await pool.connect(depositor.signer).supply(weth.address, amountToMint, depositor.address, '0');
    await pool.connect(depositor.signer).supply(dai.address, amountToMint, depositor.address, '0');
    await pool
      .connect(depositor2.signer)
      .supply(weth.address, amountToMint, depositor2.address, '0');
    await pool
      .connect(depositor2.signer)
      .supply(dai.address, amountToMint, depositor2.address, '0');
  });

  beforeEach(async () => {
    snapId = await evmSnapshot();

    // Init balances
    balances = {
      balance: {
        [alice.address]: BigNumber.from(0),
        [bob.address]: BigNumber.from(0),
      },
    };
  });

  afterEach(async () => {
    await evmRevert(snapId);
  });

  it('Alice borrows 100 DAI, borrows 50 DAI, repays 20 DAI, repays 10 DAI, borrows 100 DAI, repays 220 DAI (without index change)', async () => {
    await testMultipleBorrowsAndRepays(false);
  });

  it('Alice borrows 100 DAI, borrows 50 DAI, repays 20 DAI, repays 10 DAI, borrows 100 DAI, repays 220 DAI (with index change)', async () => {
    await testMultipleBorrowsAndRepays(true);
  });

  const testMultipleBorrowsAndRepays = async (indexChange: boolean) => {
    const { pool, dai, stableDebtDai, weth } = testEnv;

    let rcpt;
    let aliceBalanceBefore = await stableDebtDai.balanceOf(alice.address);

    log('- Alice supplies 1000 WETH');
    await supply(pool, alice, weth.address, '100000', alice.address, false);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 100 DAI');
    rcpt = await stableBorrow(pool, alice, dai.address, '100', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 50 DAI more');
    rcpt = await stableBorrow(pool, alice, dai.address, '50', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (DEBUG) {
      await printBalance('alice', stableDebtDai, alice.address);
    }

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 20 DAI');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '20', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 10 DAI');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '10', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor2, weth.address, dai.address);
    }

    log('- Alice borrows 100 DAI more');
    rcpt = await stableBorrow(pool, alice, dai.address, '100', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor2, weth.address, dai.address);
    }

    log('- Alice repays 220 DAI');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '220', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    // Check final balances
    rcpt = await stableBorrow(pool, alice, dai.address, '1', alice.address);
    updateBalances(balances, stableDebtDai, rcpt);
    const aliceBalanceAfter = await stableDebtDai.balanceOf(alice.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      2
    );
  };

  it('Alice borrows 100 DAI, Bob borrows 100 DAI, Alice borrows 50 DAI, repays 150 DAI and repays 100 DAI on behalf of Bob, borrows 10 DAI more (without index change)', async () => {
    await testMultipleBorrowsAndRepaysOnBehalf(false);
  });

  it('Alice borrows 100 DAI, Bob borrows 100 DAI, Alice borrows 50 DAI, repays 150 DAI and repays 100 DAI on behalf of Bob, borrows 10 DAI more (with index change)', async () => {
    await testMultipleBorrowsAndRepaysOnBehalf(true);
  });

  const testMultipleBorrowsAndRepaysOnBehalf = async (indexChange: boolean) => {
    const { pool, dai, stableDebtDai, weth } = testEnv;

    let rcpt;
    let aliceBalanceBefore = await stableDebtDai.balanceOf(alice.address);
    let bobBalanceBefore = await stableDebtDai.balanceOf(bob.address);

    log('- Alice supplies 1000 WETH');
    await supply(pool, alice, weth.address, '1000', alice.address, false);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 100 DAI');
    rcpt = await stableBorrow(pool, alice, dai.address, '100', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Bob supplies 1000 WETH');
    await supply(pool, bob, weth.address, '1000', bob.address, false);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Bob borrows 100 DAI');
    rcpt = await stableBorrow(pool, bob, dai.address, '100', bob.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 50 DAI more');
    rcpt = await stableBorrow(pool, alice, dai.address, '50', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 150 DAI');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '150', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 50 DAI on behalf of Bob');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '50', bob.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 50 DAI on behalf of Bob');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '50', bob.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 10 DAI more');
    rcpt = await stableBorrow(pool, alice, dai.address, '10', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    if (DEBUG) {
      await printBalance('alice', stableDebtDai, alice.address);
      await printBalance('bob', stableDebtDai, bob.address);
    }

    // Check final balances
    rcpt = await stableBorrow(pool, alice, dai.address, '1', alice.address);
    updateBalances(balances, stableDebtDai, rcpt);
    const aliceBalanceAfter = await stableDebtDai.balanceOf(alice.address);

    rcpt = await stableBorrow(pool, bob, dai.address, '1', bob.address);
    updateBalances(balances, stableDebtDai, rcpt);
    const bobBalanceAfter = await stableDebtDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      5
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 5);
  };

  it('Alice borrows 100 DAI, Bob borrows 100 DAI on behalf of Alice, Bob borrows 50 DAI, Alice borrows 50 DAI, repays 250 DAI and repays 50 DAI on behalf of Bob, borrows 10 DAI more (without index change)', async () => {
    await testMultipleBorrowsOnBehalfAndRepaysOnBehalf(false);
  });

  it('Alice borrows 100 DAI, Bob borrows 100 DAI on behalf of Alice, Bob borrows 50 DAI, Alice borrows 50 DAI, repays 250 DAI and repays 50 DAI on behalf of Bob, borrows 10 DAI more (with index change)', async () => {
    await testMultipleBorrowsOnBehalfAndRepaysOnBehalf(true);
  });

  const testMultipleBorrowsOnBehalfAndRepaysOnBehalf = async (indexChange: boolean) => {
    const { pool, dai, stableDebtDai, weth } = testEnv;

    let rcpt;
    let aliceBalanceBefore = await stableDebtDai.balanceOf(alice.address);
    let bobBalanceBefore = await stableDebtDai.balanceOf(bob.address);

    log('- Alice supplies 1000 WETH');
    await supply(pool, alice, weth.address, '1000', alice.address, false);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 100 DAI');
    rcpt = await stableBorrow(pool, alice, dai.address, '100', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Bob borrows 100 DAI on behalf of Alice');
    await stableDebtDai.connect(alice.signer).approveDelegation(bob.address, MAX_UINT_AMOUNT);
    rcpt = await stableBorrow(pool, bob, dai.address, '100', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Bob supplies 1000 WETH');
    await supply(pool, bob, weth.address, '1000', bob.address, false);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Bob borrows 50 DAI');
    rcpt = await stableBorrow(pool, bob, dai.address, '50', bob.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 50 DAI');
    rcpt = await stableBorrow(pool, alice, dai.address, '50', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 250 DAI');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '250', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice repays 50 DAI on behalf of Bob');
    rcpt = await repayStableBorrow(pool, alice, dai.address, '50', bob.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    log('- Alice borrows 10 DAI more');
    rcpt = await stableBorrow(pool, alice, dai.address, '10', alice.address, DEBUG);
    updateBalances(balances, stableDebtDai, rcpt);

    if (indexChange) {
      log('- Increase index due to great borrow of DAI');
      await increaseSupplyIndex(pool, depositor, weth.address, dai.address);
    }

    if (DEBUG) {
      await printBalance('alice', stableDebtDai, alice.address);
      await printBalance('bob', stableDebtDai, bob.address);
    }

    // Check final balances
    rcpt = await stableBorrow(pool, alice, dai.address, '1', alice.address);
    updateBalances(balances, stableDebtDai, rcpt);
    const aliceBalanceAfter = await stableDebtDai.balanceOf(alice.address);

    rcpt = await stableBorrow(pool, bob, dai.address, '1', bob.address);
    updateBalances(balances, stableDebtDai, rcpt);
    const bobBalanceAfter = await stableDebtDai.balanceOf(bob.address);

    expect(aliceBalanceAfter).to.be.closeTo(
      aliceBalanceBefore.add(balances.balance[alice.address]),
      5
    );
    expect(bobBalanceAfter).to.be.closeTo(bobBalanceBefore.add(balances.balance[bob.address]), 5);
  };
});
