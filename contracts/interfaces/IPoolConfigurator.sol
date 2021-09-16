// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {ConfiguratorInputTypes} from '../protocol/libraries/types/ConfiguratorInputTypes.sol';

/**
 * @title IPoolConfigurator
 * @author Aave
 * @notice Defines the basic interface for a Pool configurator.
 **/
interface IPoolConfigurator {
  /**
   * @notice Emitted when a reserve is initialized.
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
   * @notice Emitted when borrowing is enabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param stableRateEnabled True if stable rate borrowing is enabled, false otherwise
   **/
  event BorrowingEnabledOnReserve(address indexed asset, bool stableRateEnabled);

  /**
   * @notice Emitted when borrowing is disabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  event BorrowingDisabledOnReserve(address indexed asset);

  /**
   * @notice Emitted when the collateralization risk parameters for the specified asset are updated.
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
   * @notice Emitted when stable rate borrowing is enabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  event StableRateEnabledOnReserve(address indexed asset);

  /**
   * @notice Emitted when stable rate borrowing is disabled on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  event StableRateDisabledOnReserve(address indexed asset);

  /**
   * @notice Emitted when a reserve is activated
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveActivated(address indexed asset);

  /**
   * @notice Emitted when a reserve is deactivated
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveDeactivated(address indexed asset);

  /**
   * @notice Emitted when a reserve is frozen
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveFrozen(address indexed asset);

  /**
   * @notice Emitted when a reserve is unfrozen
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveUnfrozen(address indexed asset);

  /**
   * @notice Emitted when a reserve is paused
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReservePaused(address indexed asset);

  /**
   * @notice Emitted when a reserve is unpaused
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveUnpaused(address indexed asset);

  /**
   * @notice Emitted when a reserve is dropped
   * @param asset The address of the underlying asset of the reserve
   **/
  event ReserveDropped(address indexed asset);

  /**
   * @notice Emitted when a reserve factor is updated
   * @param asset The address of the underlying asset of the reserve
   * @param factor The new reserve factor
   **/
  event ReserveFactorChanged(address indexed asset, uint256 factor);

  /**
   * @notice Emitted when the borrow cap of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param borrowCap The new borrow cap
   **/
  event BorrowCapChanged(address indexed asset, uint256 borrowCap);

  /**
   * @notice Emitted when the supply cap of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param supplyCap The new supply cap
   **/
  event SupplyCapChanged(address indexed asset, uint256 supplyCap);

  /**
   * @notice Emitted when the liquidation protocol fee of a reserve is updated
   * @param asset The address of the underlying asset of the reserve
   * @param fee The new supply cap
   **/
  event LiquidationProtocolFeeChanged(address indexed asset, uint256 fee);

  /**
   * @notice Emitted when the reserve decimals are updated
   * @param asset The address of the underlying asset of the reserve
   * @param decimals The new decimals
   **/
  event ReserveDecimalsChanged(address indexed asset, uint256 decimals);

  /**
   * @notice Emitted when a reserve interest strategy contract is updated
   * @param asset The address of the underlying asset of the reserve
   * @param strategy The new address of the interest strategy contract
   **/
  event ReserveInterestRateStrategyChanged(address indexed asset, address strategy);

  /**
   * @notice Emitted when an aToken implementation is upgraded
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
   * @notice Emitted when the implementation of a stable debt token is upgraded
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
   * @notice Emitted when the implementation of a variable debt token is upgraded
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
   * @notice Emitted when a new borrower is authorized (fees = 0)
   * @param flashBorrower The address of the authorized borrower
   **/
  event FlashBorrowerAuthorized(address indexed flashBorrower);

  /**
   * @notice Emitted when a borrower is unauthorized
   * @param flashBorrower The address of the unauthorized borrower
   **/
  event FlashBorrowerUnauthorized(address indexed flashBorrower);

  /**
   * @notice Emitted when a new risk admin is registered
   * @param admin The newly registered admin
   **/
  event RiskAdminRegistered(address indexed admin);

  /**
   * @notice Emitted when a risk admin is unregistered
   * @param admin The unregistered admin
   **/
  event RiskAdminUnregistered(address indexed admin);

  /**
   * @notice Emitted when a the total premium on flashloans is updated
   * @param flashloanPremiumTotal The new premium
   **/
  event FlashloanPremiumTotalUpdated(uint256 flashloanPremiumTotal);

  /**
   * @notice Emitted when a the part of the premium that goes to protocol is updated
   * @param flashloanPremiumToProtocol The new premium
   **/
  event FlashloanPremiumToProtocolUpdated(uint256 flashloanPremiumToProtocol);

  /**
   * @notice Initializes multiple reserves
   * @param input The array of initialization parameters
   **/
  function initReserves(ConfiguratorInputTypes.InitReserveInput[] calldata input) external;

  /**
   * @notice Updates the aToken implementation for the reserve
   * @param input The aToken update paramenters
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
   * @notice Enables borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param borrowCap The borrow cap for this specific asset, in absolute units of tokens
   * @param stableBorrowRateEnabled True if stable borrow rate needs to be enabled by default on this reserve
   **/
  function enableBorrowingOnReserve(
    address asset,
    uint256 borrowCap,
    bool stableBorrowRateEnabled
  ) external;

  /**
   * @notice Disables borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function disableBorrowingOnReserve(address asset) external;

  /**
   * @notice Configures the reserve collateralization parameters
   * @dev all the values are expressed in percentages with two decimals of precision. A valid value is 10000, which means 100.00%
   * @param asset The address of the underlying asset of the reserve
   * @param ltv The loan to value of the asset when used as collateral
   * @param liquidationThreshold The threshold at which loans using this asset as collateral will be considered undercollateralized
   * @param liquidationBonus The bonus liquidators receive to liquidate this asset. The values is always above 100%. A value of 105%
   * means the liquidator will receive a 5% bonus
   **/
  function configureReserveAsCollateral(
    address asset,
    uint256 ltv,
    uint256 liquidationThreshold,
    uint256 liquidationBonus
  ) external;

  /**
   * @notice Enable stable rate borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function enableReserveStableRate(address asset) external;

  /**
   * @notice Disable stable rate borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function disableReserveStableRate(address asset) external;

  /**
   * @notice Activates a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function activateReserve(address asset) external;

  /**
   * @notice Deactivates a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function deactivateReserve(address asset) external;

  /**
   * @notice Freezes a reserve. A frozen reserve doesn't allow any new deposit, borrow or rate swap
   *  but allows repayments, liquidations, rate rebalances and withdrawals
   * @param asset The address of the underlying asset of the reserve
   **/
  function freezeReserve(address asset) external;

  /**
   * @notice Unfreezes a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function unfreezeReserve(address asset) external;

  /**
   * @notice Pauses a reserve. A paused reserve does not allow any interaction (deposit, borrow, repay, swap interestrate, liquidate, atoken transfers)
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
   * @param rateStrategyAddress The new address of the interest strategy contract
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
   * @param borrowCap The new borrow of the reserve
   **/
  function setBorrowCap(address asset, uint256 borrowCap) external;

  /**
   * @notice Updates the supply cap of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param supplyCap The new supply of the reserve
   **/
  function setSupplyCap(address asset, uint256 supplyCap) external;

  /**
   * @notice Updates the liquidation protocol fee of reserve
   * @param asset The address of the underlying asset of the reserve
   * @param fee The new supply of the reserve
   **/
  function setLiquidationProtocolFee(address asset, uint256 fee) external;

  /**
   * @notice Registers a new admin with rights on risk related configurations
   * @param admin The address of the admin to register
   **/
  function registerRiskAdmin(address admin) external;

  /**
   * @notice Unegisters a risk admin
   * @param admin The address of the admin to unregister
   **/
  function unregisterRiskAdmin(address admin) external;

  /**
   * @notice Returns wether an address in a risk admin or not
   * @param admin The address of the potential admin
   **/
  function isRiskAdmin(address admin) external view returns (bool);

  /**
   * @notice Authorize a new borrower (fees are 0 for the authorized borrower)
   * @param flashBorrower The address of the authorized borrower
   **/
  function authorizeFlashBorrower(address flashBorrower) external;

  /**
   * @notice Unauthorize a borrower
   * @param flashBorrower The address of the unauthorized borrower
   **/
  function unauthorizeFlashBorrower(address flashBorrower) external;

  /**
   * @notice Drops a reserve entirely
   * @param asset The address of the reserve to drop
   **/
  function dropReserve(address asset) external;

  /**
   * @notice Updates the total flash loan premium
   * flash loan premium consist in 2 parts
   * - A part is sent to aToken holders as extra balance
   * - A part is collected by the protocol reserves
   * @param flashloanPremiumTotal The total premium in bps
   */
  function updateFlashloanPremiumTotal(uint256 flashloanPremiumTotal) external;

  /**
   * @notice Updates the flash loan premium collected by protocol reserves
   * @param flashloanPremiumToProtocol The part of the premium sent to protocol
   */
  function updateFlashloanPremiumToProtocol(uint256 flashloanPremiumToProtocol) external;
}
