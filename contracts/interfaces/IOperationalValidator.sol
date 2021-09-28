// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

interface IOperationalValidator {
  function isBorrowAllowed() external view returns (bool);

  function isLiquidationAllowed(uint256 healthFactor) external view returns (bool);
}
