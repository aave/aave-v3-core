const { expect } = require('chai');
import { utils, BigNumber } from 'ethers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { AAVE_REFERRAL, MAX_UINT_AMOUNT, MAX_UNBACKED_MINT_CAP } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { evmSnapshot } from '@aave/deploy-v3';

makeSuite('Siloed borrowing', (testEnv: TestEnv) => {
  const { SILOED_BORROWING_VIOLATION } = ProtocolErrors;

  let snapshot;

  before(async () => {
    snapshot = await evmSnapshot();
  });

  it('Configure DAI as siloed borrowing asset', async () => {
    const { configurator, helpersContract, dai } = testEnv;

    await configurator.setSiloedBorrowing(dai.address, true);
    const siloed = await helpersContract.getSiloedBorrowing(dai.address);

    expect(siloed).to.be.equal(true, 'Invalid siloed state for DAI');
  });

  it('User 0 supplies DAI, User 1 supplies ETH and USDC, borrows DAI', async () => {
    const { users, pool, dai, weth, usdc, variableDebtDai } = testEnv;

    const wethSupplyAmount = utils.parseEther('1');
    const daiBorrowAmount = utils.parseEther('10');
    const daiSupplyAmount = utils.parseEther('1000');
    const usdcSupplyAmount = utils.parseUnits('1000', 6);

    await dai.connect(users[0].signer)['mint(address,uint256)'](users[0].address, daiSupplyAmount);
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(users[0].signer).supply(dai.address, daiSupplyAmount, users[0].address, '0');

    await usdc
      .connect(users[1].signer)
      ['mint(address,uint256)'](users[1].address, usdcSupplyAmount);
    await usdc.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .supply(usdc.address, usdcSupplyAmount, users[1].address, '0');

    await weth
      .connect(users[1].signer)
      ['mint(address,uint256)'](users[1].address, wethSupplyAmount);
    await weth.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .supply(weth.address, wethSupplyAmount, users[1].address, '0');
    await pool
      .connect(users[1].signer)
      .borrow(dai.address, daiBorrowAmount, RateMode.Variable, '0', users[1].address);

    const debtBalance = await variableDebtDai.balanceOf(users[1].address);

    expect(debtBalance).to.be.closeTo(daiBorrowAmount, 2);
  });

  it('User 0 supplies USDC, User 1 tries to borrow USDC (revert expected)', async () => {
    const { users, pool, usdc } = testEnv;

    const usdcBorrowAmount = utils.parseUnits('1', '6');
    const usdcSupplyAmount = utils.parseUnits('1000', '6');

    await usdc
      .connect(users[0].signer)
      ['mint(address,uint256)'](users[0].address, usdcSupplyAmount);
    await usdc.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .supply(usdc.address, usdcSupplyAmount, users[0].address, '0');

    await expect(
      pool
        .connect(users[1].signer)
        .borrow(usdc.address, usdcBorrowAmount, RateMode.Variable, '0', users[1].address)
    ).to.be.revertedWith(SILOED_BORROWING_VIOLATION);
  });

  it('User 1 repays DAI, borrows USDC', async () => {
    const { users, pool, usdc, dai } = testEnv;

    const usdcBorrowAmount = utils.parseUnits('100', '6');
    const daiMintAmount = utils.parseEther('1000');

    await dai.connect(users[1].signer)['mint(address,uint256)'](users[1].address, daiMintAmount);
    await dai.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .repay(dai.address, MAX_UINT_AMOUNT, RateMode.Variable, users[1].address);

    await pool
      .connect(users[1].signer)
      .borrow(usdc.address, usdcBorrowAmount, RateMode.Variable, '0', users[1].address);
  });

  it('User 1 tries to borrow DAI (revert expected)', async () => {
    const { users, pool, dai } = testEnv;

    const daiBorrowAmount = utils.parseEther('1');

    await expect(
      pool
        .connect(users[1].signer)
        .borrow(dai.address, daiBorrowAmount, RateMode.Variable, '0', users[1].address)
    ).to.be.revertedWith(SILOED_BORROWING_VIOLATION);
  });

  it('User 1 borrows ETH, tries to borrow DAI (revert expected)', async () => {
    const { users, pool, dai, weth } = testEnv;

    const wethBorrowAmount = utils.parseEther('0.01');
    const daiBorrowAmount = utils.parseEther('1');

    await pool
      .connect(users[1].signer)
      .borrow(weth.address, wethBorrowAmount, RateMode.Variable, '0', users[1].address);

    await expect(
      pool
        .connect(users[1].signer)
        .borrow(dai.address, daiBorrowAmount, RateMode.Variable, '0', users[1].address)
    ).to.be.revertedWith(SILOED_BORROWING_VIOLATION);
  });

  it('User 1 Repays USDC and WETH debt, set USDC as siloed', async () => {
    const { users, pool, usdc, weth, configurator, helpersContract } = testEnv;

    const wethMintAmount = utils.parseEther('1');

    const usdcMintAmount = utils.parseEther('1000');

    await usdc.connect(users[1].signer)['mint(address,uint256)'](users[1].address, usdcMintAmount);
    await usdc.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .repay(usdc.address, MAX_UINT_AMOUNT, RateMode.Variable, users[1].address);

    await weth.connect(users[1].signer)['mint(address,uint256)'](users[1].address, wethMintAmount);
    await pool
      .connect(users[1].signer)
      .repay(weth.address, MAX_UINT_AMOUNT, RateMode.Variable, users[1].address);

    await configurator.setSiloedBorrowing(usdc.address, true);
    const siloed = await helpersContract.getSiloedBorrowing(usdc.address);

    expect(siloed).to.be.equal(true, 'Invalid siloed state for USDC');
  });

  it('User 1 borrows DAI, tries to borrow USDC (revert expected)', async () => {
    const { users, pool, usdc, dai } = testEnv;

    const daiBorrowAmount = utils.parseEther('1');
    const usdcBorrowAmount = utils.parseUnits('1', '6');

    await pool
      .connect(users[1].signer)
      .borrow(dai.address, daiBorrowAmount, RateMode.Variable, '0', users[1].address);

    await expect(
      pool
        .connect(users[1].signer)
        .borrow(usdc.address, usdcBorrowAmount, RateMode.Variable, '0', users[1].address)
    ).to.be.revertedWith(SILOED_BORROWING_VIOLATION);
  });

  it('User 1 borrows more DAI', async () => {
    const { users, pool, dai, variableDebtDai } = testEnv;

    const daiBorrowAmount = utils.parseEther('1');

    const debtBefore = await variableDebtDai.balanceOf(users[1].address);

    await pool
      .connect(users[1].signer)
      .borrow(dai.address, daiBorrowAmount, RateMode.Variable, '0', users[1].address);

    const debtAfter = await variableDebtDai.balanceOf(users[1].address);

    //large interval to account for interest generated
    expect(debtAfter).to.be.closeTo(debtBefore.add(daiBorrowAmount), 10000000);
  });
});
