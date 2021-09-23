import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ONE_ADDRESS, RAY, ZERO_ADDRESS } from '../helpers/constants';
import { strategyWETH } from '../market-config/reservesConfigs';
import { AaveProtocolDataProvider } from '../types';
import { TestEnv, makeSuite } from './helpers/make-suite';

type ReserveConfigurationValues = {
  reserveDecimals: string;
  baseLTVAsCollateral: string;
  liquidationThreshold: string;
  liquidationBonus: string;
  reserveFactor: string;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  borrowCap: string;
  supplyCap: string;
};

const expectReserveConfigurationData = (
  reserveCfg: {
    decimals: BigNumber;
    ltv: BigNumber;
    liquidationThreshold: BigNumber;
    liquidationBonus: BigNumber;
    reserveFactor: BigNumber;
    usageAsCollateralEnabled: boolean;
    borrowingEnabled: boolean;
    stableBorrowRateEnabled: boolean;
    isActive: boolean;
    isFrozen: boolean;
  },
  capsCfg: {
    borrowCap: BigNumber;
    supplyCap: BigNumber;
  },
  values: ReserveConfigurationValues
) => {
  expect(reserveCfg.decimals).to.be.eq(values.reserveDecimals, 'reserveDecimals is not correct');
  expect(reserveCfg.ltv).to.be.eq(values.baseLTVAsCollateral, 'ltv is not correct');
  expect(reserveCfg.liquidationThreshold).to.be.eq(
    values.liquidationThreshold,
    'liquidationThreshold is not correct'
  );
  expect(reserveCfg.liquidationBonus).to.be.eq(
    values.liquidationBonus,
    'liquidationBonus is not correct'
  );
  expect(reserveCfg.reserveFactor).to.be.eq(values.reserveFactor, 'reserveFactor is not correct');
  expect(reserveCfg.usageAsCollateralEnabled).to.be.eq(
    values.usageAsCollateralEnabled,
    'usageAsCollateralEnabled is not correct'
  );
  expect(reserveCfg.borrowingEnabled).to.be.eq(
    values.borrowingEnabled,
    'borrowingEnabled is not correct'
  );
  expect(reserveCfg.stableBorrowRateEnabled).to.be.eq(
    values.stableBorrowRateEnabled,
    'stableBorrowRateEnabled is not correct'
  );
  expect(reserveCfg.isActive).to.be.eq(values.isActive, 'isActive is not correct');
  expect(reserveCfg.isFrozen).to.be.eq(values.isFrozen, 'isFrozen is not correct');
  expect(capsCfg.borrowCap).to.be.eq(values.borrowCap, 'borrowCap is not correct');
  expect(capsCfg.supplyCap).to.be.eq(values.supplyCap, 'supplyCap is not correct');
};

const getReserveData = async (helpersContract: AaveProtocolDataProvider, asset: string) => {
  return Promise.all([
    helpersContract.getReserveConfigurationData(asset),
    helpersContract.getReserveCaps(asset),
    helpersContract.getPaused(asset),
  ]);
};

makeSuite('PoolConfigurator', (testEnv: TestEnv) => {
  let baseConfigValues: ReserveConfigurationValues;

  before(() => {
    const {
      reserveDecimals,
      baseLTVAsCollateral,
      liquidationThreshold,
      liquidationBonus,
      reserveFactor,
      borrowingEnabled,
      stableBorrowRateEnabled,
      borrowCap,
      supplyCap,
    } = strategyWETH;
    baseConfigValues = {
      reserveDecimals,
      baseLTVAsCollateral,
      liquidationThreshold,
      liquidationBonus,
      reserveFactor,
      usageAsCollateralEnabled: true,
      borrowingEnabled,
      stableBorrowRateEnabled,
      isActive: true,
      isFrozen: false,
      borrowCap: borrowCap,
      supplyCap: supplyCap,
    };
  });

  it('Deactivates the ETH reserve', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.deactivateReserve(weth.address));
    const { isActive } = await helpersContract.getReserveConfigurationData(weth.address);
    expect(isActive).to.be.equal(false);
  });

  it('Reactivates the ETH reserve', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.activateReserve(weth.address));
    const { isActive } = await helpersContract.getReserveConfigurationData(weth.address);
    expect(isActive).to.be.equal(true);
  });

  it('Pauses the ETH reserve by pool admin', async () => {
    const { configurator, weth, helpersContract, addressesProvider } = testEnv;
    expect(await configurator.signer.getAddress()).to.be.equal(
      await addressesProvider.getPoolAdmin()
    );
    expect(await configurator.setReservePause(weth.address, true))
      .to.emit(configurator, 'ReservePaused')
      .withArgs(weth.address);
    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, { ...baseConfigValues });
    expect(isPaused).to.be.equal(true);
  });

  it('Unpauses the ETH reserve by pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.setReservePause(weth.address, false))
      .to.emit(configurator, 'ReserveUnpaused')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, { ...baseConfigValues });
    expect(isPaused).to.be.equal(false);
  });

  it('Pauses the ETH reserve by emergency admin', async () => {
    const { configurator, weth, helpersContract, emergencyAdmin } = testEnv;
    expect(await configurator.connect(emergencyAdmin.signer).setReservePause(weth.address, true))
      .to.emit(configurator, 'ReservePaused')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, { ...baseConfigValues });
    expect(isPaused).to.be.equal(true);
  });

  it('Unpauses the ETH reserve by emergency admin', async () => {
    const { configurator, helpersContract, weth, emergencyAdmin } = testEnv;
    expect(await configurator.connect(emergencyAdmin.signer).setReservePause(weth.address, false))
      .to.emit(configurator, 'ReserveUnpaused')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, { ...baseConfigValues });
    expect(isPaused).to.be.equal(false);
  });

  it('Freezes the ETH reserve by pool Admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;

    expect(await configurator.freezeReserve(weth.address))
      .to.emit(configurator, 'ReserveFrozen')
      .withArgs(weth.address);
    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      isFrozen: true,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Unfreezes the ETH reserve by Pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.unfreezeReserve(weth.address))
      .to.emit(configurator, 'ReserveUnfrozen')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, { ...baseConfigValues });
    expect(isPaused).to.be.equal(false);
  });

  it('Freezes the ETH reserve by Risk Admin', async () => {
    const { configurator, weth, helpersContract, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).freezeReserve(weth.address))
      .to.emit(configurator, 'ReserveFrozen')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      isFrozen: true,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Unfreezes the ETH reserve by Risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).unfreezeReserve(weth.address))
      .to.emit(configurator, 'ReserveUnfrozen')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, { ...baseConfigValues });
    expect(isPaused).to.be.equal(false);
  });

  it('Deactivates the ETH reserve for borrowing via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.disableBorrowingOnReserve(weth.address))
      .to.emit(configurator, 'BorrowingDisabledOnReserve')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      borrowingEnabled: false,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Activates the ETH reserve for borrowing via pool admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.enableBorrowingOnReserve(weth.address, '0', true))
      .to.emit(configurator, 'BorrowingEnabledOnReserve')
      .withArgs(weth.address, true);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);
    const { variableBorrowIndex } = await helpersContract.getReserveData(weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
    });
    expect(isPaused).to.be.equal(false);
    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Deactivates the ETH reserve for borrowing via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).disableBorrowingOnReserve(weth.address))
      .to.emit(configurator, 'BorrowingDisabledOnReserve')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      borrowingEnabled: false,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Activates the ETH reserve for borrowing via risk admin', async () => {
    const { configurator, weth, helpersContract, riskAdmin } = testEnv;
    expect(
      await configurator.connect(riskAdmin.signer).enableBorrowingOnReserve(weth.address, '0', true)
    )
      .to.emit(configurator, 'BorrowingEnabledOnReserve')
      .withArgs(weth.address, true);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);
    const { variableBorrowIndex } = await helpersContract.getReserveData(weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
    });
    expect(isPaused).to.be.equal(false);
    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Deactivates the ETH reserve as collateral via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.configureReserveAsCollateral(weth.address, 0, 0, 0))
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(weth.address, 0, 0, 0);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      baseLTVAsCollateral: '0',
      liquidationThreshold: '0',
      liquidationBonus: '0',
      usageAsCollateralEnabled: false,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Activates the ETH reserve as collateral via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.configureReserveAsCollateral(weth.address, '8000', '8250', '10500'))
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(weth.address, '8000', '8250', '10500');

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      baseLTVAsCollateral: '8000',
      liquidationThreshold: '8250',
      liquidationBonus: '10500',
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Deactivates the ETH reserve as collateral via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(
      await configurator
        .connect(riskAdmin.signer)
        .configureReserveAsCollateral(weth.address, 0, 0, 0)
    )
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(weth.address, 0, 0, 0);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      baseLTVAsCollateral: '0',
      liquidationThreshold: '0',
      liquidationBonus: '0',
      usageAsCollateralEnabled: false,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Activates the ETH reserve as collateral via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(
      await configurator
        .connect(riskAdmin.signer)
        .configureReserveAsCollateral(weth.address, '8000', '8250', '10500')
    )
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(weth.address, '8000', '8250', '10500');

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      baseLTVAsCollateral: '8000',
      liquidationThreshold: '8250',
      liquidationBonus: '10500',
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Disable stable borrow rate on the ETH reserve via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.disableReserveStableRate(weth.address))
      .to.emit(configurator, 'StableRateDisabledOnReserve')
      .withArgs(weth.address);
    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      stableBorrowRateEnabled: false,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Enables stable borrow rate on the ETH reserve via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.enableReserveStableRate(weth.address))
      .to.emit(configurator, 'StableRateEnabledOnReserve')
      .withArgs(weth.address);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Disable stable borrow rate on the ETH reserve risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).disableReserveStableRate(weth.address))
      .to.emit(configurator, 'StableRateDisabledOnReserve')
      .withArgs(weth.address);
    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      stableBorrowRateEnabled: false,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Enables stable borrow rate on the ETH reserve risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).enableReserveStableRate(weth.address))
      .to.emit(configurator, 'StableRateEnabledOnReserve')
      .withArgs(weth.address);
    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Changes the reserve factor of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;

    const newReserveFactor = '1000';
    expect(await configurator.setReserveFactor(weth.address, newReserveFactor))
      .to.emit(configurator, 'ReserveFactorChanged')
      .withArgs(weth.address, newReserveFactor);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      reserveFactor: newReserveFactor,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Changes the reserve factor of WETH via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    const newReserveFactor = '1000';
    expect(
      await configurator.connect(riskAdmin.signer).setReserveFactor(weth.address, newReserveFactor)
    )
      .to.emit(configurator, 'ReserveFactorChanged')
      .withArgs(weth.address, newReserveFactor);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      reserveFactor: newReserveFactor,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Updates the borrowCap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    const newBorrowCap = '3000000';
    expect(await configurator.setBorrowCap(weth.address, newBorrowCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(weth.address, newBorrowCap);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Updates the borrowCap of WETH risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    const newBorrowCap = '3000000';
    expect(await configurator.connect(riskAdmin.signer).setBorrowCap(weth.address, newBorrowCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(weth.address, newBorrowCap);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Updates the supplyCap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    const newBorrowCap = '3000000';
    const newSupplyCap = '3000000';
    expect(await configurator.setSupplyCap(weth.address, newSupplyCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(weth.address, newSupplyCap);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
      supplyCap: newSupplyCap,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Updates the supplyCap of WETH via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    const newBorrowCap = '3000000';
    const newSupplyCap = '3000000';
    expect(await configurator.connect(riskAdmin.signer).setSupplyCap(weth.address, newSupplyCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(weth.address, newSupplyCap);

    const [configData, reserveCaps, isPaused] = await getReserveData(helpersContract, weth.address);

    expectReserveConfigurationData(configData, reserveCaps, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
      supplyCap: newSupplyCap,
    });
    expect(isPaused).to.be.equal(false);
  });

  it('Updates the ReserveInterestRateStrategy address of WETH via pool admin', async () => {
    const { poolAdmin, pool, configurator, weth } = testEnv;

    const before = await pool.getReserveData(weth.address);

    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setReserveInterestRateStrategyAddress(weth.address, ZERO_ADDRESS)
    )
      .to.emit(configurator, 'ReserveInterestRateStrategyChanged')
      .withArgs(weth.address, ZERO_ADDRESS);
    const after = await pool.getReserveData(weth.address);

    expect(before.interestRateStrategyAddress).to.not.be.eq(ZERO_ADDRESS);
    expect(after.interestRateStrategyAddress).to.be.eq(ZERO_ADDRESS);
  });

  it('Updates the ReserveInterestRateStrategy address of WETH via risk admin', async () => {
    const { riskAdmin, pool, configurator, weth } = testEnv;

    const before = await pool.getReserveData(weth.address);

    expect(
      await configurator
        .connect(riskAdmin.signer)
        .setReserveInterestRateStrategyAddress(weth.address, ONE_ADDRESS)
    )
      .to.emit(configurator, 'ReserveInterestRateStrategyChanged')
      .withArgs(weth.address, ONE_ADDRESS);
    const after = await pool.getReserveData(weth.address);

    expect(before.interestRateStrategyAddress).to.not.be.eq(ONE_ADDRESS);
    expect(after.interestRateStrategyAddress).to.be.eq(ONE_ADDRESS);
  });

  it('Register a new risk Admin', async () => {
    const { configurator, users, riskAdmin } = testEnv;
    expect(await configurator.registerRiskAdmin(users[3].address))
      .to.emit(configurator, 'RiskAdminRegistered')
      .withArgs(users[3].address);

    const isRiskAdminRegistered = await configurator.isRiskAdmin(riskAdmin.address);
    const isNewRegistered = await configurator.isRiskAdmin(users[3].address);
    expect(isNewRegistered).to.be.true;
    expect(isRiskAdminRegistered).to.be.true;
  });

  it('Unregister a risk admins', async () => {
    const { configurator, users, riskAdmin } = testEnv;
    expect(await configurator.unregisterRiskAdmin(users[3].address))
      .to.emit(configurator, 'RiskAdminUnregistered')
      .withArgs(users[3].address);
    expect(await configurator.unregisterRiskAdmin(riskAdmin.address))
      .to.emit(configurator, 'RiskAdminUnregistered')
      .withArgs(riskAdmin.address);

    const isRiskAdminRegistered = await configurator.isRiskAdmin(riskAdmin.address);
    const isNewRegistered = await configurator.isRiskAdmin(users[3].address);
    expect(isNewRegistered).to.be.false;
    expect(isRiskAdminRegistered).to.be.false;
  });

  it('Authorized a new flash borrower', async () => {
    const { pool, configurator, users } = testEnv;
    expect(await configurator.authorizeFlashBorrower(users[4].address))
      .to.emit(configurator, 'FlashBorrowerAuthorized')
      .withArgs(users[4].address);

    const isFlashBorrowerAuthorized = await pool.isFlashBorrowerAuthorized(users[4].address);
    expect(isFlashBorrowerAuthorized).to.be.true;
  });

  it('Unauthorized flash borrower', async () => {
    const { pool, configurator, users } = testEnv;
    expect(await configurator.unauthorizeFlashBorrower(users[4].address))
      .to.emit(configurator, 'FlashBorrowerUnauthorized')
      .withArgs(users[4].address);

    const isFlashBorrowerAuthorized = await pool.isFlashBorrowerAuthorized(users[4].address);
    expect(isFlashBorrowerAuthorized).to.be.false;
  });

  it('Updates flash loan premiums: 10 toProtocol, 40 total', async () => {
    const { pool, configurator } = testEnv;
    const newPremiumTotal = 40;
    const newPremiumToProtocol = 10;

    expect(await configurator.updateFlashloanPremiumTotal(newPremiumTotal))
      .to.emit(configurator, 'FlashloanPremiumTotalUpdated')
      .withArgs(newPremiumTotal);
    expect(await configurator.updateFlashloanPremiumToProtocol(newPremiumToProtocol))
      .to.emit(configurator, 'FlashloanPremiumToProtocolUpdated')
      .withArgs(newPremiumToProtocol);

    expect(await pool.FLASHLOAN_PREMIUM_TOTAL()).to.be.eq(newPremiumTotal);
    expect(await pool.FLASHLOAN_PREMIUM_TO_PROTOCOL()).to.be.eq(newPremiumToProtocol);
  });

  it('Adds a new eMode category for stablecoins', async () => {
    const { configurator, pool, poolAdmin } = testEnv;

    expect(
      await configurator
        .connect(poolAdmin.signer)
        .setEModeCategory('1', '9800', '9800', '10100', ONE_ADDRESS, 'STABLECOINS')
    )
      .to.emit(configurator, 'EModeCategoryAdded')
      .withArgs(1, 9800, 9800, 10100, ONE_ADDRESS, 'STABLECOINS');

    const categoryData = await pool.getEModeCategoryData(1);
    expect(categoryData.ltv).to.be.equal(9800, 'invalid eMode category ltv');
    expect(categoryData.liquidationThreshold).to.be.equal(
      9800,
      'invalid eMode category liq threshold'
    );
    expect(categoryData.liquidationBonus).to.be.equal(10100, 'invalid eMode category liq bonus');
    expect(categoryData.priceSource).to.be.equal(
      ONE_ADDRESS,
      'invalid eMode category price source'
    );
  });

  it('Set a eMode category to an asset', async () => {
    const { configurator, pool, poolAdmin, dai } = testEnv;

    expect(await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, '1'))
      .to.emit(configurator, 'EModeAssetCategoryChanged')
      .withArgs(dai.address, 1);

    const categoryData = await pool.getEModeCategoryData(1);
    expect(categoryData.ltv).to.be.equal(9800, 'invalid eMode category ltv');
    expect(categoryData.liquidationThreshold).to.be.equal(
      9800,
      'invalid eMode category liq threshold'
    );
    expect(categoryData.liquidationBonus).to.be.equal(10100, 'invalid eMode category liq bonus');
    expect(categoryData.priceSource).to.be.equal(
      ONE_ADDRESS,
      'invalid eMode category price source'
    );
  });
});
