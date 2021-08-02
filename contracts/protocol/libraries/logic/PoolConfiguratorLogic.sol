// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IPool} from '../../../interfaces/IPool.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ConfiguratorInputTypes} from '../types/ConfiguratorInputTypes.sol';
import {IInitializableAToken} from '../../../interfaces/IInitializableAToken.sol';
import {IInitializableDebtToken} from '../../../interfaces/IInitializableDebtToken.sol';
import {IAaveIncentivesController} from '../../../interfaces/IAaveIncentivesController.sol';
import {
  InitializableImmutableAdminUpgradeabilityProxy
} from '../aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol';

/**
 * @title ConfiguratorLogic library
 * @author Aave
 * @notice Implements the logic for CONFIGURATOR
 */
library PoolConfiguratorLogic {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  function _initReserve(IPool pool, ConfiguratorInputTypes.InitReserveInput calldata input) public {
    address aTokenProxyAddress =
      _initTokenWithProxy(
        input.aTokenImpl,
        abi.encodeWithSelector(
          IInitializableAToken.initialize.selector,
          pool,
          input.treasury,
          input.underlyingAsset,
          IAaveIncentivesController(input.incentivesController),
          input.underlyingAssetDecimals,
          input.aTokenName,
          input.aTokenSymbol,
          input.params
        )
      );

    address stableDebtTokenProxyAddress =
      _initTokenWithProxy(
        input.stableDebtTokenImpl,
        abi.encodeWithSelector(
          IInitializableDebtToken.initialize.selector,
          pool,
          input.underlyingAsset,
          IAaveIncentivesController(input.incentivesController),
          input.underlyingAssetDecimals,
          input.stableDebtTokenName,
          input.stableDebtTokenSymbol,
          input.params
        )
      );

    address variableDebtTokenProxyAddress =
      _initTokenWithProxy(
        input.variableDebtTokenImpl,
        abi.encodeWithSelector(
          IInitializableDebtToken.initialize.selector,
          pool,
          input.underlyingAsset,
          IAaveIncentivesController(input.incentivesController),
          input.underlyingAssetDecimals,
          input.variableDebtTokenName,
          input.variableDebtTokenSymbol,
          input.params
        )
      );

    pool.initReserve(
      input.underlyingAsset,
      aTokenProxyAddress,
      stableDebtTokenProxyAddress,
      variableDebtTokenProxyAddress,
      input.interestRateStrategyAddress
    );

    DataTypes.ReserveConfigurationMap memory currentConfig =
      pool.getConfiguration(input.underlyingAsset);

    currentConfig.setDecimals(input.underlyingAssetDecimals);

    currentConfig.setActive(true);
    currentConfig.setPaused(false);
    currentConfig.setFrozen(false);

    pool.setConfiguration(input.underlyingAsset, currentConfig.data);

    emit ReserveInitialized(
      input.underlyingAsset,
      aTokenProxyAddress,
      stableDebtTokenProxyAddress,
      variableDebtTokenProxyAddress,
      input.interestRateStrategyAddress
    );
  }

  function dropReserve(IPool pool, address asset) external {
    pool.dropReserve(asset);
    emit ReserveDropped(asset);
  }

  /**
   * @dev Updates the aToken implementation for the reserve
   **/
  function updateAToken(IPool cachedPool, ConfiguratorInputTypes.UpdateATokenInput calldata input)
    public
  {
    DataTypes.ReserveData memory reserveData = cachedPool.getReserveData(input.asset);

    (, , , uint256 decimals, ) = cachedPool.getConfiguration(input.asset).getParamsMemory();

    bytes memory encodedCall =
      abi.encodeWithSelector(
        IInitializableAToken.initialize.selector,
        cachedPool,
        input.treasury,
        input.asset,
        input.incentivesController,
        decimals,
        input.name,
        input.symbol,
        input.params
      );

    _upgradeTokenImplementation(reserveData.aTokenAddress, input.implementation, encodedCall);

    emit ATokenUpgraded(input.asset, reserveData.aTokenAddress, input.implementation);
  }

  /**
   * @dev Updates the stable debt token implementation for the reserve
   **/
  function updateStableDebtToken(
    IPool cachedPool,
    ConfiguratorInputTypes.UpdateDebtTokenInput calldata input
  ) public {
    DataTypes.ReserveData memory reserveData = cachedPool.getReserveData(input.asset);

    (, , , uint256 decimals, ) = cachedPool.getConfiguration(input.asset).getParamsMemory();

    bytes memory encodedCall =
      abi.encodeWithSelector(
        IInitializableDebtToken.initialize.selector,
        cachedPool,
        input.asset,
        input.incentivesController,
        decimals,
        input.name,
        input.symbol,
        input.params
      );

    _upgradeTokenImplementation(
      reserveData.stableDebtTokenAddress,
      input.implementation,
      encodedCall
    );

    emit StableDebtTokenUpgraded(
      input.asset,
      reserveData.stableDebtTokenAddress,
      input.implementation
    );
  }

  /**
   * @dev Updates the variable debt token implementation for the asset
   **/
  function updateVariableDebtToken(
    IPool cachedPool,
    ConfiguratorInputTypes.UpdateDebtTokenInput calldata input
  ) public {
    DataTypes.ReserveData memory reserveData = cachedPool.getReserveData(input.asset);

    (, , , uint256 decimals, ) = cachedPool.getConfiguration(input.asset).getParamsMemory();

    bytes memory encodedCall =
      abi.encodeWithSelector(
        IInitializableDebtToken.initialize.selector,
        cachedPool,
        input.asset,
        input.incentivesController,
        decimals,
        input.name,
        input.symbol,
        input.params
      );

    _upgradeTokenImplementation(
      reserveData.variableDebtTokenAddress,
      input.implementation,
      encodedCall
    );

    emit VariableDebtTokenUpgraded(
      input.asset,
      reserveData.variableDebtTokenAddress,
      input.implementation
    );
  }

  function _initTokenWithProxy(address implementation, bytes memory initParams)
    internal
    returns (address)
  {
    InitializableImmutableAdminUpgradeabilityProxy proxy =
      new InitializableImmutableAdminUpgradeabilityProxy(address(this));

    proxy.initialize(implementation, initParams);

    return address(proxy);
  }

  function _upgradeTokenImplementation(
    address proxyAddress,
    address implementation,
    bytes memory initParams
  ) internal {
    InitializableImmutableAdminUpgradeabilityProxy proxy =
      InitializableImmutableAdminUpgradeabilityProxy(payable(proxyAddress));

    proxy.upgradeToAndCall(implementation, initParams);
  }

  // Reserve

  function enableBorrowingOnReserve(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset,
    uint256 borrowCap,
    bool stableBorrowRateEnabled
  ) external {
    currentConfig.setBorrowingEnabled(true);
    currentConfig.setBorrowCap(borrowCap);
    currentConfig.setStableRateBorrowingEnabled(stableBorrowRateEnabled);

    pool.setConfiguration(asset, currentConfig.data);

    emit BorrowingEnabledOnReserve(asset, stableBorrowRateEnabled);
  }

  function disableBorrowingOnReserve(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setBorrowingEnabled(false);

    pool.setConfiguration(asset, currentConfig.data);
    emit BorrowingDisabledOnReserve(asset);
  }

  function configureReserveAsCollateral(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset,
    uint256 ltv,
    uint256 liquidationThreshold,
    uint256 liquidationBonus
  ) external {
    currentConfig.setLtv(ltv);
    currentConfig.setLiquidationThreshold(liquidationThreshold);
    currentConfig.setLiquidationBonus(liquidationBonus);

    pool.setConfiguration(asset, currentConfig.data);

    emit CollateralConfigurationChanged(asset, ltv, liquidationThreshold, liquidationBonus);
  }

  function enableReserveStableRate(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setStableRateBorrowingEnabled(true);

    pool.setConfiguration(asset, currentConfig.data);

    emit StableRateEnabledOnReserve(asset);
  }

  function disableReserveStableRate(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setStableRateBorrowingEnabled(false);

    pool.setConfiguration(asset, currentConfig.data);

    emit StableRateDisabledOnReserve(asset);
  }

  function activateReserve(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setActive(true);

    pool.setConfiguration(asset, currentConfig.data);

    emit ReserveActivated(asset);
  }

  function deactivateReserve(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setActive(false);

    pool.setConfiguration(asset, currentConfig.data);

    emit ReserveDeactivated(asset);
  }

  function freezeReserve(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setFrozen(true);

    pool.setConfiguration(asset, currentConfig.data);

    emit ReserveFrozen(asset);
  }

  function unfreezeReserve(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset
  ) external {
    currentConfig.setFrozen(false);

    pool.setConfiguration(asset, currentConfig.data);

    emit ReserveUnfrozen(asset);
  }

  function setReservePause(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset,
    bool paused
  ) public {
    //DataTypes.ReserveConfigurationMap memory currentConfig = pool.getConfiguration(asset);
    currentConfig.setPaused(paused);

    pool.setConfiguration(asset, currentConfig.data);

    if (paused) {
      emit ReservePaused(asset);
    } else {
      emit ReserveUnpaused(asset);
    }
  }

  function setReserveFactor(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset,
    uint256 reserveFactor
  ) external {
    currentConfig.setReserveFactor(reserveFactor);

    pool.setConfiguration(asset, currentConfig.data);

    emit ReserveFactorChanged(asset, reserveFactor);
  }

  function setBorrowCap(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset,
    uint256 borrowCap
  ) external {
    currentConfig.setBorrowCap(borrowCap);

    pool.setConfiguration(asset, currentConfig.data);

    emit BorrowCapChanged(asset, borrowCap);
  }

  function setSupplyCap(
    DataTypes.ReserveConfigurationMap memory currentConfig,
    IPool pool,
    address asset,
    uint256 supplyCap
  ) external {
    currentConfig.setSupplyCap(supplyCap);

    pool.setConfiguration(asset, currentConfig.data);

    emit SupplyCapChanged(asset, supplyCap);
  }

  ///

  /**
   * @dev Emitted when a reserve is initialized.
   * @param asset The address of the underlying asset of the reserve
   * @param aToken The address of the associated aToken contract
   * @param stableDebtToken The address of the associated stable rate debt token
   * @param variableDebtToken The address of the associated variable rate debt token
   * @param interestRateStrategyAddress The address of the interest rate strategy for the reserve
   **/
  event ReserveInitialized(
    address indexed asset,
    address indexed aToken,
    address stableDebtToken,
    address variableDebtToken,
    address interestRateStrategyAddress
  );

  /**
   * @dev Emitted when borrowing is enabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param stableRateEnabled True if stable rate borrowing is enabled, false otherwise
   **/
  event BorrowingEnabledOnReserve(address indexed asset, bool stableRateEnabled);

  /**
   * @dev Emitted when borrowing is disabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  event BorrowingDisabledOnReserve(address indexed asset);

  /**
   * @dev Emitted when the collateralization risk parameters for the specified asset are updated.
   * @param asset The address of the underlying asset of the reserve
   * @param ltv The loan to value of the asset when used as collateral
   * @param liquidationThreshold The threshold at which loans using this asset as collateral will be considered undercollateralized
   * @param liquidationBonus The bonus liquidators receive to liquidate this asset
   **/
  event CollateralConfigurationChanged(
    address indexed asset,
    uint256 ltv,
    uint256 liquidationThreshold,
    uint256 liquidationBonus
  );

  /**
   * @dev Emitted when stable rate borrowing is enabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  event StableRateEnabledOnReserve(address indexed asset);

  /**
   * @dev Emitted when stable rate borrowing is disabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  event StableRateDisabledOnReserve(address indexed asset);

  /**
   * @dev Emitted when a reserve is activated
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveActivated(address indexed asset);

  /**
   * @dev Emitted when a reserve is deactivated
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveDeactivated(address indexed asset);

  /**
   * @dev Emitted when a reserve is frozen
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveFrozen(address indexed asset);

  /**
   * @dev Emitted when a reserve is unfrozen
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveUnfrozen(address indexed asset);

  /**
   * @dev Emitted when a reserve is paused
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReservePaused(address indexed asset);

  /**
   * @dev Emitted when a reserve is unpaused
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveUnpaused(address indexed asset);

  /**
   * @dev Emitted when a reserve is dropped
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveDropped(address indexed asset);

  /**
   * @dev Emitted when a reserve factor is updated
   * @param asset The address of the underlying asset of the reserve
   * @param factor The new reserve factor
   **/
  event ReserveFactorChanged(address indexed asset, uint256 factor);

  /**
   * @dev Emitted when the borrow cap of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param borrowCap The new borrow cap
   **/
  event BorrowCapChanged(address indexed asset, uint256 borrowCap);

  /**
   * @dev Emitted when the supply cap of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param supplyCap The new supply cap
   **/
  event SupplyCapChanged(address indexed asset, uint256 supplyCap);

  /**
   * @dev Emitted when the reserve decimals are updated
   * @param asset The address of the underlying asset of the reserve
   * @param decimals The new decimals
   **/
  event ReserveDecimalsChanged(address indexed asset, uint256 decimals);

  /**
   * @dev Emitted when a reserve interest strategy contract is updated
   * @param asset The address of the underlying asset of the reserve
   * @param strategy The new address of the interest strategy contract
   **/
  event ReserveInterestRateStrategyChanged(address indexed asset, address strategy);

  /**
   * @dev Emitted when an aToken implementation is upgraded
   * @param asset The address of the underlying asset of the reserve
   * @param proxy The aToken proxy address
   * @param implementation The new aToken implementation
   **/
  event ATokenUpgraded(
    address indexed asset,
    address indexed proxy,
    address indexed implementation
  );

  /**
   * @dev Emitted when the implementation of a stable debt token is upgraded
   * @param asset The address of the underlying asset of the reserve
   * @param proxy The stable debt token proxy address
   * @param implementation The new aToken implementation
   **/
  event StableDebtTokenUpgraded(
    address indexed asset,
    address indexed proxy,
    address indexed implementation
  );

  /**
   * @dev Emitted when the implementation of a variable debt token is upgraded
   * @param asset The address of the underlying asset of the reserve
   * @param proxy The variable debt token proxy address
   * @param implementation The new aToken implementation
   **/
  event VariableDebtTokenUpgraded(
    address indexed asset,
    address indexed proxy,
    address indexed implementation
  );

  /**
   * @dev Emitted when a new borrower is authorized (fees = 0)
   * @param flashBorrower The address of the authorized borrower
   **/
  event FlashBorrowerAuthorized(address indexed flashBorrower);

  /**
   * @dev Emitted when a borrower is unauthorized
   * @param flashBorrower The address of the unauthorized borrower
   **/
  event FlashBorrowerUnauthorized(address indexed flashBorrower);

  /**
   * @dev Emitted when a new risk admin is registered
   * @param admin the newly registered admin
   **/
  event RiskAdminRegistered(address indexed admin);

  /**
   * @dev Emitted when a risk admin is unregistered
   * @param admin the unregistered admin
   **/
  event RiskAdminUnregistered(address indexed admin);

  /**
   * @dev Emitted when a the total premium on flashloans is updated
   * @param flashloanPremiumTotal the new premium
   **/
  event FlashloanPremiumTotalUpdated(uint256 flashloanPremiumTotal);

  /**
   * @dev Emitted when a the part of the premium that goes to protoco lis updated
   * @param flashloanPremiumToProtocol the new premium
   **/
  event FlashloanPremiumToProcolUpdated(uint256 flashloanPremiumToProtocol);
}
