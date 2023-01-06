import { evmSnapshot, evmRevert } from '@aave/deploy-v3';
import { expect } from 'chai';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { RateMode, ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('AToken: Transfer', (testEnv: TestEnv) => {
  const {
    INVALID_FROM_BALANCE_AFTER_TRANSFER,
    INVALID_TO_BALANCE_AFTER_TRANSFER,
    HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD,
  } = ProtocolErrors;

  const DAI_AMOUNT_TO_DEPOSIT = '1000';

  it('User 0 deposits 1000 DAI, transfers 1000 to user 0', async () => {
    const { users, pool, dai, aDai } = testEnv;
    const snap = await evmSnapshot();

    // User 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, DAI_AMOUNT_TO_DEPOSIT);

    // Top up user
    expect(await dai.connect(users[0].signer)['mint(uint256)'](amountDAItoDeposit));

    expect(await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(await aDai.getPreviousIndex(users[0].address)).to.be.eq(0);

    expect(
      await pool
        .connect(users[0].signer)
        .deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    );

    expect(await aDai.getPreviousIndex(users[0].address)).to.be.gt(0);

    expect(await aDai.connect(users[0].signer).transfer(users[0].address, amountDAItoDeposit))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[0].address, users[0].address, amountDAItoDeposit);

    const name = await aDai.name();

    expect(name).to.be.equal('Aave Testnet DAI');

    const fromBalance = await aDai.balanceOf(users[0].address);
    const toBalance = await aDai.balanceOf(users[0].address);
    expect(fromBalance.toString()).to.be.eq(toBalance.toString());

    await evmRevert(snap);
  });

  it('User 0 deposits 1000 DAI, disable as collateral, transfers 1000 to user 1', async () => {
    const { users, pool, dai, aDai } = testEnv;
    const snap = await evmSnapshot();

    // User 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, DAI_AMOUNT_TO_DEPOSIT);

    // Top up user
    expect(await dai.connect(users[0].signer)['mint(uint256)'](amountDAItoDeposit));

    expect(await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(
      await pool
        .connect(users[0].signer)
        .deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    );

    expect(await pool.connect(users[0].signer).setUserUseReserveAsCollateral(dai.address, false));

    expect(await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[0].address, users[1].address, amountDAItoDeposit);

    const name = await aDai.name();

    expect(name).to.be.equal('Aave Testnet DAI');

    const fromBalance = await aDai.balanceOf(users[0].address);
    const toBalance = await aDai.balanceOf(users[1].address);
    expect(fromBalance.toString()).to.be.equal('0', INVALID_FROM_BALANCE_AFTER_TRANSFER);
    expect(toBalance.toString()).to.be.equal(
      amountDAItoDeposit.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );

    await evmRevert(snap);
  });

  it('User 0 deposits 1000 DAI, transfers 5 to user 1 twice, then transfer 0 to user 1', async () => {
    const { users, pool, dai, aDai } = testEnv;
    const snap = await evmSnapshot();

    expect(
      await dai
        .connect(users[0].signer)
        ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, DAI_AMOUNT_TO_DEPOSIT))
    );

    expect(await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT));

    // User 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, DAI_AMOUNT_TO_DEPOSIT);
    const amountDAItoTransfer = await convertToCurrencyDecimals(dai.address, '5');

    expect(
      await pool
        .connect(users[0].signer)
        .deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    );

    expect(await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoTransfer))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[0].address, users[1].address, amountDAItoTransfer);
    expect(await aDai.balanceOf(users[0].address)).to.be.eq(
      (await convertToCurrencyDecimals(dai.address, '995')).toString(),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );
    expect(await aDai.balanceOf(users[1].address)).to.be.eq(
      (await convertToCurrencyDecimals(dai.address, '5')).toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );

    expect(await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoTransfer))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[0].address, users[1].address, amountDAItoTransfer);
    expect(await aDai.balanceOf(users[0].address)).to.be.eq(
      (await convertToCurrencyDecimals(dai.address, '990')).toString(),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );
    expect(await aDai.balanceOf(users[1].address)).to.be.eq(
      (await convertToCurrencyDecimals(dai.address, '10')).toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );

    expect(await aDai.connect(users[0].signer).transfer(users[1].address, 0))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[0].address, users[1].address, 0);
    expect(await aDai.balanceOf(users[0].address)).to.be.eq(
      (await convertToCurrencyDecimals(dai.address, '990')).toString(),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );
    expect(await aDai.balanceOf(users[1].address)).to.be.eq(
      (await convertToCurrencyDecimals(dai.address, '10')).toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );

    await evmRevert(snap);
  });

  it('User 0 deposits 1000 DAI, transfers to user 1', async () => {
    const { users, pool, dai, aDai } = testEnv;

    // User 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, DAI_AMOUNT_TO_DEPOSIT);

    // Top up user
    expect(await dai.connect(users[0].signer)['mint(uint256)'](amountDAItoDeposit));

    expect(await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(
      await pool
        .connect(users[0].signer)
        .deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    );

    expect(await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[0].address, users[1].address, amountDAItoDeposit);

    const name = await aDai.name();

    expect(name).to.be.equal('Aave Testnet DAI');

    const fromBalance = await aDai.balanceOf(users[0].address);
    const toBalance = await aDai.balanceOf(users[1].address);

    expect(fromBalance.toString()).to.be.equal('0', INVALID_FROM_BALANCE_AFTER_TRANSFER);
    expect(toBalance.toString()).to.be.equal(
      amountDAItoDeposit.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
  });

  it('User 0 deposits 1 WETH and user 1 tries to borrow the WETH with the received DAI as collateral', async () => {
    const { users, pool, weth, helpersContract } = testEnv;
    const userAddress = await pool.signer.getAddress();

    const amountWETHtoDeposit = await convertToCurrencyDecimals(weth.address, '1');
    const amountWETHtoBorrow = await convertToCurrencyDecimals(weth.address, '0.1');

    expect(await weth.connect(users[0].signer)['mint(uint256)'](amountWETHtoDeposit));

    expect(await weth.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT));

    expect(
      await pool
        .connect(users[0].signer)
        .deposit(weth.address, amountWETHtoDeposit, userAddress, '0')
    );
    expect(
      await pool
        .connect(users[1].signer)
        .borrow(weth.address, amountWETHtoBorrow, RateMode.Stable, '0', users[1].address)
    );

    const userReserveData = await helpersContract.getUserReserveData(
      weth.address,
      users[1].address
    );

    expect(userReserveData.currentStableDebt.toString()).to.be.eq(amountWETHtoBorrow);
  });

  it('User 1 tries to transfer all the DAI used as collateral back to user 0 (revert expected)', async () => {
    const { users, aDai, dai } = testEnv;

    const amountDAItoTransfer = await convertToCurrencyDecimals(dai.address, DAI_AMOUNT_TO_DEPOSIT);

    await expect(
      aDai.connect(users[1].signer).transfer(users[0].address, amountDAItoTransfer),
      HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    ).to.be.revertedWith(HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
  });

  it('User 1 transfers a small amount of DAI used as collateral back to user 0', async () => {
    const { users, aDai, dai } = testEnv;

    const aDAItoTransfer = await convertToCurrencyDecimals(dai.address, '100');

    expect(await aDai.connect(users[1].signer).transfer(users[0].address, aDAItoTransfer))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[1].address, users[0].address, aDAItoTransfer);

    const user0Balance = await aDai.balanceOf(users[0].address);

    expect(user0Balance.toString()).to.be.eq(aDAItoTransfer.toString());
  });
});
