import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';

makeSuite('Configurator - edge cases', (testEnv: TestEnv) => {
  const { PC_INVALID_CONFIGURATION, PC_CALLER_NOT_EMERGENCY_ADMIN, RC_INVALID_LIQ_BONUS } =
    ProtocolErrors;

  it('ReserveConfiguration setLiquidationBonus() threshold > MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    const { poolAdmin, dai, configurator } = testEnv;
    await expect(
      configurator
        .connect(poolAdmin.signer)
        .configureReserveAsCollateral(dai.address, 5, 10, 65535 + 1)
    ).to.be.revertedWith(RC_INVALID_LIQ_BONUS);
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
    const { users, configurator } = testEnv;

    await expect(configurator.connect(users[0].signer).setPoolPause(true)).to.be.revertedWith(
      PC_CALLER_NOT_EMERGENCY_ADMIN
    );
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
