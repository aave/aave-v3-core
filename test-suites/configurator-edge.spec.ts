import { expect } from 'chai';
import { BigNumber, ethers } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { DRE, evmRevert, evmSnapshot, timeLatest } from '../helpers/misc-utils';
import { _TypedDataEncoder } from 'ethers/lib/utils';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';

makeSuite('Configurator - edge cases', (testEnv: TestEnv) => {
  const {
    PC_INVALID_CONFIGURATION,
    PC_CALLER_NOT_EMERGENCY_ADMIN,
    RC_INVALID_LIQ_THRESHOLD,
    RC_INVALID_LTV,
    RC_INVALID_LIQ_BONUS,
  } = ProtocolErrors;

  it('ReserveConfiguration setLtv() ltv > MAX_VALID_LTV', async () => {
    expect(false, 'Impossible').to.be.eq(true);
    // configureReserveAsCollateral
    const { variableDebtDai, stableDebtDai, poolAdmin, weth, dai, configurator, helpersContract } =
      testEnv;

    const ltv = 65535 + 1; // We are borrowing a lot here :eyes: Why is it even allowed to have it so large?
    const liquidationBonus = 10500; // > 10000
    const liquidationThreshold = ltv; // >= ltv

    // max value = 65535
    // liquidationThreshold >= ltv
    // liquidationBonus > 10000
    // liquidationThreshold * (liquidationBonus / 10000) <= 10000
    // Not sure that we can satisfy the above. At best, we multiply by ~1, and liquidationThreshold is far beyond

    const config = await helpersContract.getReserveConfigurationData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, ltv, liquidationThreshold, liquidationBonus)
    ).to.be.revertedWith(RC_INVALID_LTV);
  });

  it('ReserveConfiguration setLiquidationThreshold() threshold > MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    expect(false, 'Impossible').to.be.eq(true);
    // configureReserveAsCollateral
    const { variableDebtDai, stableDebtDai, poolAdmin, weth, dai, configurator, helpersContract } =
      testEnv;

    const hugeThreshold = 65535 + 1;

    const config = await helpersContract.getReserveConfigurationData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, config.ltv, hugeThreshold, 10001)
    ).to.be.revertedWith(RC_INVALID_LTV);
  });

  it('ReserveConfiguration setLiquidationBonus() threshold > MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    const { poolAdmin, dai, configurator } = testEnv;
    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, 5, 10, 65535 + 1)
    ).to.be.revertedWith(RC_INVALID_LIQ_BONUS);
  });

  it('ReserveConfiguration setDecimals() decimals > 255', async () => {
    expect(false, 'TODO').to.be.eq(true);
    const { pool, poolAdmin, configurator, dai, helpersContract } = testEnv;
    const daiConfig = await helpersContract.getReserveTokensAddresses(dai.address);
    const config = {};
  });

  it('PoolConfigurator configureReserveAsCollateral() ltv > MAX', async () => {
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

  it('PoolConfigurator configureReserveAsCollateral() liquidationBonus > 10000', async () => {
    const { poolAdmin, dai, configurator, helpersContract } = testEnv;

    const config = await helpersContract.getReserveConfigurationData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, config.ltv, 10001, config.liquidationBonus)
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('PoolConfigurator configureReserveAsCollateral() liquidationThreshold.percentMul(liquidationBonus) > PercentageMath.PERCENTAGE_FACTOR', async () => {
    const { poolAdmin, dai, configurator, helpersContract } = testEnv;

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, 10001, 10001, 10001)
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('PoolConfigurator configureReserveAsCollateral() liquidationThreshold == 0 && liquidationBonus > 0', async () => {
    const { poolAdmin, dai, configurator, helpersContract } = testEnv;

    await expect(
      configurator.connect(poolAdmin.signer).configureReserveAsCollateral(dai.address, 0, 0, 10500)
    ).to.be.revertedWith(PC_INVALID_CONFIGURATION);
  });

  it('PoolConfigurator setPoolPause not emergency admin', async () => {
    const { poolAdmin, users, dai, configurator, helpersContract } = testEnv;

    await expect(configurator.connect(users[0].signer).setPoolPause(true)).to.be.revertedWith(
      PC_CALLER_NOT_EMERGENCY_ADMIN
    );
  });

  it('PoolConfigurator setPoolPause, reserve[i] == 0', async () => {
    const { poolAdmin, users, dai, configurator, helpersContract } = testEnv;
    expect(false, 'TODO').to.be.eq(true);
  });

  it('PoolConfigurator setReserveInterestRateStrategyAddress()', async () => {
    const { poolAdmin, pool, configurator, dai } = testEnv;

    const before = await pool.getReserveData(dai.address);

    await configurator
      .connect(poolAdmin.signer)
      .setReserveInterestRateStrategyAddress(dai.address, ZERO_ADDRESS);
    const after = await pool.getReserveData(dai.address);

    expect(before.interestRateStrategyAddress).to.not.be.eq(ZERO_ADDRESS);
    expect(after.interestRateStrategyAddress).to.be.eq(ZERO_ADDRESS);
  });
});
