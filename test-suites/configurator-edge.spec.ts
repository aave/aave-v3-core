import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../helpers/types';
import { MAX_BORROW_CAP, MAX_UINT_AMOUNT } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';

makeSuite('PoolConfigurator: Edge cases', (testEnv: TestEnv) => {
  const {
    RC_INVALID_RESERVE_FACTOR,
    PC_INVALID_CONFIGURATION,
    RC_INVALID_LIQ_BONUS,
    PC_FLASHLOAN_PREMIUMS_MISMATCH,
    PC_FLASHLOAN_PREMIUM_INVALID,
    PC_RESERVE_LIQUIDITY_NOT_0,
    RC_INVALID_BORROW_CAP,
    RC_INVALID_SUPPLY_CAP,
  } = ProtocolErrors;

  it('ReserveConfiguration setLiquidationBonus() threshold > MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    const { poolAdmin, dai, configurator } = testEnv;
    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, 5, 10, 65535 + 1)
    ).to.be.revertedWith(RC_INVALID_LIQ_BONUS);
  });

  it('ReserveConfiguration setReserveFactor() reserveFactor > MAX_VALID_RESERVE_FACTOR', async () => {
    const { dai, configurator } = testEnv;
    const invalidReserveFactor = 65536;
    await expect(
      configurator.setReserveFactor(dai.address, invalidReserveFactor)
    ).to.be.revertedWith(RC_INVALID_RESERVE_FACTOR);
  });

  it('PoolConfigurator configureReserveAsCollateral() ltv > liquidationThreshold', async () => {
    const { poolAdmin, dai, configurator, helpersContract } = testEnv;

    const config = await helpersContract.getReserveConfigurationData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(
          dai.address,
          65535 + 1,
          config.liquidationThreshold,
          config.liquidationBonus
        )
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('PoolConfigurator configureReserveAsCollateral() liquidationBonus < 10000', async () => {
    const { poolAdmin, dai, configurator, helpersContract } = testEnv;

    const config = await helpersContract.getReserveConfigurationData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, config.ltv, config.liquidationThreshold, 10000)
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('PoolConfigurator configureReserveAsCollateral() liquidationThreshold.percentMul(liquidationBonus) > PercentageMath.PERCENTAGE_FACTOR', async () => {
    const { poolAdmin, dai, configurator } = testEnv;

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, 10001, 10001, 10001)
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('PoolConfigurator configureReserveAsCollateral() liquidationThreshold == 0 && liquidationBonus > 0', async () => {
    const { poolAdmin, dai, configurator } = testEnv;

    await expect(
      configurator.connect(poolAdmin.signer).configureReserveAsCollateral(dai.address, 0, 0, 10500)
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('Tries to update flashloan premium total > PERCENTAGE_FACTOR and reverts', async () => {
    const { configurator } = testEnv;

    const newPremiumTotal = 10001;
    await expect(configurator.updateFlashloanPremiumTotal(newPremiumTotal)).to.be.revertedWith(
      PC_FLASHLOAN_PREMIUM_INVALID
    );
  });

  it('Tries to update flashloan premium total < FLASHLOAN_PREMIUM_TO_PROTOCOL and reverts', async () => {
    const { configurator } = testEnv;

    const newPremiumToProtocol = 40;
    const newPremiumTotal = 100;
    const wrongPremiumTotal = 39;

    // Update FLASHLOAN_PREMIUM_TO_PROTOCOL to non-zero
    expect(await configurator.updateFlashloanPremiumTotal(newPremiumTotal))
      .to.emit(configurator, 'FlashloanPremiumTotalUpdated')
      .withArgs(newPremiumTotal);

    expect(await configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol))
      .to.emit(configurator, 'FlashloanPremiumToProcolUpdated')
      .withArgs(newPremiumToProtocol);

    await expect(configurator.updateFlashloanPremiumTotal(wrongPremiumTotal)).to.be.revertedWith(
      PC_FLASHLOAN_PREMIUMS_MISMATCH
    );
  });

  it('Tries to update flashloan premium to protocol > PERCENTAGE_FACTOR and reverts', async () => {
    const { configurator } = testEnv;

    const newPremiumToProtocol = 10001;
    await expect(
      configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol)
    ).to.be.revertedWith(PC_FLASHLOAN_PREMIUM_INVALID);
  });

  it('Tries to update flashloan premium to protocol > FLASHLOAN_PREMIUM_TOTAL and reverts', async () => {
    const { configurator } = testEnv;

    const newPremiumToProtocol = 101;
    await expect(
      configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol)
    ).to.be.revertedWith(PC_FLASHLOAN_PREMIUMS_MISMATCH);
  });

  it('Tries to update borrowCap > MAX_BORROW_CAP and reverts', async () => {
    const { configurator, weth } = testEnv;
    await expect(
      configurator.setBorrowCap(weth.address, BigNumber.from(MAX_BORROW_CAP).add(1))
    ).to.be.revertedWith(RC_INVALID_BORROW_CAP);
  });

  it('Tries to update supplyCap > MAX_SUPPLY_CAP and reverts', async () => {
    const { configurator, weth } = testEnv;
    await expect(
      configurator.setSupplyCap(weth.address, BigNumber.from(MAX_BORROW_CAP).add(1))
    ).to.be.revertedWith(RC_INVALID_SUPPLY_CAP);
  });

  it('Tries to disable the DAI reserve with liquidity on it and reverts', async () => {
    const { dai, pool, configurator } = testEnv;
    const userAddress = await pool.signer.getAddress();
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    // Top up user
    expect(await dai.mint(amountDAItoDeposit));

    // Approve protocol to access depositor wallet
    expect(await dai.approve(pool.address, MAX_UINT_AMOUNT));

    // User 1 deposits 1000 DAI
    expect(await pool.deposit(dai.address, amountDAItoDeposit, userAddress, '0'));

    await expect(
      configurator.deactivateReserve(dai.address),
      PC_RESERVE_LIQUIDITY_NOT_0
    ).to.be.revertedWith(PC_RESERVE_LIQUIDITY_NOT_0);
  });
});
