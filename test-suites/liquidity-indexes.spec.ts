import { expect } from 'chai';
import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  evmSnapshot,
  evmRevert,
  MockFlashLoanReceiver,
  getMockFlashLoanReceiver,
} from '@aave/deploy-v3';
import './helpers/utils/wadraymath';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool: liquidity indexes misc tests', (testEnv: TestEnv) => {
  const TOTAL_PREMIUM = 9;
  const PREMIUM_TO_PROTOCOL = 3000;

  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  let snap: string;

  const setupForFlashloan = async (testEnv: TestEnv) => {
    const {
      configurator,
      pool,
      weth,
      aave,
      dai,
      users: [user0],
    } = testEnv;

    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();

    await configurator.updateFlashloanPremiumTotal(TOTAL_PREMIUM);
    await configurator.updateFlashloanPremiumToProtocol(PREMIUM_TO_PROTOCOL);

    const userAddress = user0.address;
    const amountToDeposit = ethers.utils.parseEther('1');

    await weth['mint(uint256)'](amountToDeposit);

    await weth.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');

    await aave['mint(uint256)'](amountToDeposit);

    await aave.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(aave.address, amountToDeposit, userAddress, '0');
    await dai['mint(uint256)'](amountToDeposit);

    await dai.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(dai.address, amountToDeposit, userAddress, '0');
  };

  before(async () => {
    await setupForFlashloan(testEnv);
  });

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('Validates that the flash loan fee properly takes into account both aToken supply and accruedToTreasury', async () => {
    const {
      pool,
      helpersContract,
      weth,
      aWETH,
      users: [depositorWeth],
    } = testEnv;

    /**
     * 1. Flashes 0.8 WETH
     * 2. Flashes again 0.8 ETH (to have accruedToTreasury)
     * 3. Validates that liquidity index took into account both aToken supply and accruedToTreasury
     */

    const wethFlashBorrowedAmount = ethers.utils.parseEther('0.8');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [wethFlashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [wethFlashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    const wethReserveDataAfterSecondFlash = await helpersContract.getReserveData(weth.address);

    const totalScaledWithTreasuryAfterSecondFlash = (
      await aWETH.scaledBalanceOf(depositorWeth.address)
    ).add(wethReserveDataAfterSecondFlash.accruedToTreasuryScaled.toString());

    expect(await weth.balanceOf(aWETH.address)).to.be.closeTo(
      BigNumber.from(totalScaledWithTreasuryAfterSecondFlash.toString()).rayMul(
        wethReserveDataAfterSecondFlash.liquidityIndex
      ),
      1,
      'Scaled total supply not (+/- 1) equal to WETH balance of aWETH'
    );
  });
});
