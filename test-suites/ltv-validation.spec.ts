import { expect } from 'chai';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors } from '../helpers/types';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('LTV validation', (testEnv: TestEnv) => {
  const { VL_LTV_VALIDATION_FAILED } = ProtocolErrors;

  it('User 1 deposits 10 Dai, 10 USDC, user 2 deposits 0.071 WETH', async () => {
    const {
      pool,
      dai,
      usdc,
      weth,
      users: [user1, user2],
    } = testEnv;

    const daiAmount = await convertToCurrencyDecimals(dai.address, '10');
    const usdcAmount = await convertToCurrencyDecimals(usdc.address, '10');
    const wethAmount = await convertToCurrencyDecimals(weth.address, '0.071');

    await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await dai.connect(user1.signer)['mint(uint256)'](daiAmount);
    await usdc.connect(user1.signer)['mint(uint256)'](usdcAmount);
    await weth.connect(user2.signer)['mint(uint256)'](wethAmount);

    await pool.connect(user1.signer).deposit(dai.address, daiAmount, user1.address, 0);

    await pool.connect(user1.signer).deposit(usdc.address, usdcAmount, user1.address, 0);

    await pool.connect(user2.signer).deposit(weth.address, wethAmount, user2.address, 0);
  });

  it('Sets the LTV of DAI to 0', async () => {
    const {
      configurator,
      dai,
      helpersContract,
      users: [],
    } = testEnv;

    expect(await configurator.configureReserveAsCollateral(dai.address, 0, 8000, 10500))
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(dai.address, 0, 8000, 10500);

    const ltv = (await helpersContract.getReserveConfigurationData(dai.address)).ltv;

    expect(ltv).to.be.equal(0);
  });

  it('Borrows 0.000414 WETH', async () => {
    const {
      pool,
      weth,
      users: [user1],
    } = testEnv;
    const borrowedAmount = await convertToCurrencyDecimals(weth.address, '0.000414');

    expect(
      await pool.connect(user1.signer).borrow(weth.address, borrowedAmount, 1, 0, user1.address)
    );
  });

  it('Tries to withdraw USDC (revert expected)', async () => {
    const {
      pool,
      usdc,
      users: [user1],
    } = testEnv;

    const withdrawnAmount = await convertToCurrencyDecimals(usdc.address, '1');

    await expect(
      pool.connect(user1.signer).withdraw(usdc.address, withdrawnAmount, user1.address)
    ).to.be.revertedWith(VL_LTV_VALIDATION_FAILED);
  });

  it('Withdraws DAI', async () => {
    const {
      pool,
      dai,
      aDai,
      users: [user1],
    } = testEnv;

    const aDaiBalanceBefore = await aDai.balanceOf(user1.address);

    const withdrawnAmount = await convertToCurrencyDecimals(dai.address, '1');

    expect(await pool.connect(user1.signer).withdraw(dai.address, withdrawnAmount, user1.address));

    const aDaiBalanceAfter = await aDai.balanceOf(user1.address);

    expect(aDaiBalanceAfter).to.be.eq(aDaiBalanceBefore.sub(withdrawnAmount));
  });
});
