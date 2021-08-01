import { APPROVAL_AMOUNT_POOL, MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { RateMode, ProtocolErrors } from '../../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { CommonsConfig } from '../../markets/amm/commons';

const AAVE_REFERRAL = CommonsConfig.ProtocolGlobalParams.AaveReferral;

makeSuite('AToken: Transfer', (testEnv: TestEnv) => {
  const {
    INVALID_FROM_BALANCE_AFTER_TRANSFER,
    INVALID_TO_BALANCE_AFTER_TRANSFER,
    VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD,
  } = ProtocolErrors;

  it('User 0 deposits 1000 DAI, transfers to user 1', async () => {
    const { users, pool, dai, aDai } = testEnv;

    await dai.connect(users[0].signer).mint(await convertToCurrencyDecimals(dai.address, '1000'));

    await dai.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

    //user 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await pool
      .connect(users[0].signer)
      .deposit(dai.address, amountDAItoDeposit, users[0].address, '0');

    await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit);

    const name = await aDai.name();

    expect(name).to.be.equal('Aave AMM Market DAI');

    const fromBalance = await aDai.balanceOf(users[0].address);
    const toBalance = await aDai.balanceOf(users[1].address);

    expect(fromBalance.toString()).to.be.equal('0', INVALID_FROM_BALANCE_AFTER_TRANSFER);
    expect(toBalance.toString()).to.be.equal(
      amountDAItoDeposit.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
  });

  it('User 0 deposits 1 WETH and user 1 tries to borrow the WETH variable with the received DAI as collateral', async () => {
    const { users, pool, weth, helpersContract } = testEnv;
    const userAddress = await pool.signer.getAddress();

    await weth.connect(users[0].signer).mint(await convertToCurrencyDecimals(weth.address, '1'));

    await weth.connect(users[0].signer).approve(pool.address, APPROVAL_AMOUNT_POOL);

    await pool
      .connect(users[0].signer)
      .deposit(weth.address, ethers.utils.parseEther('1.0'), userAddress, '0');
    await pool
      .connect(users[1].signer)
      .borrow(
        weth.address,
        ethers.utils.parseEther('0.1'),
        RateMode.Variable,
        AAVE_REFERRAL,
        users[1].address
      );

    const userReserveData = await helpersContract.getUserReserveData(
      weth.address,
      users[1].address
    );

    expect(userReserveData.currentVariableDebt.toString()).to.be.eq(ethers.utils.parseEther('0.1'));
  });

  it('User 1 tries to transfer all the DAI used as collateral back to user 0 (revert expected)', async () => {
    const { users, pool, aDai, dai, weth } = testEnv;

    const aDAItoTransfer = await convertToCurrencyDecimals(dai.address, '1000');

    await expect(
      aDai.connect(users[1].signer).transfer(users[0].address, aDAItoTransfer),
      VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    ).to.be.revertedWith(VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
  });

  it('User 1 tries to transfer a small amount of DAI used as collateral back to user 0', async () => {
    const { users, pool, aDai, dai, weth } = testEnv;

    const aDAItoTransfer = await convertToCurrencyDecimals(dai.address, '100');

    await aDai.connect(users[1].signer).transfer(users[0].address, aDAItoTransfer);

    const user0Balance = await aDai.balanceOf(users[0].address);

    expect(user0Balance.toString()).to.be.eq(aDAItoTransfer.toString());
  });
});
