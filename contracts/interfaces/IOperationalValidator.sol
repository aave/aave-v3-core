// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

interface IOperationalValidator {
  function isBorrowAllowed() external returns (bool);

  function isLiquidationAllowed() external returns (bool);
}
