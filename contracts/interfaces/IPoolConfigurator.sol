// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {ConfiguratorInputTypes} from '../protocol/libraries/types/ConfiguratorInputTypes.sol';

/**
 * @title IPoolConfigurator
 * @author Aave
 * @notice Defines the basic interface for a Pool configurator.
 **/
interface IPoolConfigurator {
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
   * @dev Emitted when borrowing is enabled or disabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param enabled True if borrowing is enabled, false otherwise
   **/
  event ReserveBorrowing(address indexed asset, bool enabled);

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
   * @dev Emitted when stable rate borrowing state is changed on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param enabled True if stable rate borrowing is enabled, false otherwise
   **/
  event ReserveStableRateBorrowing(address indexed asset, bool enabled);

  /**
   * @dev Emitted when a reserve is activated or deactivated
   * @param asset The address of the underlying asset of the reserve
   * @param active True if reserve is active, false otherwise
   **/
  event ReserveActive(address indexed asset, bool active);

  /**
   * @dev Emitted when a reserve is frozen or unfrozen
   * @param asset The address of the underlying asset of the reserve
   * @param frozen True if reserve is frozen, false otherwise
   **/
  event ReserveFrozen(address indexed asset, bool frozen);

  /**
   * @dev Emitted when a reserve is paused or unpaused
   * @param asset The address of the underlying asset of the reserve
   * @param paused True if reserve is paused, false otherwise
   **/
  event ReservePaused(address indexed asset, bool paused);

  /**
   * @dev Emitted when a reserve is dropped
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveDropped(address indexed asset);

  /**
   * @dev Emitted when a reserve factor is updated
   * @param asset The address of the underlying asset of the reserve
   * @param factor The new reserve factor, expressed in bps
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
   * @dev Emitted when the liquidation protocol fee of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param fee The new liquidation protocol fee, expressed in bps
   **/
  event LiquidationProtocolFeeChanged(address indexed asset, uint256 fee);

  /**
   * @dev Emitted when the unbacked mint cap of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param unbackedMintCap The unbacked mint cap
   */
  event UnbackedMintCapChanged(address indexed asset, uint256 unbackedMintCap);

  /**
   * @dev Emitted when the category of an asset in eMode is changed
   * @param asset The address of the underlying asset of the reserve
   * @param categoryId The new eMode asset category
   **/
  event EModeAssetCategoryChanged(address indexed asset, uint8 categoryId);

  /**
   * @dev Emitted when a new eMode category is added
   * @param categoryId The new eMode category id
   * @param ltv The ltv for the asset category in eMode
   * @param liquidationThreshold The liquidationThreshold for the asset category in eMode
   * @param liquidationBonus The liquidationBonus for the asset category in eMode
   * @param oracle The optional address of the price oracle specific for this category
   * @param label A human readable identifier for the category
   **/
  event EModeCategoryAdded(
    uint8 indexed categoryId,
    uint256 ltv,
    uint256 liquidationThreshold,
    uint256 liquidationBonus,
    address oracle,
    string label
  );

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
   * @dev Emitted when the debt ceiling of an asset is set
   * @param asset The address of the underlying asset of the reserve
   * @param ceiling The new debt ceiling
   **/
  event DebtCeilingChanged(address indexed asset, uint256 ceiling);

  /**
   * @dev Emitted when a new risk admin is registered
   * @param admin The newly registered admin
   **/
  event RiskAdminRegistered(address indexed admin);

  /**
   * @dev Emitted when a risk admin is unregistered
   * @param admin The unregistered admin
   **/
  event RiskAdminUnregistered(address indexed admin);

  /**
   * @dev Emitted when the bridge protocol fee is updated
   * @param protocolFee The new protocol fee, expressed in bps
   */
  event BridgeProtocolFeeUpdated(uint256 protocolFee);

  /**
   * @dev Emitted when the total premium on flashloans is updated
   * @param flashloanPremiumTotal The new premium, expressed in bps
   **/
  event FlashloanPremiumTotalUpdated(uint256 flashloanPremiumTotal);

  /**
   * @dev Emitted when the part of the premium that goes to protocol is updated
   * @param flashloanPremiumToProtocol The new premium, expressed in bps
   **/
  event FlashloanPremiumToProtocolUpdated(uint256 flashloanPremiumToProtocol);

  /**
   * @dev Emitted when the reserve is set as borrowable/non borrowable in isolation mode.
   * @param asset The address of the underlying asset of the reserve
   * @param borrowable True if the reserve is borrowable in isolation, false otherwise
   **/
  event BorrowableInIsolationChanged(address asset, bool borrowable);

  /**
   * @notice Initializes multiple reserves
   * @param input The array of initialization parameters
   **/
  function initReserves(ConfiguratorInputTypes.InitReserveInput[] calldata input) external;

  /**
   * @notice Updates the aToken implementation for the reserve
   * @param input The aToken update parameters
   **/
  function updateAToken(ConfiguratorInputTypes.UpdateATokenInput calldata input) external;

  /**
   * @notice Updates the stable debt token implementation for the reserve
   * @param input The stableDebtToken update parameters
   **/
  function updateStableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input)
    external;

  /**
   * @notice Updates the variable debt token implementation for the asset
   * @param input The variableDebtToken update parameters
   **/
  function updateVariableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input)
    external;

  /**
   * @notice Configures borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param enabled True if borrowing needs to be enabled, false otherwise
   **/
  function setReserveBorrowing(address asset, bool enabled) external;

  /**
   * @notice Configures the reserve collateralization parameters
   * @dev All the values are expressed in bps. A value of 10000 results in 100.00%
   * @dev The `liquidationBonus` is always above 100%. A value of 105% means the liquidator will receive a 5% bonus
   * @param asset The address of the underlying asset of the reserve
   * @param ltv The loan to value of the asset when used as collateral
   * @param liquidationThreshold The threshold at which loans using this asset as collateral will be considered undercollateralized
   * @param liquidationBonus The bonus liquidators receive to liquidate this asset
   **/
  function configureReserveAsCollateral(
    address asset,
    uint256 ltv,
    uint256 liquidationThreshold,
    uint256 liquidationBonus
  ) external;

  /**
   * @notice Enable or disable stable rate borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param enabled True if stable rate borrowing needs to be enabled, false otherwise
   **/
  function setReserveStableRateBorrowing(address asset, bool enabled) external;

  /**
   * @notice Activate or deactivate a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param active True if the reserve needs to be active, false otherwise
   **/
  function setReserveActive(address asset, bool active) external;

  /**
   * @notice Freeze or unfreeze a reserve. A frozen reserve doesn't allow any new supply, borrow
   * or rate swap but allows repayments, liquidations, rate rebalances and withdrawals
   * @param asset The address of the underlying asset of the reserve
   * @param freeze True if the reserve needs to be frozen, false otherwise
   **/
  function setReserveFreeze(address asset, bool freeze) external;

  /**
   * @notice Sets the borrowable in isolation flag for the reserve
   * @dev When this flag is set to true, the asset will be borrowable against isolated collaterals and the borrowed
   * amount will be accumulated in the isolated collateral's total debt exposure.
   * Only assets of the same family (eg USD stablecoins) should be borrowable in isolation mode to keep consistency
   * in the debt ceiling calculations.
   * @param asset The address of the underlying asset of the reserve
   * @param borrowable True if the asset should be borrowable in isolation, false otherwise
   **/
  function setBorrowableInIsolation(address asset, bool borrowable) external;

  /**
   * @notice Pauses a reserve. A paused reserve does not allow any interaction (supply, borrow, repay, swap interest
   * rate, liquidate, atoken transfers)
   * @param asset The address of the underlying asset of the reserve
   * @param val True if pausing the reserve, false if unpausing
   **/
  function setReservePause(address asset, bool val) external;

  /**
   * @notice Updates the reserve factor of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param reserveFactor The new reserve factor of the reserve
   **/
  function setReserveFactor(address asset, uint256 reserveFactor) external;

  /**
   * @notice Sets the interest rate strategy of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param rateStrategyAddress The address of the new interest strategy contract
   **/
  function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
    external;

  /**
   * @notice Pauses or unpauses all the actions of the protocol, including aToken transfers
   * Effectively it pauses every reserve
   * @param val True if protocol needs to be paused, false otherwise
   **/
  function setPoolPause(bool val) external;

  /**
   * @notice Updates the borrow cap of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param borrowCap The new borrow cap of the reserve
   **/
  function setBorrowCap(address asset, uint256 borrowCap) external;

  /**
   * @notice Updates the supply cap of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param supplyCap The new supply cap of the reserve
   **/
  function setSupplyCap(address asset, uint256 supplyCap) external;

  /**
   * @notice Updates the liquidation protocol fee of reserve
   * @param asset The address of the underlying asset of the reserve
   * @param fee The new liquidation protocol fee of the reserve, expressed in bps
   **/
  function setLiquidationProtocolFee(address asset, uint256 fee) external;

  /**
   * @notice Updates the unbacked mint cap of reserve
   * @param asset The address of the underlying asset of the reserve
   * @param unbackedMintCap The new unbacked mint cap of the reserve
   **/
  function setUnbackedMintCap(address asset, uint256 unbackedMintCap) external;

  /**
   * @notice Assign an eMode category to asset
   * @param asset The address of the underlying asset of the reserve
   * @param categoryId The category id of the asset
   **/
  function setAssetEModeCategory(address asset, uint8 categoryId) external;

  /**
   * @notice Adds a new eMode category
   * @dev If `oracle` is zero address, the default assets oracles will be used to compute the overall debt and
   * overcollateralization of the users using this category.
   * @param categoryId The id of the category to be configured
   * @param ltv The ltv associated with the category
   * @param liquidationThreshold The liquidation threshold associated with the category
   * @param liquidationBonus The liquidation bonus associated with the category
   * @param oracle The oracle associated with the category
   * @param label A label identifying the category
   **/
  function setEModeCategory(
    uint8 categoryId,
    uint16 ltv,
    uint16 liquidationThreshold,
    uint16 liquidationBonus,
    address oracle,
    string calldata label
  ) external;

  /**
   * @notice Drops a reserve entirely
   * @param asset The address of the reserve to drop
   **/
  function dropReserve(address asset) external;

  /**
   * @notice Updates the bridge fee collected by the protocol reserves
   * @param protocolFee The part of the fee sent to protocol
   */
  function updateBridgeProtocolFee(uint256 protocolFee) external;

  /**
   * @notice Updates the total flash loan premium
   * Total flash loan premium consist in 2 parts:
   * - A part is sent to aToken holders as extra balance
   * - A part is collected by the protocol reserves
   * @dev Expressed in bps
   * @param flashloanPremiumTotal The total premium
   */
  function updateFlashloanPremiumTotal(uint256 flashloanPremiumTotal) external;

  /**
   * @notice Updates the flash loan premium collected by protocol reserves
   * @dev Expressed in bps
   * @param flashloanPremiumToProtocol The part of the total flashloan premium sent to the protocol
   */
  function updateFlashloanPremiumToProtocol(uint256 flashloanPremiumToProtocol) external;

  /**
   * @notice Sets the debt ceiling for an asset
   * @param ceiling The new debt ceiling
   */
  function setDebtCeiling(address asset, uint256 ceiling) external;
}
