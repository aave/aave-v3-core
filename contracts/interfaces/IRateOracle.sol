// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

/**
 * @title IRateOracle
 * @author Aave
 * @notice Interface for the Aave borrow rate oracle. Provides the average market borrow rate to be used as a base for the stable borrow rate calculations
 **/

interface IRateOracle {
  /**
   * @notice Returns the market borrow rate in ray
   * @param asset The asset to retrieve borrow rate for
   * @return The borrow rate for the given asset
   **/
  function getMarketBorrowRate(address asset) external view returns (uint256);

  /**
   * @notice Sets the market borrow rate. Rate value must be in ray
   * @param asset The asset to set borrow rate for
   * @param rate The rate to use
   **/
  function setMarketBorrowRate(address asset, uint256 rate) external;
}
