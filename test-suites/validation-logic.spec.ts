import { expect } from 'chai';
import { utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { RateMode, ProtocolErrors } from '../helpers/types';
import { evmRevert, evmSnapshot, setAutomine } from '../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';

makeSuite('ValidationLogic: Edge cases', (testEnv: TestEnv) => {
  const {
    VL_NO_ACTIVE_RESERVE,
    VL_RESERVE_FROZEN,
    VL_INVALID_AMOUNT,
    VL_BORROWING_NOT_ENABLED,
    VL_STABLE_BORROWING_NOT_ENABLED,
    VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY,
    VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE,
    VL_NO_DEBT_OF_SELECTED_TYPE,
    VL_SAME_BLOCK_BORROW_REPAY,
    VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
    VL_INVALID_INTEREST_RATE_MODE_SELECTED,
    VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0,
    VL_INCONSISTENT_FLASHLOAN_PARAMS,
    VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD,
  } = ProtocolErrors;

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('validateDeposit() when reserve is not active and reverts', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await expect(
      pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
  });

  it('validateDeposit() when reserve is frozen and reverts', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).freezeReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(true);
    expect(configAfter.isFrozen).to.be.eq(true);

    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await expect(
      pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0)
    ).to.be.revertedWith(VL_RESERVE_FROZEN);
  });

  it('validateBorrow() when reserve is not active and reverts', async () => {
    /**
     * Unclear how we should enter this stage with normal usage.
     * Can be done by sending dai directly to aDai contract after it have been deactivated.
     * If deposited normally it is not possible for us deactivate.
     */

    const { pool, poolAdmin, configurator, helpersContract, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await usdc.connect(user.signer).mint(utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    // Transferring directly into aDai such that we can borrow
    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1000'), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
  });

  it('validateBorrow() when reserve is frozen and reverts', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    await usdc.connect(user.signer).mint(utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).freezeReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(true);
    expect(configAfter.isFrozen).to.be.eq(true);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1000'), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(VL_RESERVE_FROZEN);
  });

  it('validateBorrow() when amount == 0 and reverts', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await expect(
      pool.connect(user.signer).borrow(dai.address, 0, RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(VL_INVALID_AMOUNT);
  });

  it('validateBorrow() when borrowing is not enabled and reverts', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    await usdc.connect(user.signer).mint(utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.borrowingEnabled).to.be.eq(true);

    // Disable borrowing
    await configurator.connect(poolAdmin.signer).disableBorrowingOnReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.borrowingEnabled).to.be.eq(false);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1000'), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(VL_BORROWING_NOT_ENABLED);
  });

  it('validateBorrow() when stableRateBorrowing is not enabled', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.stableBorrowRateEnabled).to.be.eq(true);

    // Disable borrowing
    await configurator.connect(poolAdmin.signer).disableReserveStableRate(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.stableBorrowRateEnabled).to.be.eq(false);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address)
    ).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);
  });

  it('validateBorrow() borrowing when user has already a HF < threshold', async () => {
    const { pool, users, dai, usdc, oracle } = testEnv;
    const user = users[0];
    const depositor = users[1];

    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '2000'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '2000'),
        depositor.address,
        0
      );

    await usdc.connect(user.signer).mint(await convertToCurrencyDecimals(usdc.address, '2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, '2000'),
        user.address,
        0
      );

    await pool
      .connect(user.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '1000'),
        RateMode.Variable,
        0,
        user.address
      );

    const daiPrice = await oracle.getAssetPrice(dai.address);

    await oracle.setAssetPrice(dai.address, daiPrice.mul(2));

    await expect(
      pool
        .connect(user.signer)
        .borrow(
          dai.address,
          await convertToCurrencyDecimals(dai.address, '200'),
          RateMode.Variable,
          0,
          user.address
        )
    ).to.be.revertedWith(VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
  });

  it('validateBorrow() stable borrowing where collateral is mostly the same currency is borrowing and reverts', async () => {
    // Stable borrowing
    // isUsingAsCollateral == true
    // ltv != 0
    // amount < aToken Balance

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await usdc.connect(user.signer).mint(utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address)
    ).to.be.revertedWith(VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY);
  });

  it('validateBorrow() stable borrowing when amount > maxLoanSizeStable and reverts', async () => {
    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await usdc.connect(user.signer).mint(utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1500'), RateMode.Stable, 0, user.address)
    ).to.be.revertedWith(VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE);
  });

  it('validateLiquidationCall() when healthFactor > threshold and reverts', async () => {
    // Liquidation something that is not liquidatable
    const { pool, users, dai, usdc } = testEnv;
    const depositor = users[0];
    const borrower = users[1];

    await dai.connect(depositor.signer).mint(await convertToCurrencyDecimals(dai.address, '500'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '500'),
        depositor.address,
        0
      );
    await usdc.connect(borrower.signer).mint(await convertToCurrencyDecimals(usdc.address, '500'));
    await usdc.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, '500'),
        borrower.address,
        0
      );

    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '250'),
        RateMode.Variable,
        0,
        borrower.address
      );

    // Try to liquidate the borrower
    await expect(
      pool
        .connect(depositor.signer)
        .liquidationCall(usdc.address, dai.address, borrower.address, 0, false)
    ).to.be.revertedWith(VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD);
  });

  it('validateRepay() when reserve is not active and reverts', async () => {
    // Unsure how we can end in this scenario. Would require that it could be deactivated after someone have borrowed
    const { pool, users, dai, helpersContract, configurator, poolAdmin } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('1'), RateMode.Variable, user.address)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
  });

  it('validateRepay() line 268 revert with variable', async () => {
    // Same block repay

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    // We need some debt.
    await usdc.connect(user.signer).mint(utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));

    // Turn off automining - pretty sure that coverage is getting messed up here.
    await setAutomine(false);

    // Borrow 500 dai
    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Variable, 0, user.address);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('500'), RateMode.Variable, user.address)
    ).to.be.revertedWith(VL_SAME_BLOCK_BORROW_REPAY);

    // turn on automining
    await setAutomine(true);
  });

  it('validateRepay() line 268 revert with stable', async () => {
    // Same block repay

    const { pool, users, dai, aDai, usdc, helpersContract, configurator, poolAdmin } = testEnv;
    const user = users[0];

    // We need some debt.
    await usdc.connect(user.signer).mint(utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));

    // Turn off automining - pretty sure that coverage is getting messed up here.
    await setAutomine(false);

    // Borrow 500 dai
    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('500'), RateMode.Stable, user.address)
    ).to.be.revertedWith(VL_SAME_BLOCK_BORROW_REPAY);

    // turn on automining
    await setAutomine(true);
  });

  it('validateRepay() the variable debt when is 0 (stableDebt > 0) and reverts', async () => {
    // (stableDebt > 0 && DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE) ||
    // (variableDebt > 0 &&	DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.VARIABLE),

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    // We need some debt
    await usdc.connect(user.signer).mint(utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));

    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('250'), RateMode.Stable, 0, user.address);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('250'), RateMode.Variable, user.address)
    ).to.be.revertedWith(VL_NO_DEBT_OF_SELECTED_TYPE);
  });

  it('validateRepay() the stable debt when is 0 (variableDebt > 0) and reverts', async () => {
    // (stableDebt > 0 && DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE) ||
    // (variableDebt > 0 &&	DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.VARIABLE),

    const { pool, users, dai } = testEnv;
    const user = users[0];

    // We need some debt
    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('2000'), user.address, 0);

    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('250'), RateMode.Variable, 0, user.address);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('250'), RateMode.Stable, user.address)
    ).to.be.revertedWith(VL_NO_DEBT_OF_SELECTED_TYPE);
  });

  it('validateSwapRateMode() when reserve is not active', async () => {
    // Not clear when this would be useful in practice, as you should not be able to have debt if it is deactivated
    const { pool, poolAdmin, configurator, helpersContract, users, dai, aDai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Stable)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.None)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
  });

  it('validateSwapRateMode() when reserve is frozen', async () => {
    // Not clear when this would be useful in practice, as you should not be able to have debt if it is deactivated
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).freezeReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(true);
    expect(configAfter.isFrozen).to.be.eq(true);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Stable)
    ).to.be.revertedWith(VL_RESERVE_FROZEN);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(VL_RESERVE_FROZEN);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.None)
    ).to.be.revertedWith(VL_RESERVE_FROZEN);
  });

  it('validateSwapRateMode() with currentRateMode not equal to stable or variable, and reverts', async () => {
    const { pool, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.None)
    ).to.be.revertedWith(VL_INVALID_INTEREST_RATE_MODE_SELECTED);
  });

  it('validateSwapRateMode() from variable to stable with stableBorrowing disabled and reverts', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.stableBorrowRateEnabled).to.be.eq(true);

    // Disable borrowing
    await configurator.connect(poolAdmin.signer).disableReserveStableRate(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.stableBorrowRateEnabled).to.be.eq(false);

    // We need some variable debt, and then flip it

    await dai.connect(user.signer).mint(await convertToCurrencyDecimals(dai.address, '5000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(dai.address, await convertToCurrencyDecimals(dai.address, '5000'), user.address, 0);

    await pool
      .connect(user.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '500'),
        RateMode.Variable,
        0,
        user.address
      );

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(VL_STABLE_BORROWING_NOT_ENABLED);
  });

  it('validateSwapRateMode() where collateral is mostly the same currency is borrowing and reverts', async () => {
    // SwapRate from variable to stable
    // isUsingAsCollateral == true
    // ltv != 0
    // stableDebt + variableDebt < aToken

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await usdc.connect(user.signer).mint(utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Variable, 0, user.address);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY);
  });

  it('validateRebalanceStableBorrowRate() when reserve is not active and reverts', async () => {
    const { pool, configurator, helpersContract, poolAdmin, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).rebalanceStableBorrowRate(dai.address, user.address)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
  });

  it('validateSetUseReserveAsCollateral() when reserve is not active and reverts', async () => {
    const { pool, configurator, helpersContract, poolAdmin, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, true)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, false)
    ).to.be.revertedWith(VL_NO_ACTIVE_RESERVE);
  });

  it('validateSetUseReserveAsCollateral() with userBalance == 0 and reverts', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, true)
    ).to.be.revertedWith(VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, false)
    ).to.be.revertedWith(VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0);
  });

  it('validateFlashloan() with inconsistent params and reverts', async () => {
    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await expect(
      pool
        .connect(user.signer)
        .flashLoan(
          aDai.address,
          [dai.address, usdc.address],
          [0],
          [RateMode.Variable, RateMode.Variable],
          user.address,
          '0x00',
          0
        )
    ).to.be.revertedWith(VL_INCONSISTENT_FLASHLOAN_PARAMS);
  });
});
