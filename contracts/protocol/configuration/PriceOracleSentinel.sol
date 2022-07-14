// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {AggregatorV3Interface} from '../../dependencies/chainlink/AggregatorV3Interface.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPriceOracleSentinel} from '../../interfaces/IPriceOracleSentinel.sol';
import {ISequencerOracle} from '../../interfaces/ISequencerOracle.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {IAaveOracle} from '../../interfaces/IAaveOracle.sol';

/**
 * @title PriceOracleSentinel
 * @author Aave
 * @notice It validates if operations are allowed depending on the PriceOracle health.
 * @dev Once the PriceOracle gets up after an outage/downtime, users can make their positions healthy during a grace
 *  period. So the PriceOracle is considered completely up once its up and the grace period passed.
 */
contract PriceOracleSentinel is IPriceOracleSentinel {
  /**
   * @dev Only pool admin can call functions marked by this modifier.
   **/
  modifier onlyPoolAdmin() {
    IACLManager aclManager = IACLManager(ADDRESSES_PROVIDER.getACLManager());
    require(aclManager.isPoolAdmin(msg.sender), Errors.CALLER_NOT_POOL_ADMIN);
    _;
  }

  /**
   * @dev Only risk or pool admin can call functions marked by this modifier.
   **/
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

  uint256 internal _priceExpirationTime;

  /**
   * @dev Constructor
   * @param provider The address of the PoolAddressesProvider
   * @param oracle The address of the SequencerOracle
   * @param gracePeriod The duration of the grace period in seconds
   * @param priceExpirationTime The expiration time of asset prices in seconds
   */
  constructor(
    IPoolAddressesProvider provider,
    ISequencerOracle oracle,
    uint256 gracePeriod,
    uint256 priceExpirationTime
  ) {
    ADDRESSES_PROVIDER = provider;
    _sequencerOracle = oracle;
    _gracePeriod = gracePeriod;
    _priceExpirationTime = priceExpirationTime;
  }

  /// @inheritdoc IPriceOracleSentinel
  function isBorrowAllowed(address priceOracle, address asset) public view override returns (bool) {
    return _isUpAndGracePeriodPassed() && !_isPriceStale(priceOracle, asset);
  }

  /// @inheritdoc IPriceOracleSentinel
  function isLiquidationAllowed(address priceOracle, address debtAsset)
    public
    view
    override
    returns (bool)
  {
    return _isUpAndGracePeriodPassed() && !_isPriceStale(priceOracle, debtAsset);
  }

  /**
   * @notice Checks the sequencer oracle is healthy: is up and grace period passed.
   * @return True if the SequencerOracle is up and the grace period passed, false otherwise
   */
  function _isUpAndGracePeriodPassed() internal view returns (bool) {
    (, int256 answer, , uint256 lastUpdateTimestamp, ) = _sequencerOracle.latestRoundData();
    return answer == 0 && block.timestamp - lastUpdateTimestamp > _gracePeriod;
  }

  /**
   * @notice Checks the price of the asset is not stale. It can be considered stale if the time passed since the last
   * is longer than the price expiration time.
   * @param priceOracle The address of the price oracle
   * @param asset The address of the asset to check its price status
   * @return True if the price is stale, false otherwise
   */
  function _isPriceStale(address priceOracle, address asset) internal view returns (bool) {
    address source = IAaveOracle(priceOracle).getSourceOfAsset(asset);
    (, , , uint256 updatedAt, ) = AggregatorV3Interface(source).latestRoundData();
    return (block.timestamp - updatedAt) > _priceExpirationTime;
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
  function setPriceExpirationTime(uint256 newPriceExpirationTime) public onlyRiskOrPoolAdmins {
    _priceExpirationTime = newPriceExpirationTime;
    emit PriceExpirationTimeUpdated(newPriceExpirationTime);
  }

  /// @inheritdoc IPriceOracleSentinel
  function getSequencerOracle() public view returns (address) {
    return address(_sequencerOracle);
  }

  /// @inheritdoc IPriceOracleSentinel
  function getGracePeriod() public view returns (uint256) {
    return _gracePeriod;
  }

  /// @inheritdoc IPriceOracleSentinel
  function getPriceExpirationTime() public view returns (uint256) {
    return _priceExpirationTime;
  }
}
