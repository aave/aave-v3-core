import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { strategyWETH } from '@aave/deploy-v3/dist/markets/aave/reservesConfigs';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/tx';
import { MAX_UINT_AMOUNT, ONE_ADDRESS, RAY, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import {
  AaveProtocolDataProvider,
  AToken__factory,
  MintableERC20__factory,
  MockReserveInterestRateStrategy__factory,
  StableDebtToken__factory,
  VariableDebtToken__factory,
} from '../types';
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
  isPaused: boolean;
  eModeCategory: BigNumber;
  borrowCap: string;
  supplyCap: string;
};

const expectReserveConfigurationData = async (
  helpersContract: AaveProtocolDataProvider,
  asset: string,
  values: ReserveConfigurationValues
) => {
  const [reserveCfg, eModeCategory, reserveCaps, isPaused] = await getReserveData(
    helpersContract,
    asset
  );
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
  expect(isPaused).to.be.equal(values.isPaused, 'isPaused is not correct');
  expect(eModeCategory).to.be.eq(values.eModeCategory, 'eModeCategory is not correct');
  expect(reserveCaps.borrowCap).to.be.eq(values.borrowCap, 'borrowCap is not correct');
  expect(reserveCaps.supplyCap).to.be.eq(values.supplyCap, 'supplyCap is not correct');
};

const getReserveData = async (helpersContract: AaveProtocolDataProvider, asset: string) => {
  return Promise.all([
    helpersContract.getReserveConfigurationData(asset),
    helpersContract.getReserveEModeCategory(asset),
    helpersContract.getReserveCaps(asset),
    helpersContract.getPaused(asset),
    helpersContract.getLiquidationProtocolFee(asset),
    helpersContract.getUnbackedMintCap(asset),
  ]);
};

makeSuite('PoolConfigurator', (testEnv: TestEnv) => {
  let baseConfigValues: ReserveConfigurationValues;
  const { PC_RESERVE_LIQUIDITY_NOT_0 } = ProtocolErrors;

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
      isPaused: false,
      eModeCategory: BigNumber.from(0),
      borrowCap: borrowCap,
      supplyCap: supplyCap,
    };
  });

  it('InitReserves via AssetListing admin', async () => {
    const { addressesProvider, configurator, poolAdmin, aclManager, users, pool } = testEnv;

    // const snapId
    const assetListingAdmin = users[4];
    // Add new AssetListingAdmin
    expect(
      await aclManager.connect(poolAdmin.signer).addAssetListingAdmin(assetListingAdmin.address)
    );

    // Deploy mock `InitReserveInput`
    const mockToken = await new MintableERC20__factory(await getFirstSigner()).deploy(
      'MOCK',
      'MOCK',
      '18'
    );
    const stableDebtTokenImplementation = await new StableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const variableDebtTokenImplementation = await new VariableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const aTokenImplementation = await new AToken__factory(await getFirstSigner()).deploy(
      pool.address
    );
    const mockRateStrategy = await new MockReserveInterestRateStrategy__factory(
      await getFirstSigner()
    ).deploy(addressesProvider.address, 0, 0, 0, 0, 0, 0);

    // Init the reserve
    const initInputParams: {
      aTokenImpl: string;
      stableDebtTokenImpl: string;
      variableDebtTokenImpl: string;
      underlyingAssetDecimals: BigNumberish;
      interestRateStrategyAddress: string;
      underlyingAsset: string;
      treasury: string;
      incentivesController: string;
      underlyingAssetName: string;
      aTokenName: string;
      aTokenSymbol: string;
      variableDebtTokenName: string;
      variableDebtTokenSymbol: string;
      stableDebtTokenName: string;
      stableDebtTokenSymbol: string;
      params: string;
    }[] = [
      {
        aTokenImpl: aTokenImplementation.address,
        stableDebtTokenImpl: stableDebtTokenImplementation.address,
        variableDebtTokenImpl: variableDebtTokenImplementation.address,
        underlyingAssetDecimals: 18,
        interestRateStrategyAddress: mockRateStrategy.address,
        underlyingAsset: mockToken.address,
        treasury: ZERO_ADDRESS,
        incentivesController: ZERO_ADDRESS,
        underlyingAssetName: 'MOCK',
        aTokenName: 'AMOCK',
        aTokenSymbol: 'AMOCK',
        variableDebtTokenName: 'VMOCK',
        variableDebtTokenSymbol: 'VMOCK',
        stableDebtTokenName: 'SMOCK',
        stableDebtTokenSymbol: 'SMOCK',
        params: '0x10',
      },
    ];

    expect(await configurator.connect(assetListingAdmin.signer).initReserves(initInputParams));
  });

  it('Deactivates the ETH reserve', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.setReserveActive(weth.address, false));
    const { isActive } = await helpersContract.getReserveConfigurationData(weth.address);
    expect(isActive).to.be.equal(false);
  });

  it('Reactivates the ETH reserve', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.setReserveActive(weth.address, true));
    const { isActive } = await helpersContract.getReserveConfigurationData(weth.address);
    expect(isActive).to.be.equal(true);
  });

  it('Pauses the ETH reserve by pool admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.setReservePause(weth.address, true))
      .to.emit(configurator, 'ReservePaused')
      .withArgs(weth.address, true);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      isPaused: true,
    });
  });

  it('Unpauses the ETH reserve by pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.setReservePause(weth.address, false))
      .to.emit(configurator, 'ReservePaused')
      .withArgs(weth.address, false);

    await expectReserveConfigurationData(helpersContract, weth.address, { ...baseConfigValues });
  });

  it('Pauses the ETH reserve by emergency admin', async () => {
    const { configurator, weth, helpersContract, emergencyAdmin } = testEnv;
    expect(await configurator.connect(emergencyAdmin.signer).setReservePause(weth.address, true))
      .to.emit(configurator, 'ReservePaused')
      .withArgs(weth.address, true);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      isPaused: true,
    });
  });

  it('Unpauses the ETH reserve by emergency admin', async () => {
    const { configurator, helpersContract, weth, emergencyAdmin } = testEnv;
    expect(await configurator.connect(emergencyAdmin.signer).setReservePause(weth.address, false))
      .to.emit(configurator, 'ReservePaused')
      .withArgs(weth.address, false);

    await expectReserveConfigurationData(helpersContract, weth.address, { ...baseConfigValues });
  });

  it('Freezes the ETH reserve by pool Admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;

    expect(await configurator.setReseveFreeze(weth.address, true))
      .to.emit(configurator, 'ReserveFrozen')
      .withArgs(weth.address, true);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      isFrozen: true,
    });
  });

  it('Unfreezes the ETH reserve by Pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.setReseveFreeze(weth.address, false))
      .to.emit(configurator, 'ReserveFrozen')
      .withArgs(weth.address, false);

    await expectReserveConfigurationData(helpersContract, weth.address, { ...baseConfigValues });
  });

  it('Freezes the ETH reserve by Risk Admin', async () => {
    const { configurator, weth, helpersContract, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).setReseveFreeze(weth.address, true))
      .to.emit(configurator, 'ReserveFrozen')
      .withArgs(weth.address, true);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      isFrozen: true,
    });
  });

  it('Unfreezes the ETH reserve by Risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).setReseveFreeze(weth.address, false))
      .to.emit(configurator, 'ReserveFrozen')
      .withArgs(weth.address, false);

    await expectReserveConfigurationData(helpersContract, weth.address, { ...baseConfigValues });
  });

  it('Deactivates the ETH reserve for borrowing via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.disableBorrowingOnReserve(weth.address))
      .to.emit(configurator, 'BorrowingOnReserve')
      .withArgs(weth.address, false, false);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      borrowingEnabled: false,
    });
  });

  it('Activates the ETH reserve for borrowing via pool admin', async () => {
    const { configurator, weth, helpersContract } = testEnv;
    expect(await configurator.enableBorrowingOnReserve(weth.address, '0', true))
      .to.emit(configurator, 'BorrowingOnReserve')
      .withArgs(weth.address, true, true);

    const { variableBorrowIndex } = await helpersContract.getReserveData(weth.address);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
    });
    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Deactivates the ETH reserve for borrowing via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(await configurator.connect(riskAdmin.signer).disableBorrowingOnReserve(weth.address))
      .to.emit(configurator, 'BorrowingOnReserve')
      .withArgs(weth.address, false, false);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      borrowingEnabled: false,
    });
  });

  it('Activates the ETH reserve for borrowing via risk admin', async () => {
    const { configurator, weth, helpersContract, riskAdmin } = testEnv;
    expect(
      await configurator.connect(riskAdmin.signer).enableBorrowingOnReserve(weth.address, '0', true)
    )
      .to.emit(configurator, 'BorrowingOnReserve')
      .withArgs(weth.address, true, true);

    const { variableBorrowIndex } = await helpersContract.getReserveData(weth.address);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
    });
    expect(variableBorrowIndex.toString()).to.be.equal(RAY);
  });

  it('Deactivates the ETH reserve as collateral via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.configureReserveAsCollateral(weth.address, 0, 0, 0))
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(weth.address, 0, 0, 0);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      baseLTVAsCollateral: '0',
      liquidationThreshold: '0',
      liquidationBonus: '0',
      usageAsCollateralEnabled: false,
    });
  });

  it('Activates the ETH reserve as collateral via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.configureReserveAsCollateral(weth.address, '8000', '8250', '10500'))
      .to.emit(configurator, 'CollateralConfigurationChanged')
      .withArgs(weth.address, '8000', '8250', '10500');

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      baseLTVAsCollateral: '8000',
      liquidationThreshold: '8250',
      liquidationBonus: '10500',
    });
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

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      baseLTVAsCollateral: '0',
      liquidationThreshold: '0',
      liquidationBonus: '0',
      usageAsCollateralEnabled: false,
    });
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

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      baseLTVAsCollateral: '8000',
      liquidationThreshold: '8250',
      liquidationBonus: '10500',
    });
  });

  it('Disable stable borrow rate on the ETH reserve via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.setReserveStableRateEnabled(weth.address, false))
      .to.emit(configurator, 'StableRateBorrowingOnReserve')
      .withArgs(weth.address, false);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      stableBorrowRateEnabled: false,
    });
  });

  it('Enables stable borrow rate on the ETH reserve via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    expect(await configurator.setReserveStableRateEnabled(weth.address, true))
      .to.emit(configurator, 'StableRateBorrowingOnReserve')
      .withArgs(weth.address, true);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
    });
  });

  it('Disable stable borrow rate on the ETH reserve risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(
      await configurator.connect(riskAdmin.signer).setReserveStableRateEnabled(weth.address, false)
    )
      .to.emit(configurator, 'StableRateBorrowingOnReserve')
      .withArgs(weth.address, false);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      stableBorrowRateEnabled: false,
    });
  });

  it('Enables stable borrow rate on the ETH reserve risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    expect(
      await configurator.connect(riskAdmin.signer).setReserveStableRateEnabled(weth.address, true)
    )
      .to.emit(configurator, 'StableRateBorrowingOnReserve')
      .withArgs(weth.address, true);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
    });
  });

  it('Changes the reserve factor of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;

    const newReserveFactor = '1000';
    expect(await configurator.setReserveFactor(weth.address, newReserveFactor))
      .to.emit(configurator, 'ReserveFactorChanged')
      .withArgs(weth.address, newReserveFactor);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      reserveFactor: newReserveFactor,
    });
  });

  it('Changes the reserve factor of WETH via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    const newReserveFactor = '1000';
    expect(
      await configurator.connect(riskAdmin.signer).setReserveFactor(weth.address, newReserveFactor)
    )
      .to.emit(configurator, 'ReserveFactorChanged')
      .withArgs(weth.address, newReserveFactor);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      reserveFactor: newReserveFactor,
    });
  });

  it('Updates the unbackedMintCap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    const newUnbackedMintCap = '10000';
    expect(await configurator.setUnbackedMintCap(weth.address, newUnbackedMintCap))
      .to.emit(configurator, 'UnbackedMintCapChanged')
      .withArgs(weth.address, newUnbackedMintCap);

    expect(await helpersContract.getUnbackedMintCap(weth.address)).to.be.eq(newUnbackedMintCap);
  });

  it('Updates the unbackedMintCap of WETH via risk admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    const newUnbackedMintCap = '20000';
    expect(await configurator.setUnbackedMintCap(weth.address, newUnbackedMintCap))
      .to.emit(configurator, 'UnbackedMintCapChanged')
      .withArgs(weth.address, newUnbackedMintCap);

    expect(await helpersContract.getUnbackedMintCap(weth.address)).to.be.eq(newUnbackedMintCap);
  });

  it('Updates the borrowCap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    const newBorrowCap = '3000000';
    expect(await configurator.setBorrowCap(weth.address, newBorrowCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(weth.address, newBorrowCap);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
    });
  });

  it('Updates the borrowCap of WETH risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    const newBorrowCap = '3000000';
    expect(await configurator.connect(riskAdmin.signer).setBorrowCap(weth.address, newBorrowCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(weth.address, newBorrowCap);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
    });
  });

  it('Updates the supplyCap of WETH via pool admin', async () => {
    const { configurator, helpersContract, weth } = testEnv;
    const newBorrowCap = '3000000';
    const newSupplyCap = '3000000';
    expect(await configurator.setSupplyCap(weth.address, newSupplyCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(weth.address, newSupplyCap);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
      supplyCap: newSupplyCap,
    });
  });

  it('Updates the supplyCap of WETH via risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;
    const newBorrowCap = '3000000';
    const newSupplyCap = '3000000';
    expect(await configurator.connect(riskAdmin.signer).setSupplyCap(weth.address, newSupplyCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(weth.address, newSupplyCap);

    await expectReserveConfigurationData(helpersContract, weth.address, {
      ...baseConfigValues,
      borrowCap: newBorrowCap,
      supplyCap: newSupplyCap,
    });
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

    //reset interest rate strategy to the correct one
    await configurator
      .connect(poolAdmin.signer)
      .setReserveInterestRateStrategyAddress(weth.address, before.interestRateStrategyAddress);
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

    //reset interest rate strategy to the correct one
    await configurator
      .connect(riskAdmin.signer)
      .setReserveInterestRateStrategyAddress(weth.address, before.interestRateStrategyAddress);
  });

  it('Register a new risk Admin', async () => {
    const { aclManager, poolAdmin, users, riskAdmin } = testEnv;

    const riskAdminRole = await aclManager.RISK_ADMIN_ROLE();

    const newRiskAdmin = users[3].address;
    expect(await aclManager.addRiskAdmin(newRiskAdmin))
      .to.emit(aclManager, 'RoleGranted')
      .withArgs(riskAdminRole, newRiskAdmin, poolAdmin.address);

    expect(await aclManager.isRiskAdmin(riskAdmin.address)).to.be.true;
    expect(await aclManager.isRiskAdmin(newRiskAdmin)).to.be.true;
  });

  it('Unregister the new risk admin', async () => {
    const { aclManager, poolAdmin, users, riskAdmin } = testEnv;

    const riskAdminRole = await aclManager.RISK_ADMIN_ROLE();

    const newRiskAdmin = users[3].address;
    expect(await aclManager.removeRiskAdmin(newRiskAdmin))
      .to.emit(aclManager, 'RoleRevoked')
      .withArgs(riskAdminRole, newRiskAdmin, poolAdmin.address);

    expect(await aclManager.isRiskAdmin(riskAdmin.address)).to.be.true;
    expect(await aclManager.isRiskAdmin(newRiskAdmin)).to.be.false;
  });

  it('Authorized a new flash borrower', async () => {
    const { aclManager, poolAdmin, users } = testEnv;

    const authorizedFlashBorrowerRole = await aclManager.FLASH_BORROWER_ROLE();

    const authorizedFlashBorrower = users[4].address;
    expect(await aclManager.addFlashBorrower(authorizedFlashBorrower))
      .to.emit(aclManager, 'RoleGranted')
      .withArgs(authorizedFlashBorrowerRole, authorizedFlashBorrower, poolAdmin.address);

    expect(await aclManager.isFlashBorrower(authorizedFlashBorrower)).to.be.true;
  });

  it('Unauthorized flash borrower', async () => {
    const { aclManager, poolAdmin, users } = testEnv;

    const authorizedFlashBorrowerRole = await aclManager.FLASH_BORROWER_ROLE();

    const authorizedFlashBorrower = users[4].address;
    expect(await aclManager.removeFlashBorrower(authorizedFlashBorrower))
      .to.emit(aclManager, 'RoleRevoked')
      .withArgs(authorizedFlashBorrowerRole, authorizedFlashBorrower, poolAdmin.address);

    expect(await aclManager.isFlashBorrower(authorizedFlashBorrower)).to.be.false;
  });

  it('Updates bridge protocol fee', async () => {
    const { pool, configurator } = testEnv;
    const newProtocolFee = 2000;

    expect(await configurator.updateBridgeProtocolFee(newProtocolFee))
      .to.emit(configurator, 'BridgeProtocolFeeUpdated')
      .withArgs(newProtocolFee);

    expect(await pool.BRIDGE_PROTOCOL_FEE()).to.be.eq(newProtocolFee);
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

  it('Sets a debt ceiling through the pool admin', async () => {
    const { configurator, helpersContract, weth, poolAdmin } = testEnv;

    expect(await configurator.connect(poolAdmin.signer).setDebtCeiling(weth.address, '1'))
      .to.emit(configurator, 'DebtCeilingChanged')
      .withArgs(weth.address, '1');

    const newCeiling = await helpersContract.getDebtCeiling(weth.address);

    expect(newCeiling).to.be.eq('1', 'Invalid debt ceiling');
  });

  it('Sets a debt ceiling through the risk admin', async () => {
    const { configurator, helpersContract, weth, riskAdmin } = testEnv;

    expect(await configurator.connect(riskAdmin.signer).setDebtCeiling(weth.address, '10'))
      .to.emit(configurator, 'DebtCeilingChanged')
      .withArgs(weth.address, '10');

    const newCeiling = await helpersContract.getDebtCeiling(weth.address);

    expect(newCeiling).to.be.eq('10', 'Invalid debt ceiling');
  });

  it('Resets the WETH debt ceiling. Tries to set debt ceiling after liquidity has been provided (revert expected)', async () => {
    const {
      configurator,
      weth,
      riskAdmin,
      pool,
      users: [user1],
    } = testEnv;

    await configurator.connect(riskAdmin.signer).setDebtCeiling(weth.address, '0');

    // user 1 deposits
    await weth.connect(user1.signer)['mint(uint256)']('100');

    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(user1.signer).supply(weth.address, '100', user1.address, '0');

    await expect(configurator.setDebtCeiling(weth.address, '100')).to.be.revertedWith(
      PC_RESERVE_LIQUIDITY_NOT_0
    );
  });

  it('Withdraws supplied liquidity, sets WETH debt ceiling', async () => {
    const {
      configurator,
      helpersContract,
      weth,
      riskAdmin,
      pool,
      users: [user1],
    } = testEnv;

    await pool.connect(user1.signer).withdraw(weth.address, MAX_UINT_AMOUNT, user1.address);

    await configurator.connect(riskAdmin.signer).setDebtCeiling(weth.address, '100');

    const newCeiling = await helpersContract.getDebtCeiling(weth.address);

    expect(newCeiling).to.be.eq('100');
  });

  it('Readds liquidity, increases WETH debt ceiling', async () => {
    const {
      configurator,
      helpersContract,
      weth,
      riskAdmin,
      pool,
      users: [user1],
    } = testEnv;

    await pool.connect(user1.signer).supply(weth.address, '100', user1.address, '0');

    await configurator.connect(riskAdmin.signer).setDebtCeiling(weth.address, '200');

    const newCeiling = await helpersContract.getDebtCeiling(weth.address);

    expect(newCeiling).to.be.eq('200');
  });
});
