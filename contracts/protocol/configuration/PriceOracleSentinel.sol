// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPriceOracleSentinel} from '../../interfaces/IPriceOracleSentinel.sol';
import {ISequencerOracle} from '../../interfaces/ISequencerOracle.sol';

/**
 * @title PriceOracleSentinel
 * @author Aave
 * @notice It validates if operations are allowed depending on the PriceOracle health.
 * @dev After a PriceOracle downtime, once it gets up, users can make their positions healthy during a grace period.
 */
contract PriceOracleSentinel is IPriceOracleSentinel {
  IPoolAddressesProvider public immutable _addressesProvider;
  ISequencerOracle public immutable _oracle;
  uint256 public immutable _gracePeriod;

  /**
   * @notice Constructor
   * @param provider The address of the PoolAddressesProvider
   * @param oracle The address of the SequencerOracle
   * @param gracePeriod The duration of the grace period in seconds
   */
  constructor(
    IPoolAddressesProvider provider,
    ISequencerOracle oracle,
    uint256 gracePeriod
  ) {
    _addressesProvider = provider;
    _oracle = oracle;
    _gracePeriod = gracePeriod;
  }

  /// @inheritdoc IPriceOracleSentinel
  function isBorrowAllowed() public view override returns (bool) {
    return _isUpAndGracePeriodPassed();
  }

  /// @inheritdoc IPriceOracleSentinel
  function isLiquidationAllowed() public view override returns (bool) {
    return _isUpAndGracePeriodPassed();
  }

  function _isUpAndGracePeriodPassed() internal view returns (bool) {
    (bool isDown, uint256 timestampGotUp) = _oracle.latestAnswer();
    return !isDown && block.timestamp - timestampGotUp > _gracePeriod;
  }
}
