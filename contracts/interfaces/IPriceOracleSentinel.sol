// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

/**
 * @title IPriceOracleSentinel
 * @author Aave
 * @notice Defines the basic interface for the PriceOracleSentinel
 */
interface IPriceOracleSentinel {
  /**
   * @notice Returns true if the `borrow` operation is allowed.
   * @dev Operation not allowed when PriceOracle is down or grace period not passed.
   * @return True if the `borrow` operation is allowed, false otherwise.
   */
  function isBorrowAllowed() external view returns (bool);

  /**
   * @notice Returns true if the `liquidation` operation is allowed.
   * @dev Operation not allowed when PriceOracle is down or grace period not passed.
   * @dev If the healthfactor is below a minimum threshold, the liquidation is allowed.
   * @param healthFactor The health factor of the position to liquidate
   * @return True if the `liquidation` operation is allowed, false otherwise.
   */
  function isLiquidationAllowed(uint256 healthFactor) external view returns (bool);
}
