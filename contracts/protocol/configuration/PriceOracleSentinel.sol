// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Errors} from '../libraries/helpers/Errors.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPriceOracleSentinel} from '../../interfaces/IPriceOracleSentinel.sol';
import {ISequencerOracle} from '../../interfaces/ISequencerOracle.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';

/**
 * @title PriceOracleSentinel
 * @author Aave
 * @notice It validates if operations are allowed depending on the PriceOracle health.
 * @dev After a PriceOracle downtime, once it gets up, users can make their positions healthy during a grace period.
 */
contract PriceOracleSentinel is IPriceOracleSentinel {
  modifier onlyPoolAdmin() {
    IACLManager aclManager = IACLManager(ADDRESSES_PROVIDER.getACLManager());
    require(aclManager.isPoolAdmin(msg.sender), Errors.CALLER_NOT_POOL_ADMIN);
    _;
  }

  modifier onlyRiskOrPoolAdmins() {
    IACLManager aclManager = IACLManager(ADDRESSES_PROVIDER.getACLManager());
    require(
      aclManager.isRiskAdmin(msg.sender) || aclManager.isPoolAdmin(msg.sender),
      Errors.CALLER_NOT_RISK_OR_POOL_ADMIN
    );
    _;
  }

  IPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;

  ISequencerOracle internal _sequencerOracle;

  uint256 internal _gracePeriod;

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
    ADDRESSES_PROVIDER = provider;
    _sequencerOracle = oracle;
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
    (bool isDown, uint256 timestampGotUp) = _sequencerOracle.latestAnswer();
    return !isDown && block.timestamp - timestampGotUp > _gracePeriod;
  }

  /// @inheritdoc IPriceOracleSentinel
  function setSequencerOracle(address newSequencerOracle) public onlyPoolAdmin {
    _sequencerOracle = ISequencerOracle(newSequencerOracle);
    emit SequencerOracleUpdated(newSequencerOracle);
  }

  /// @inheritdoc IPriceOracleSentinel
  function setGracePeriod(uint256 newGracePeriod) public onlyRiskOrPoolAdmins {
    _gracePeriod = newGracePeriod;
    emit GracePeriodUpdated(newGracePeriod);
  }

  /// @inheritdoc IPriceOracleSentinel
  function getSequencerOracle() public view returns (address) {
    return address(_sequencerOracle);
  }

  /// @inheritdoc IPriceOracleSentinel
  function getGracePeriod() public view returns (uint256) {
    return _gracePeriod;
  }
}
