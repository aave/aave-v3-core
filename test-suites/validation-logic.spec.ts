import { expect } from 'chai';
import { utils, constants } from 'ethers';
import { parseUnits } from '@ethersproject/units';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { RateMode, ProtocolErrors } from '../helpers/types';
import { impersonateAccountsHardhat, setAutomine, setAutomineEvm } from '../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { waitForTx, evmSnapshot, evmRevert, getVariableDebtToken } from '@aave/deploy-v3';
import { topUpNonPayableWithEther } from './helpers/utils/funds';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('ValidationLogic: Edge cases', (testEnv: TestEnv) => {
  const {
    RESERVE_INACTIVE,
    RESERVE_FROZEN,
    RESERVE_PAUSED,
    INVALID_AMOUNT,
    BORROWING_NOT_ENABLED,
    STABLE_BORROWING_NOT_ENABLED,
    COLLATERAL_SAME_AS_BORROWING_CURRENCY,
    AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE,
    NO_DEBT_OF_SELECTED_TYPE,
    SAME_BLOCK_BORROW_REPAY,
    HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
    INVALID_INTEREST_RATE_MODE_SELECTED,
    UNDERLYING_BALANCE_ZERO,
    INCONSISTENT_FLASHLOAN_PARAMS,
    HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD,
    INCONSISTENT_EMODE_CATEGORY,
  } = ProtocolErrors;

  let snap: string;

  before(async () => {
    const { addressesProvider, oracle } = testEnv;

    await waitForTx(await addressesProvider.setPriceOracle(oracle.address));
  });

  after(async () => {
    const { aaveOracle, addressesProvider } = testEnv;
    await waitForTx(await addressesProvider.setPriceOracle(aaveOracle.address));
  });

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('validateDeposit() when reserve is not active (revert expected)', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await expect(
      pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateDeposit() when reserve is frozen (revert expected)', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveFreeze(dai.address, true);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(true);
    expect(configAfter.isFrozen).to.be.eq(true);

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await expect(
      pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0)
    ).to.be.revertedWith(RESERVE_FROZEN);
  });

  it('validateBorrow() when reserve is not active (revert expected)', async () => {
    /**
     * Unclear how we should enter this stage with normal usage.
     * Can be done by sending dai directly to aDai contract after it have been deactivated.
     * If deposited normally it is not possible for us deactivate.
     */

    const { pool, poolAdmin, configurator, helpersContract, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    // Transferring directly into aDai such that we can borrow
    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1000'), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateBorrow() when reserve is frozen (revert expected)', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveFreeze(dai.address, true);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(true);
    expect(configAfter.isFrozen).to.be.eq(true);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1000'), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(RESERVE_FROZEN);
  });

  it('validateBorrow() when amount == 0 (revert expected)', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await expect(
      pool.connect(user.signer).borrow(dai.address, 0, RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(INVALID_AMOUNT);
  });

  it('validateBorrow() when borrowing is not enabled (revert expected)', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.borrowingEnabled).to.be.eq(true);

    // Disable borrowing
    await configurator.connect(poolAdmin.signer).setReserveStableRateBorrowing(dai.address, false);
    await configurator.connect(poolAdmin.signer).setReserveBorrowing(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.borrowingEnabled).to.be.eq(false);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1000'), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(BORROWING_NOT_ENABLED);
  });

  it('validateBorrow() when stableRateBorrowing is not enabled', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.stableBorrowRateEnabled).to.be.eq(true);

    // Disable stable rate borrowing
    await configurator.connect(poolAdmin.signer).setReserveStableRateBorrowing(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.stableBorrowRateEnabled).to.be.eq(false);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address)
    ).to.be.revertedWith(STABLE_BORROWING_NOT_ENABLED);
  });

  it('validateBorrow() borrowing when user has already a HF < threshold', async () => {
    const { pool, users, dai, usdc, oracle } = testEnv;
    const user = users[0];
    const depositor = users[1];

    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '2000'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '2000'),
        depositor.address,
        0
      );

    await usdc
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '2000'));
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
    ).to.be.revertedWith(HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
  });

  it('validateBorrow() stable borrowing where collateral is mostly the same currency is borrowing (revert expected)', async () => {
    // Stable borrowing
    // isUsingAsCollateral == true
    // ltv != 0
    // amount < aToken Balance

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address)
    ).to.be.revertedWith(COLLATERAL_SAME_AS_BORROWING_CURRENCY);
  });

  it('validateBorrow() stable borrowing when amount > maxLoanSizeStable (revert expected)', async () => {
    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    await expect(
      pool
        .connect(user.signer)
        .borrow(dai.address, utils.parseEther('1500'), RateMode.Stable, 0, user.address)
    ).to.be.revertedWith(AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE);
  });

  it('validateLiquidationCall() when healthFactor > threshold (revert expected)', async () => {
    // Liquidation something that is not liquidatable
    const { pool, users, dai, usdc } = testEnv;
    const depositor = users[0];
    const borrower = users[1];

    await dai
      .connect(depositor.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '500'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '500'),
        depositor.address,
        0
      );
    await usdc
      .connect(borrower.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(usdc.address, '500'));
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
    ).to.be.revertedWith(HEALTH_FACTOR_NOT_BELOW_THRESHOLD);
  });

  it('validateRepay() when reserve is not active (revert expected)', async () => {
    // Unsure how we can end in this scenario. Would require that it could be deactivated after someone have borrowed
    const { pool, users, dai, helpersContract, configurator, poolAdmin } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('1'), RateMode.Variable, user.address)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateRepay() when variable borrowing and repaying in same block (revert expected)', async () => {
    // Same block repay

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    // We need some debt.
    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));

    // Turn off automining - pretty sure that coverage is getting messed up here.
    await setAutomine(false);

    // Borrow 500 dai
    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Variable, 0, user.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('500'), RateMode.Variable, user.address)
    ).to.be.revertedWith(SAME_BLOCK_BORROW_REPAY);
  });

  it('validateRepay() when variable borrowing and repaying in same block using credit delegation (revert expected)', async () => {
    const {
      pool,
      dai,
      weth,
      users: [user1, user2, user3],
    } = testEnv;

    // Add liquidity
    await dai.connect(user3.signer)['mint(uint256)'](utils.parseUnits('1000', 18));
    await dai.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user3.signer)
      .supply(dai.address, utils.parseUnits('1000', 18), user3.address, 0);

    // User1 supplies 10 WETH
    await dai.connect(user1.signer)['mint(uint256)'](utils.parseUnits('100', 18));
    await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user1.signer)['mint(uint256)'](utils.parseUnits('10', 18));
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user1.signer)
      .supply(weth.address, utils.parseUnits('10', 18), user1.address, 0);

    const daiData = await pool.getReserveData(dai.address);
    const variableDebtToken = await getVariableDebtToken(daiData.variableDebtTokenAddress);

    // User1 approves User2 to borrow 1000 DAI
    expect(
      await variableDebtToken
        .connect(user1.signer)
        .approveDelegation(user2.address, utils.parseUnits('1000', 18))
    );

    // User2 borrows on behalf of User1
    const borrowOnBehalfAmount = utils.parseUnits('100', 18);
    expect(
      await pool
        .connect(user2.signer)
        .borrow(dai.address, borrowOnBehalfAmount, RateMode.Variable, 0, user1.address)
    );

    // Turn off automining to simulate actions in same block
    await setAutomine(false);

    // User2 borrows 2 DAI on behalf of User1
    await pool
      .connect(user2.signer)
      .borrow(dai.address, utils.parseEther('2'), RateMode.Variable, 0, user1.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);

    await expect(
      pool
        .connect(user1.signer)
        .repay(dai.address, utils.parseEther('2'), RateMode.Variable, user1.address)
    ).to.be.revertedWith(SAME_BLOCK_BORROW_REPAY);
  });

  it('validateRepay() when stable borrowing and repaying in same block (revert expected)', async () => {
    // Same block repay

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    // We need some debt.
    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));

    // Turn off automining - pretty sure that coverage is getting messed up here.
    await setAutomine(false);

    // Borrow 500 dai
    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('500'), RateMode.Stable, user.address)
    ).to.be.revertedWith(SAME_BLOCK_BORROW_REPAY);
  });

  it('validateRepay() the variable debt when is 0 (stableDebt > 0) (revert expected)', async () => {
    // (stableDebt > 0 && DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE) ||
    // (variableDebt > 0 &&	DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.VARIABLE),

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    // We need some debt
    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));

    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('250'), RateMode.Stable, 0, user.address);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('250'), RateMode.Variable, user.address)
    ).to.be.revertedWith(NO_DEBT_OF_SELECTED_TYPE);
  });

  it('validateRepay() the stable debt when is 0 (variableDebt > 0) (revert expected)', async () => {
    // (stableDebt > 0 && DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE) ||
    // (variableDebt > 0 &&	DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.VARIABLE),

    const { pool, users, dai } = testEnv;
    const user = users[0];

    // We need some debt
    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('2000'), user.address, 0);

    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('250'), RateMode.Variable, 0, user.address);

    await expect(
      pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('250'), RateMode.Stable, user.address)
    ).to.be.revertedWith(NO_DEBT_OF_SELECTED_TYPE);
  });

  it('validateSwapRateMode() when reserve is not active', async () => {
    // Not clear when this would be useful in practice, as you should not be able to have debt if it is deactivated
    const { pool, poolAdmin, configurator, helpersContract, users, dai, aDai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Stable)
    ).to.be.revertedWith(RESERVE_INACTIVE);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(RESERVE_INACTIVE);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.None)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateSwapRateMode() when reserve is frozen', async () => {
    // Not clear when this would be useful in practice, as you should not be able to have debt if it is deactivated
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveFreeze(dai.address, true);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(true);
    expect(configAfter.isFrozen).to.be.eq(true);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Stable)
    ).to.be.revertedWith(RESERVE_FROZEN);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(RESERVE_FROZEN);
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.None)
    ).to.be.revertedWith(RESERVE_FROZEN);
  });

  it('validateSwapRateMode() with currentRateMode not equal to stable or variable, (revert expected)', async () => {
    const { pool, helpersContract, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.None)
    ).to.be.revertedWith(INVALID_INTEREST_RATE_MODE_SELECTED);
  });

  it('validateSwapRateMode() from variable to stable with stableBorrowing disabled (revert expected)', async () => {
    const { pool, poolAdmin, configurator, helpersContract, users, dai } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('1000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.stableBorrowRateEnabled).to.be.eq(true);

    // Disable stable rate borrowing
    await configurator.connect(poolAdmin.signer).setReserveStableRateBorrowing(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.stableBorrowRateEnabled).to.be.eq(false);

    // We need some variable debt, and then flip it

    await dai
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '5000'));
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
    ).to.be.revertedWith(STABLE_BORROWING_NOT_ENABLED);
  });

  it('validateSwapRateMode() where collateral is mostly the same currency is borrowing (revert expected)', async () => {
    // SwapRate from variable to stable
    // isUsingAsCollateral == true
    // ltv != 0
    // stableDebt + variableDebt < aToken

    const { pool, users, dai, aDai, usdc } = testEnv;
    const user = users[0];

    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, utils.parseEther('1000'));
    await pool.connect(user.signer).deposit(dai.address, utils.parseEther('1000'), user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('1000'));

    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('10000'));
    await usdc.connect(user.signer).approve(pool.address, utils.parseEther('10000'));
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('10000'), user.address, 0);

    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Variable, 0, user.address);

    await expect(
      pool.connect(user.signer).swapBorrowRateMode(dai.address, RateMode.Variable)
    ).to.be.revertedWith(COLLATERAL_SAME_AS_BORROWING_CURRENCY);
  });

  it('validateRebalanceStableBorrowRate() when reserve is not active (revert expected)', async () => {
    const { pool, configurator, helpersContract, poolAdmin, users, dai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await expect(
      pool.connect(user.signer).rebalanceStableBorrowRate(dai.address, user.address)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateSetUseReserveAsCollateral() when reserve is not active (revert expected)', async () => {
    /**
     * Since its not possible to deactivate a reserve with existing suppliers, making the user have
     * aToken balance (aDAI) its not technically possible to end up in this situation.
     * However, we impersonate the Pool to get some aDAI and make the test possible
     */
    const { pool, configurator, helpersContract, poolAdmin, users, dai, aDai } = testEnv;
    const user = users[0];

    const configBefore = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configBefore.isActive).to.be.eq(true);
    expect(configBefore.isFrozen).to.be.eq(false);

    await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false);

    const configAfter = await helpersContract.getReserveConfigurationData(dai.address);
    expect(configAfter.isActive).to.be.eq(false);
    expect(configAfter.isFrozen).to.be.eq(false);

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);
    await topUpNonPayableWithEther(user.signer, [pool.address], utils.parseEther('1'));
    expect(await aDai.connect(poolSigner).mint(user.address, user.address, 1, 1));

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, true)
    ).to.be.revertedWith(RESERVE_INACTIVE);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, false)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateSetUseReserveAsCollateral() with userBalance == 0 (revert expected)', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, true)
    ).to.be.revertedWith(UNDERLYING_BALANCE_ZERO);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(dai.address, false)
    ).to.be.revertedWith(UNDERLYING_BALANCE_ZERO);
  });

  it('validateFlashloan() with inconsistent params (revert expected)', async () => {
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
    ).to.be.revertedWith(INCONSISTENT_FLASHLOAN_PARAMS);
  });

  it('validateFlashloan() with inactive reserve (revert expected)', async () => {
    const {
      configurator,
      poolAdmin,
      pool,
      dai,
      aDai,
      usdc,
      users: [user],
    } = testEnv;

    expect(await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false));

    await expect(
      pool
        .connect(user.signer)
        .flashLoan(
          aDai.address,
          [dai.address, usdc.address],
          [0, 0],
          [RateMode.Variable, RateMode.Variable],
          user.address,
          '0x00',
          0
        )
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateFlashLoanSimple() with paused reserve (revert expected)', async () => {
    const {
      configurator,
      poolAdmin,
      pool,
      weth,
      users: [user],
    } = testEnv;

    expect(await configurator.connect(poolAdmin.signer).setReservePause(weth.address, true));

    await expect(
      pool.connect(user.signer).flashLoanSimple(user.address, weth.address, 0, '0x10', 0)
    ).to.be.revertedWith(RESERVE_PAUSED);
  });

  it('validateFlashLoanSimple() with inactive reserve (revert expected)', async () => {
    const {
      configurator,
      poolAdmin,
      pool,
      weth,
      users: [user],
    } = testEnv;

    expect(await configurator.connect(poolAdmin.signer).setReserveActive(weth.address, false));

    await expect(
      pool.connect(user.signer).flashLoanSimple(user.address, weth.address, 0, '0x10', 0)
    ).to.be.revertedWith(RESERVE_INACTIVE);
  });

  it('validateSetUserEMode() to undefined emode category (revert expected)', async () => {
    const {
      pool,
      users: [user],
    } = testEnv;

    await expect(pool.connect(user.signer).setUserEMode(101)).to.be.revertedWith(
      INCONSISTENT_EMODE_CATEGORY
    );
  });

  it('validateSetUserEMode() with empty config', async () => {
    const {
      configurator,
      poolAdmin,
      pool,
      users: [user],
    } = testEnv;

    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory('101', '9800', '9900', '10100', constants.AddressZero, 'INCONSISTENT')
    );

    await pool.connect(user.signer).setUserEMode(101);
  });

  it('validateSetUserEMode() with categoryId == 0', async () => {
    const {
      dai,
      pool,
      users: [user],
    } = testEnv;

    // Deposit to make sure config is not empty
    await dai.connect(user.signer)['mint(uint256)'](parseUnits('1000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).supply(dai.address, parseUnits('1000', 18), user.address, 0);

    await pool.connect(user.signer).setUserEMode(0);

    expect(await pool.getUserEMode(user.address)).to.be.eq(0);
  });

  it('validateBorrow() with eMode > 0, borrowing asset not in category (revert expected)', async () => {
    const {
      configurator,
      poolAdmin,
      usdc,
      dai,
      pool,
      users: [user, usdcProvider],
    } = testEnv;

    await usdc.connect(usdcProvider.signer)['mint(uint256)'](parseUnits('1000', 6));
    await usdc.connect(usdcProvider.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(usdcProvider.signer)
      .supply(usdc.address, parseUnits('1000', 6), usdcProvider.address, 0);

    await dai.connect(user.signer)['mint(uint256)'](parseUnits('1000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).supply(dai.address, parseUnits('1000', 18), user.address, 0);

    await configurator
      .connect(poolAdmin.signer)
      .setEModeCategory('101', '9800', '9900', '10100', constants.AddressZero, 'NO-ASSETS');

    await pool.connect(user.signer).setUserEMode(101);

    await expect(
      pool
        .connect(user.signer)
        .borrow(usdc.address, parseUnits('100', 6), RateMode.Variable, 0, user.address)
    ).to.be.revertedWith(INCONSISTENT_EMODE_CATEGORY);
  });

  it('validateHFAndLtv() with HF < 1 (revert expected)', async () => {
    const {
      usdc,
      dai,
      pool,
      oracle,
      users: [user, usdcProvider],
    } = testEnv;

    await usdc.connect(usdcProvider.signer)['mint(uint256)'](parseUnits('1000', 6));
    await usdc.connect(usdcProvider.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(usdcProvider.signer)
      .supply(usdc.address, parseUnits('1000', 6), usdcProvider.address, 0);

    await dai.connect(user.signer)['mint(uint256)'](parseUnits('1000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).supply(dai.address, parseUnits('1000', 18), user.address, 0);

    const userGlobalData = await pool.getUserAccountData(user.address);
    const usdcPrice = await oracle.getAssetPrice(usdc.address);

    const amountUSDCToBorrow = await convertToCurrencyDecimals(
      usdc.address,
      userGlobalData.availableBorrowsBase.div(usdcPrice).toString()
    );

    await pool
      .connect(user.signer)
      .borrow(usdc.address, amountUSDCToBorrow, RateMode.Variable, 0, user.address);

    await expect(
      pool.connect(user.signer).withdraw(dai.address, parseUnits('500', 18), user.address)
    ).to.be.revertedWith(HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
  });

  it('validateHFAndLtv() with HF < 1 for 0 LTV asset (revert expected)', async () => {
    const {
      usdc,
      dai,
      pool,
      oracle,
      poolAdmin,
      configurator,
      helpersContract,
      users: [user, usdcProvider],
    } = testEnv;

    // Supply usdc
    await usdc.connect(usdcProvider.signer)['mint(uint256)'](parseUnits('1000', 6));
    await usdc.connect(usdcProvider.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(usdcProvider.signer)
      .supply(usdc.address, parseUnits('1000', 6), usdcProvider.address, 0);

    // Supply dai
    await dai.connect(user.signer)['mint(uint256)'](parseUnits('1000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).supply(dai.address, parseUnits('1000', 18), user.address, 0);

    // Borrow usdc
    await pool
      .connect(user.signer)
      .borrow(usdc.address, parseUnits('500', 6), RateMode.Variable, 0, user.address);

    // Drop LTV
    const daiData = await helpersContract.getReserveConfigurationData(dai.address);

    await configurator
      .connect(poolAdmin.signer)
      .configureReserveAsCollateral(
        dai.address,
        0,
        daiData.liquidationThreshold,
        daiData.liquidationBonus
      );

    // Withdraw all my dai
    await expect(
      pool.connect(user.signer).withdraw(dai.address, parseUnits('500', 18), user.address)
    ).to.be.revertedWith(HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
  });
});
