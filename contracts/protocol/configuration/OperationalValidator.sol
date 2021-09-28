// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IOperationalValidator} from '../../interfaces/IOperationalValidator.sol';
import {ISequencerOracle} from '../../interfaces/ISequencerOracle.sol';

/**
 * @title OperationalValidator
 * @author Aave
 * @notice It validates if operations are allowed depending on the Sequencer Health.
 * @dev After a Sequencer downtime, users can make their positions healthier during the grace period.
 */
contract OperationalValidator is IOperationalValidator {
  IPoolAddressesProvider public _addressesProvider;
  ISequencerOracle public _sequencerOracle;
  uint256 public _gracePeriod;

  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95 ether;

  /**
   * @notice Constructor
   * @dev
   * @param provider The address of the PoolAddressesProvider
   */
  constructor(
    IPoolAddressesProvider provider,
    ISequencerOracle sequencerOracle,
    uint256 gracePeriod
  ) {
    _addressesProvider = provider;
    _sequencerOracle = sequencerOracle;
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
    (bool isDown, uint256 timestampGotUp) = _sequencerOracle.latestAnswer();
    return !isDown && block.timestamp - timestampGotUp > _gracePeriod;
  }
}
