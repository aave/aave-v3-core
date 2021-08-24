import { expect } from 'chai';
import { BigNumber, ethers } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { DRE, evmRevert, evmSnapshot, timeLatest } from '../helpers/misc-utils';
import { _TypedDataEncoder } from 'ethers/lib/utils';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';
import { configuration } from './helpers/utils/calculations';

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
    /**
     * `setLtv()` is called only from the `PoolConfigurator`. The pool configurator will only call `setLtv()` if
     * 1. ltv <= liqudationThreshold. So max ltv = 65535 +1 will also set the liquidationThreshold
     * 2. liquidationBonus > 10000
     * 3. liquidationThreshold * liquidationBonus / 10000 <= 10000, which is not possible as liquidationThreshold already is > 10000
     */
  });

  it('ReserveConfiguration setLiquidationThreshold() threshold > MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    expect(false, 'Impossible').to.be.eq(true);
    /**
     * `setLiquidationThreshold()` is called only from the `PoolConfigurator`. The pool configurator will only call `setLiquidationThreshold()` if
     * 1. ltv <= liqudationThreshold.
     * 2. liquidationBonus > 10000
     * 3. liquidationThreshold * liquidationBonus / 10000 <= 10000, which is not possible as liquidationThreshold already is > 10000 (max = 65535)
     */
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
    // Should actually be possible for us to just set it direct
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

  it('PoolConfigurator setPoolPause, reserve[i] == address(0)', async () => {
    expect(false, 'Impossible').to.be.eq(true);
    /**
     * Using the current contracts, it is not possible to enter the rase where reserve[i] == address(0).
     * This is because the `_pool.getReservesList()` will return only NON address(0) addresses.
     */
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
