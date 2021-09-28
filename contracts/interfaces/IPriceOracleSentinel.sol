// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

/**
 * @title IPriceOracleSentinel
 * @author Aave
 * @notice Defines the basic interface for a Price oracle sentinel.
 */
interface IPriceOracleSentinel {
  function setAnswer(bool isDown, uint256 timestamp) external;

  function latestAnswer() external view returns (bool, uint256);
}
