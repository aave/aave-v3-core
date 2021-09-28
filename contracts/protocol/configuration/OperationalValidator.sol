// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IOperationalValidator} from '../../interfaces/IOperationalValidator.sol';
import {IPriceOracleSentinel} from '../../interfaces/IPriceOracleSentinel.sol';

/**
 * @title OperationalValidator
 * @author Aave
 * @notice It validates if operations are allowed depending on the PriceOracle health.
 * @dev After a PriceOracle downtime, once it gets up, users can make their positions healthy during a grace period.
 */
contract OperationalValidator is IOperationalValidator {
  IPoolAddressesProvider public _addressesProvider;
  IPriceOracleSentinel public _priceOracleSentinel;
  uint256 public _gracePeriod;

  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95 ether;

  /**
   * @notice Constructor
   * @param provider The address of the PoolAddressesProvider
   * @param priceOracleSentinel The address of the PriceOracleSentinel
   * @param gracePeriod The duration of the grace period in seconds
   */
  constructor(
    IPoolAddressesProvider provider,
    IPriceOracleSentinel priceOracleSentinel,
    uint256 gracePeriod
  ) {
    _addressesProvider = provider;
    _priceOracleSentinel = priceOracleSentinel;
    _gracePeriod = gracePeriod;
  }

  /// @inheritdoc IOperationalValidator
  function isBorrowAllowed() public view override returns (bool) {
    return _isUpAndGracePeriodPassed();
  }

  /// @inheritdoc IOperationalValidator
  function isLiquidationAllowed(uint256 healthFactor) public view override returns (bool) {
    if (healthFactor < MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
      return true;
    }
    return _isUpAndGracePeriodPassed();
  }

  function _isUpAndGracePeriodPassed() internal view returns (bool) {
    (bool isDown, uint256 timestampGotUp) = _priceOracleSentinel.latestAnswer();
    return !isDown && block.timestamp - timestampGotUp > _gracePeriod;
  }
}
