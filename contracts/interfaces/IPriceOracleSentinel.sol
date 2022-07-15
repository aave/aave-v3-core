// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IPoolAddressesProvider} from './IPoolAddressesProvider.sol';

/**
 * @title IPriceOracleSentinel
 * @author Aave
 * @notice Defines the basic interface for the PriceOracleSentinel
 */
interface IPriceOracleSentinel {
  /**
   * @dev Emitted after the sequencer oracle is updated
   * @param newSequencerOracle The new sequencer oracle
   */
  event SequencerOracleUpdated(address newSequencerOracle);

  /**
   * @dev Emitted after the grace period is updated
   * @param newGracePeriod The new grace period value
   */
  event GracePeriodUpdated(uint256 newGracePeriod);

  /**
   * @dev Emitted after the price expiration time is updated
   * @param newPriceExpirationTime The new price expiration time
   */
  event PriceExpirationTimeUpdated(uint256 newPriceExpirationTime);

  /**
   * @notice Returns the PoolAddressesProvider
   * @return The address of the PoolAddressesProvider contract
   */
  function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);

  /**
   * @notice Returns true if the `borrow` operation is allowed.
   * @dev Operation not allowed when PriceOracle is down or grace period not passed.
   * @param priceOracle The address of the price oracle
   * @param asset The address of the asset to borrow
   * @return True if the `borrow` operation is allowed, false otherwise.
   */
  function isBorrowAllowed(address priceOracle, address asset) external view returns (bool);

  /**
   * @notice Returns true if the `liquidation` operation is allowed.
   * @dev Operation not allowed when PriceOracle is down or grace period not passed.
   * @param priceOracle The address of the price oracle
   * @param debtAsset The address of the debt asset to liquidate
   * @return True if the `liquidation` operation is allowed, false otherwise.
   */
  function isLiquidationAllowed(address priceOracle, address debtAsset)
    external
    view
    returns (bool);

  /**
   * @notice Updates the address of the sequencer oracle
   * @param newSequencerOracle The address of the new Sequencer Oracle to use
   */
  function setSequencerOracle(address newSequencerOracle) external;

  /**
   * @notice Updates the duration of the grace period
   * @param newGracePeriod The value of the new grace period duration
   */
  function setGracePeriod(uint256 newGracePeriod) external;

  /**
   * @notice Updates the price expiration time
   * @param newPriceExpirationTime The value of the new price expiration time
   */
  function setPriceExpirationTime(uint256 newPriceExpirationTime) external;

  /**
   * @notice Returns the SequencerOracle
   * @return The address of the sequencer oracle contract
   */
  function getSequencerOracle() external view returns (address);

  /**
   * @notice Returns the grace period
   * @return The duration of the grace period
   */
  function getGracePeriod() external view returns (uint256);

  /**
   * @notice Returns the price expiration time
   * @return The duration after the price of assets can be considered as expired or stale (in seconds)
   */
  function getPriceExpirationTime() external view returns (uint256);
}
