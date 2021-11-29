import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors } from '../helpers/types';
import {
  MAX_BORROW_CAP,
  MAX_UNBACKED_MINT_CAP,
  MAX_UINT_AMOUNT,
  MAX_SUPPLY_CAP,
  ZERO_ADDRESS,
} from '../helpers/constants';
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
    RC_INVALID_UNBACKED_MINT_CAP,
    RC_INVALID_EMODE_CATEGORY,
    VL_INCONSISTENT_EMODE_CATEGORY,
    PC_BRIDGE_PROTOCOL_FEE_INVALID,
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

  it('Tries to bridge protocol fee > PERCENTAGE_FACTOR (revert expected)', async () => {
    const { configurator } = testEnv;
    const newProtocolFee = 10001;
    await expect(configurator.updateBridgeProtocolFee(newProtocolFee)).to.be.revertedWith(
      PC_BRIDGE_PROTOCOL_FEE_INVALID
    );
  });

  it('Tries to update flashloan premium total > PERCENTAGE_FACTOR (revert expected)', async () => {
    const { configurator } = testEnv;

    const newPremiumTotal = 10001;
    await expect(configurator.updateFlashloanPremiumTotal(newPremiumTotal)).to.be.revertedWith(
      PC_FLASHLOAN_PREMIUM_INVALID
    );
  });

  it('Tries to update flashloan premium total < FLASHLOAN_PREMIUM_TO_PROTOCOL (revert expected)', async () => {
    const { configurator } = testEnv;

    const newPremiumToProtocol = 40;
    const newPremiumTotal = 100;
    const wrongPremiumTotal = 39;

    // Update FLASHLOAN_PREMIUM_TO_PROTOCOL to non-zero
    expect(await configurator.updateFlashloanPremiumTotal(newPremiumTotal))
      .to.emit(configurator, 'FlashloanPremiumTotalUpdated')
      .withArgs(newPremiumTotal);

    expect(await configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol))
      .to.emit(configurator, 'FlashloanPremiumToProtocolUpdated')
      .withArgs(newPremiumToProtocol);

    await expect(configurator.updateFlashloanPremiumTotal(wrongPremiumTotal)).to.be.revertedWith(
      PC_FLASHLOAN_PREMIUMS_MISMATCH
    );
  });

  it('Tries to update flashloan premium to protocol > PERCENTAGE_FACTOR (revert expected)', async () => {
    const { configurator } = testEnv;

    const newPremiumToProtocol = 10001;
    await expect(
      configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol)
    ).to.be.revertedWith(PC_FLASHLOAN_PREMIUM_INVALID);
  });

  it('Tries to update flashloan premium to protocol > FLASHLOAN_PREMIUM_TOTAL (revert expected)', async () => {
    const { configurator } = testEnv;

    const newPremiumToProtocol = 101;
    await expect(
      configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol)
    ).to.be.revertedWith(PC_FLASHLOAN_PREMIUMS_MISMATCH);
  });

  it('Tries to update borrowCap > MAX_BORROW_CAP (revert expected)', async () => {
    const { configurator, weth } = testEnv;
    await expect(
      configurator.setBorrowCap(weth.address, BigNumber.from(MAX_BORROW_CAP).add(1))
    ).to.be.revertedWith(RC_INVALID_BORROW_CAP);
  });

  it('Tries to update supplyCap > MAX_SUPPLY_CAP (revert expected)', async () => {
    const { configurator, weth } = testEnv;
    await expect(
      configurator.setSupplyCap(weth.address, BigNumber.from(MAX_SUPPLY_CAP).add(1))
    ).to.be.revertedWith(RC_INVALID_SUPPLY_CAP);
  });

  it('Tries to update unbackedMintCap > MAX_UNBACKED_MINT_CAP (revert expected)', async () => {
    const { configurator, weth } = testEnv;
    await expect(
      configurator.setUnbackedMintCap(weth.address, BigNumber.from(MAX_UNBACKED_MINT_CAP).add(1))
    ).to.be.revertedWith(RC_INVALID_UNBACKED_MINT_CAP);
  });

  it('Tries to add a category with id 0 (revert expected)', async () => {
    const { configurator, poolAdmin } = testEnv;

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .setEModeCategory(0, '9800', '9800', '10100', ZERO_ADDRESS, 'INVALID_ID_CATEGORY')
    ).to.be.revertedWith(RC_INVALID_EMODE_CATEGORY);
  });

  it('Tries to add an eMode category with ltv > liquidation threshold (revert expected)', async () => {
    const { configurator, poolAdmin } = testEnv;

    const id = BigNumber.from('16');
    const ltv = BigNumber.from('9900');
    const lt = BigNumber.from('9800');
    const lb = BigNumber.from('10100');
    const oracle = ZERO_ADDRESS;
    const label = 'STABLECOINS';

    await expect(
      configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('Tries to add an eMode category with no liquidation bonus (revert expected)', async () => {
    const { configurator, poolAdmin } = testEnv;

    const id = BigNumber.from('16');
    const ltv = BigNumber.from('9800');
    const lt = BigNumber.from('9800');
    const lb = BigNumber.from('10000');
    const oracle = ZERO_ADDRESS;
    const label = 'STABLECOINS';

    await expect(
      configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('Tries to add an eMode category with too large liquidation bonus (revert expected)', async () => {
    const { configurator, poolAdmin } = testEnv;

    const id = BigNumber.from('16');
    const ltv = BigNumber.from('9800');
    const lt = BigNumber.from('9800');
    const lb = BigNumber.from('11000');
    const oracle = ZERO_ADDRESS;
    const label = 'STABLECOINS';

    await expect(
      configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('Tries to add an eMode category with liquidation threshold > 1 (revert expected)', async () => {
    const { configurator, poolAdmin } = testEnv;

    const id = BigNumber.from('16');
    const ltv = BigNumber.from('9800');
    const lt = BigNumber.from('10100');
    const lb = BigNumber.from('10100');
    const oracle = ZERO_ADDRESS;
    const label = 'STABLECOINS';

    await expect(
      configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('Tries to set DAI eMode category to undefined category (revert expected)', async () => {
    const { configurator, poolAdmin, dai } = testEnv;

    await expect(
      configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, '100')
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('Tries to set DAI eMode category to category with too low LT (revert expected)', async () => {
    const { configurator, helpersContract, poolAdmin, dai } = testEnv;

    const { liquidationThreshold, ltv } = await helpersContract.getReserveConfigurationData(
      dai.address
    );

    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory(
          '100',
          ltv,
          liquidationThreshold.sub(1),
          '10100',
          ZERO_ADDRESS,
          'LT_TOO_LOW_FOR_DAI'
        )
    );

    await expect(
      configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, '100')
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('Tries to disable the DAI reserve with liquidity on it (revert expected)', async () => {
    const { dai, pool, configurator } = testEnv;
    const userAddress = await pool.signer.getAddress();
    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    // Top up user
    expect(await dai['mint(uint256)'](amountDAItoDeposit));

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
