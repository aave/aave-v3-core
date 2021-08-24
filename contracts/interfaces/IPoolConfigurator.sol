// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {ConfiguratorInputTypes} from '../protocol/libraries/types/ConfiguratorInputTypes.sol';

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
   * @dev Emitted when the protocol fee on liquidation is updated
   * @param asset The address of the underlying asset of the reserve
   * @param fee The new fee
   **/
  event LiquidationProtocolFeeChanged(address indexed asset, uint256 fee);

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

  /**
   * @dev Initializes multiple reserves
   * @param input The array of initialization parameters
   **/
  function initReserves(ConfiguratorInputTypes.InitReserveInput[] calldata input) external;

  /**
   * @dev Updates the aToken implementation for the reserve
   * @param input The aToken update paramenters
   **/
  function updateAToken(ConfiguratorInputTypes.UpdateATokenInput calldata input) external;

  /**
   * @dev Updates the stable debt token implementation for the reserve
   * @param input The stableDebtToken update parameters
   **/
  function updateStableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input)
    external;

  /**
   * @dev Updates the variable debt token implementation for the asset
   * @param input The variableDebtToken update parameters
   **/
  function updateVariableDebtToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input)
    external;

  /**
   * @dev Enables borrowing on a reserve
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
   * @dev Disables borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function disableBorrowingOnReserve(address asset) external;

  /**
   * @dev Configures the reserve collateralization parameters
   * all the values are expressed in percentages with two decimals of precision. A valid value is 10000, which means 100.00%
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
   * @dev Enable stable rate borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function enableReserveStableRate(address asset) external;

  /**
   * @dev Disable stable rate borrowing on a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function disableReserveStableRate(address asset) external;

  /**
   * @dev Activates a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function activateReserve(address asset) external;

  /**
   * @dev Deactivates a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function deactivateReserve(address asset) external;

  /**
   * @dev Freezes a reserve. A frozen reserve doesn't allow any new deposit, borrow or rate swap
   *  but allows repayments, liquidations, rate rebalances and withdrawals
   * @param asset The address of the underlying asset of the reserve
   **/
  function freezeReserve(address asset) external;

  /**
   * @dev Unfreezes a reserve
   * @param asset The address of the underlying asset of the reserve
   **/
  function unfreezeReserve(address asset) external;

  /**
   * @dev Pauses a reserve. A paused reserve does not allow any interaction (deposit, borrow, repay, swap interestrate, liquidate, atoken transfers)
   * @param asset The address of the underlying asset of the reserve
   * @param val true = pausing, false = unpausing
   **/
  function setReservePause(address asset, bool val) external;

  /**
   * @dev Updates the reserve factor of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param reserveFactor The new reserve factor of the reserve
   **/
  function setReserveFactor(address asset, uint256 reserveFactor) external;

  /**
   * @dev Sets the interest rate strategy of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param rateStrategyAddress The new address of the interest strategy contract
   **/
  function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
    external;

  /**
   * @dev pauses or unpauses all the actions of the protocol, including aToken transfers
   * Effectively it pauses every reserve
   * @param val true if protocol needs to be paused, false otherwise
   **/
  function setPoolPause(bool val) external;

  /**
   * @dev Updates the borrow cap of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param borrowCap The new borrow of the reserve
   **/
  function setBorrowCap(address asset, uint256 borrowCap) external;

  /**
   * @dev Updates the supply cap of a reserve
   * @param asset The address of the underlying asset of the reserve
   * @param supplyCap The new supply of the reserve
   **/
  function setSupplyCap(address asset, uint256 supplyCap) external;

  /**
   * @dev Registers a new admin with rights on risk related configurations
   * @param admin The address of the admin to register
   **/
  function registerRiskAdmin(address admin) external;

  /**
   * @dev Unegisters a risk admin
   * @param admin The address of the admin to unregister
   **/
  function unregisterRiskAdmin(address admin) external;

  /**
   * @dev Returns wether an address in a risk admin or not
   * @param admin The address of the potential admin
   **/
  function isRiskAdmin(address admin) external view returns (bool);

  /**
   * @dev Authorize a new borrower (fees are 0 for the authorized borrower)
   * @param flashBorrower The address of the authorized borrower
   **/
  function authorizeFlashBorrower(address flashBorrower) external;

  /**
   * @dev Unauthorize a borrower
   * @param flashBorrower The address of the unauthorized borrower
   **/
  function unauthorizeFlashBorrower(address flashBorrower) external;

  /**
   * @dev Drops a reserve entirely
   * @param asset the address of the reserve to drop
   **/
  function dropReserve(address asset) external;

  /**
   * @dev Updates the total flash loan premium
   * flash loan premium consist in 2 parts
   * - A part is sent to aToken holders as extra balance
   * - A part is collected by the protocol reserves
   * @param flashloanPremiumTotal total premium in bps
   */
  function updateFlashloanPremiumTotal(uint256 flashloanPremiumTotal) external;

  /**
   * @dev Updates the flash loan premium collected by protocol reserves
   * @param flashloanPremiumToProtocol part of the premium sent to protocol
   */
  function updateFlashloanPremiumToProtocol(uint256 flashloanPremiumToProtocol) external;
}
