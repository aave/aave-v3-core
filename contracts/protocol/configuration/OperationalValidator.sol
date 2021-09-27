// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IOperationalValidator} from '../../interfaces/IOperationalValidator.sol';

/**
 * @title OperationalValidator
 * @author Aave
 * @notice
 */
contract OperationalValidator is IOperationalValidator {
  IPoolAddressesProvider public _addressesProvider;
  uint256 public _gracePeriod;

  /**
   * @notice Constructor
   * @dev
   * @param provider The address of the PoolAddressesProvider
   */
  constructor(IPoolAddressesProvider provider, uint256 gracePeriod) {
    _addressesProvider = provider;
    _gracePeriod = gracePeriod;
  }

  /// @inheritdoc IOperationalValidator
  function isBorrowAllowed() public override returns (bool) {
    // If the sequencer goes down, borrowing is not allowed
  }

  /// @inheritdoc IOperationalValidator
  function isLiquidationAllowed() public override returns (bool) {
    // If the sequencer goes down AND HF > 0.9, liquidation is not allowed
    // If timestampSequencerGotUp - block.timestamp > gracePeriod, liquidation allowed
  }
}
