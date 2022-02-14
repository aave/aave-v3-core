// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20Detailed} from '../../contracts/dependencies/openzeppelin/contracts/IERC20Detailed.sol';
import {VersionedInitializable} from '../../contracts/protocol/libraries/aave-upgradeability/VersionedInitializable.sol';
import {InitializableImmutableAdminUpgradeabilityProxy} from '../../contracts/protocol/libraries/aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol';
import {ReserveConfiguration} from '../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';
import {IPoolAddressesProvider} from '../../contracts/interfaces/IPoolAddressesProvider.sol';
import {Errors} from '../../contracts/protocol/libraries/helpers/Errors.sol';
import {PercentageMath} from '../../contracts/protocol/libraries/math/PercentageMath.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';
import {ConfiguratorLogic} from '../../contracts/protocol/libraries/logic/ConfiguratorLogic.sol';
import {ConfiguratorInputTypes} from '../../contracts/protocol/libraries/types/ConfiguratorInputTypes.sol';
import {IInitializableDebtToken} from '../../contracts/interfaces/IInitializableDebtToken.sol';
import {IInitializableAToken} from '../../contracts/interfaces/IInitializableAToken.sol';
import {IAaveIncentivesController} from '../../contracts/interfaces/IAaveIncentivesController.sol';
import {IPoolConfigurator} from '../../contracts/interfaces/IPoolConfigurator.sol';
// import {IPool} from '../../contracts/interfaces/IPool.sol';
import {PoolHarnessForConfigurator} from './PoolHarnessForConfigurator.sol';
import {IACLManager} from '../../contracts/interfaces/IACLManager.sol';
import {IPoolDataProvider} from '../../contracts/interfaces/IPoolDataProvider.sol';

/**
 * @title PoolConfigurator
 * @author Aave
 * @dev Implements the configuration methods for the Aave protocol
 **/
contract PoolConfiguratorHarness is VersionedInitializable, IPoolConfigurator {
  using PercentageMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  IPoolAddressesProvider internal _addressesProvider;
  PoolHarnessForConfigurator internal _pool;

  modifier onlyPoolAdmin() {
    // _onlyPoolAdmin();
    _;
  }

  modifier onlyEmergencyAdmin() {
    // _onlyEmergencyAdmin();
    _;
  }

  modifier onlyEmergencyOrPoolAdmin() {
    // _onlyPoolOrEmergencyAdmin();
    _;
  }

  modifier onlyAssetListingOrPoolAdmins() {
    // _onlyAssetListingOrPoolAdmins();
    _;
  }

  modifier onlyRiskOrPoolAdmins() {
    // _onlyRiskOrPoolAdmins();
    _;
  }

  uint256 internal constant CONFIGURATOR_REVISION = 0x1;

  /// @inheritdoc VersionedInitializable
  function getRevision() internal pure virtual override returns (uint256) {
    return CONFIGURATOR_REVISION;
  }

  function initialize(IPoolAddressesProvider provider) public initializer {
    // _addressesProvider = provider;
    // _pool = IPool(_addressesProvider.getPool());
  }

  /// @inheritdoc IPoolConfigurator
  function initReserves(ConfiguratorInputTypes.InitReserveInput[] calldata input)
    external
    override
    onlyAssetListingOrPoolAdmins
  {
    PoolHarnessForConfigurator cachedPool = _pool;
    for (uint256 i = 0; i < input.length; i++) {
      ConfiguratorLogic.initReserve(cachedPool, input[i]);
    }
  }

  /// @inheritdoc IPoolConfigurator
  function dropReserve(address asset) external override onlyPoolAdmin {
    _pool.dropReserve(asset);
    emit ReserveDropped(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function updateAToken(ConfiguratorInputTypes.UpdateATokenInput calldata input)
    external
    override
    onlyPoolAdmin
  {
    ConfiguratorLogic.updateAToken(_pool, input);
  }

  /// @inheritdoc IPoolConfigurator
  function updateStableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input)
    external
    override
    onlyPoolAdmin
  {
    ConfiguratorLogic.updateStableDebtToken(_pool, input);
  }

  /// @inheritdoc IPoolConfigurator
  function updateVariableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input)
    external
    override
    onlyPoolAdmin
  {
    ConfiguratorLogic.updateVariableDebtToken(_pool, input);
  }

  /// @inheritdoc IPoolConfigurator
  function enableBorrowingOnReserve(
    address asset,
    uint256 borrowCap,
    bool stableBorrowRateEnabled
  ) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setBorrowingEnabled(true);
    currentConfig.setBorrowCap(borrowCap);
    currentConfig.setStableRateBorrowingEnabled(stableBorrowRateEnabled);
    _pool.setConfiguration(asset, currentConfig.data);

    emit BorrowingEnabledOnReserve(asset, stableBorrowRateEnabled);
  }

  /// @inheritdoc IPoolConfigurator
  function disableBorrowingOnReserve(address asset) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setBorrowingEnabled(false);
    _pool.setConfiguration(asset, currentConfig.data);
    emit BorrowingDisabledOnReserve(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function configureReserveAsCollateral(
    address asset,
    uint256 ltv,
    uint256 liquidationThreshold,
    uint256 liquidationBonus
  ) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);

    //validation of the parameters: the LTV can
    //only be lower or equal than the liquidation threshold
    //(otherwise a loan against the asset would cause instantaneous liquidation)
    require(ltv <= liquidationThreshold, Errors.PC_INVALID_CONFIGURATION);

    if (liquidationThreshold != 0) {
      //liquidation bonus must be bigger than 100.00%, otherwise the liquidator would receive less
      //collateral than needed to cover the debt
      require(liquidationBonus > PercentageMath.PERCENTAGE_FACTOR, Errors.PC_INVALID_CONFIGURATION);

      //if threshold * bonus is less than PERCENTAGE_FACTOR, it's guaranteed that at the moment
      //a loan is taken there is enough collateral available to cover the liquidation bonus
      require(
        liquidationThreshold.percentMul(liquidationBonus) <= PercentageMath.PERCENTAGE_FACTOR,
        Errors.PC_INVALID_CONFIGURATION
      );
    } else {
      require(liquidationBonus == 0, Errors.PC_INVALID_CONFIGURATION);
      //if the liquidation threshold is being set to 0,
      // the reserve is being disabled as collateral. To do so,
      //we need to ensure no liquidity is supplied
      // _checkNoSuppliers(asset);
    }

    currentConfig.setLtv(ltv);
    currentConfig.setLiquidationThreshold(liquidationThreshold);
    currentConfig.setLiquidationBonus(liquidationBonus);

    _pool.setConfiguration(asset, currentConfig.data);

    emit CollateralConfigurationChanged(asset, ltv, liquidationThreshold, liquidationBonus);
  }

  /// @inheritdoc IPoolConfigurator
  function enableReserveStableRate(address asset) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setStableRateBorrowingEnabled(true);
    _pool.setConfiguration(asset, currentConfig.data);

    emit StableRateEnabledOnReserve(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function disableReserveStableRate(address asset) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setStableRateBorrowingEnabled(false);
    _pool.setConfiguration(asset, currentConfig.data);
    emit StableRateDisabledOnReserve(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function activateReserve(address asset) external override onlyPoolAdmin {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setActive(true);
    _pool.setConfiguration(asset, currentConfig.data);
    emit ReserveActivated(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function deactivateReserve(address asset) external override onlyPoolAdmin {
    _checkNoSuppliers(asset);

    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setActive(false);
    _pool.setConfiguration(asset, currentConfig.data);
    emit ReserveDeactivated(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function freezeReserve(address asset) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setFrozen(true);
    _pool.setConfiguration(asset, currentConfig.data);
    emit ReserveFrozen(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function unfreezeReserve(address asset) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setFrozen(false);
    _pool.setConfiguration(asset, currentConfig.data);
    emit ReserveUnfrozen(asset);
  }

  /// @inheritdoc IPoolConfigurator
  function setBorrowableInIsolation(address asset, bool borrowable)
    external
    override
    onlyRiskOrPoolAdmins
  {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setBorrowableInIsolation(borrowable);
    _pool.setConfiguration(asset, currentConfig.data);
    emit BorrowableInIsolationChanged(asset, borrowable);
  }

  /// @inheritdoc IPoolConfigurator
  function setReservePause(address asset, bool paused) public override onlyEmergencyOrPoolAdmin {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setPaused(paused);

    _pool.setConfiguration(asset, currentConfig.data);

    if (paused) {
      emit ReservePaused(asset);
    } else {
      emit ReserveUnpaused(asset);
    }
  }

  function setReserveFactor(address asset, uint256 reserveFactor)
    external
    override
    onlyRiskOrPoolAdmins
  {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setReserveFactor(reserveFactor);
    _pool.setConfiguration(asset, currentConfig.data);
    emit ReserveFactorChanged(asset, reserveFactor);
  }

  /// @inheritdoc IPoolConfigurator
  function setDebtCeiling(address asset, uint256 ceiling) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    if (currentConfig.getDebtCeiling() == 0) {
      _checkNoSuppliers(asset);
    }
    currentConfig.setDebtCeiling(ceiling);
    _pool.setConfiguration(asset, currentConfig.data);
    emit DebtCeilingChanged(asset, ceiling);
  }

  /// @inheritdoc IPoolConfigurator
  function setBorrowCap(address asset, uint256 borrowCap) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setBorrowCap(borrowCap);
    _pool.setConfiguration(asset, currentConfig.data);
    emit BorrowCapChanged(asset, borrowCap);
  }

  /// @inheritdoc IPoolConfigurator
  function setSupplyCap(address asset, uint256 supplyCap) external override onlyRiskOrPoolAdmins {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setSupplyCap(supplyCap);
    _pool.setConfiguration(asset, currentConfig.data);
    emit SupplyCapChanged(asset, supplyCap);
  }

  /// @inheritdoc IPoolConfigurator
  function setLiquidationProtocolFee(address asset, uint256 fee)
    external
    override
    onlyRiskOrPoolAdmins
  {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);

    currentConfig.setLiquidationProtocolFee(fee);

    _pool.setConfiguration(asset, currentConfig.data);

    emit LiquidationProtocolFeeChanged(asset, fee);
  }

  function setEModeCategory(
    uint8 categoryId,
    uint16 ltv,
    uint16 liquidationThreshold,
    uint16 liquidationBonus,
    address oracle,
    string calldata label
  ) external override onlyRiskOrPoolAdmins {
    // validation of the parameters: the LTV can
    // only be lower or equal than the liquidation threshold
    // (otherwise a loan against the asset would cause instantaneous liquidation)
    require(ltv <= liquidationThreshold, Errors.VL_INCONSISTENT_EMODE_CATEGORY);
    require(
      liquidationBonus > PercentageMath.PERCENTAGE_FACTOR,
      Errors.VL_INCONSISTENT_EMODE_CATEGORY
    );

    // if threshold * bonus is less than PERCENTAGE_FACTOR, it's guaranteed that at the moment
    // a loan is taken there is enough collateral available to cover the liquidation bonus
    require(
      uint256(liquidationThreshold).percentMul(liquidationBonus) <=
        PercentageMath.PERCENTAGE_FACTOR,
      Errors.VL_INCONSISTENT_EMODE_CATEGORY
    );

    _pool.configureEModeCategory(
      categoryId,
      DataTypes.EModeCategory(ltv, liquidationThreshold, liquidationBonus, oracle, label)
    );
    emit EModeCategoryAdded(categoryId, ltv, liquidationThreshold, liquidationBonus, oracle, label);
  }

  /// @inheritdoc IPoolConfigurator
  function setAssetEModeCategory(address asset, uint8 categoryId)
    external
    override
    onlyRiskOrPoolAdmins
  {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);

    if (categoryId > 0) {
      DataTypes.EModeCategory memory categoryData = _pool.getEModeCategoryData(categoryId);
      require(
        categoryData.liquidationThreshold > currentConfig.getLiquidationThreshold(),
        Errors.VL_INCONSISTENT_EMODE_CATEGORY
      );
    }

    currentConfig.setEModeCategory(categoryId);

    _pool.setConfiguration(asset, currentConfig.data);

    emit EModeAssetCategoryChanged(asset, categoryId);
  }

  /// @inheritdoc IPoolConfigurator
  function setUnbackedMintCap(address asset, uint256 unbackedMintCap)
    external
    override
    onlyRiskOrPoolAdmins
  {
    DataTypes.ReserveConfigurationMap memory currentConfig = _pool.getConfiguration(asset);

    currentConfig.setUnbackedMintCap(unbackedMintCap);

    _pool.setConfiguration(asset, currentConfig.data);

    emit UnbackedMintCapChanged(asset, unbackedMintCap);
  }

  /// @inheritdoc IPoolConfigurator
  function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
    external
    override
    onlyRiskOrPoolAdmins
  {
    _pool.setReserveInterestRateStrategyAddress(asset, rateStrategyAddress);
    emit ReserveInterestRateStrategyChanged(asset, rateStrategyAddress);
  }

  /// @inheritdoc IPoolConfigurator
  function setPoolPause(bool paused) external override onlyEmergencyAdmin {
    address[] memory reserves = _pool.getReservesList();

    for (uint256 i = 0; i < reserves.length; i++) {
      if (reserves[i] != address(0)) {
        setReservePause(reserves[i], paused);
      }
    }
  }

  /// @inheritdoc IPoolConfigurator
  function updateBridgeProtocolFee(uint256 protocolFee) external override onlyPoolAdmin {
    require(protocolFee < PercentageMath.PERCENTAGE_FACTOR, Errors.PC_BRIDGE_PROTOCOL_FEE_INVALID);
    _pool.updateBridgeProtocolFee(protocolFee);
    emit BridgeProtocolFeeUpdated(protocolFee);
  }

  /// @inheritdoc IPoolConfigurator
  function updateFlashloanPremiumTotal(uint256 flashloanPremiumTotal)
    external
    override
    onlyPoolAdmin
  {
    require(
      flashloanPremiumTotal < PercentageMath.PERCENTAGE_FACTOR,
      Errors.PC_FLASHLOAN_PREMIUM_INVALID
    );
    require(
      flashloanPremiumTotal >= _pool.FLASHLOAN_PREMIUM_TO_PROTOCOL(),
      Errors.PC_FLASHLOAN_PREMIUMS_MISMATCH
    );
    _pool.updateFlashloanPremiums(flashloanPremiumTotal, _pool.FLASHLOAN_PREMIUM_TO_PROTOCOL());
    emit FlashloanPremiumTotalUpdated(flashloanPremiumTotal);
  }

  /// @inheritdoc IPoolConfigurator
  function updateFlashloanPremiumToProtocol(uint256 flashloanPremiumToProtocol)
    external
    override
    onlyPoolAdmin
  {
    require(
      flashloanPremiumToProtocol < PercentageMath.PERCENTAGE_FACTOR,
      Errors.PC_FLASHLOAN_PREMIUM_INVALID
    );
    require(
      flashloanPremiumToProtocol <= _pool.FLASHLOAN_PREMIUM_TOTAL(),
      Errors.PC_FLASHLOAN_PREMIUMS_MISMATCH
    );
    _pool.updateFlashloanPremiums(_pool.FLASHLOAN_PREMIUM_TOTAL(), flashloanPremiumToProtocol);
    emit FlashloanPremiumToProtocolUpdated(flashloanPremiumToProtocol);
  }

  function _checkNoSuppliers(address asset) internal view {
    uint256 totalATokens = IPoolDataProvider(_addressesProvider.getPoolDataProvider())
      .getATokenTotalSupply(asset);
    require(totalATokens == 0, Errors.PC_RESERVE_LIQUIDITY_NOT_0);
  }

  function getLtv(address asset) public view returns (uint256) {
    return _pool.getLtv(asset);
  }

  function getLiquidationThreshold(address asset) public view returns (uint256) {
    return _pool.getLiquidationThreshold(asset);
  }

  function getLiquidationBonus(address asset) public view returns (uint256) {
    return _pool.getLiquidationBonus(asset);
  }
}
