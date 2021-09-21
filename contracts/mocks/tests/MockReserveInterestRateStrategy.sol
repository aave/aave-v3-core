// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IReserveInterestRateStrategy} from '../../interfaces/IReserveInterestRateStrategy.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {WadRayMath} from '../../protocol/libraries/math/WadRayMath.sol';
import {DataTypes} from '../../protocol/libraries/types/DataTypes.sol';

contract MockReserveInterestRateStrategy is IReserveInterestRateStrategy {
  uint256 public immutable OPTIMAL_UTILIZATION_RATE;
  uint256 public immutable EXCESS_UTILIZATION_RATE;
  IPoolAddressesProvider public immutable addressesProvider;
  uint256 internal immutable _baseVariableBorrowRate;
  uint256 internal immutable _variableRateSlope1;
  uint256 internal immutable _variableRateSlope2;
  uint256 internal immutable _stableRateSlope1;
  uint256 internal immutable _stableRateSlope2;

  uint256 internal _liquidityRate;
  uint256 internal _stableBorrowRate;
  uint256 internal _variableBorrowRate;

  constructor(
    IPoolAddressesProvider provider,
    uint256 optimalUtilizationRate,
    uint256 baseVariableBorrowRate,
    uint256 variableRateSlope1,
    uint256 variableRateSlope2,
    uint256 stableRateSlope1,
    uint256 stableRateSlope2
  ) {
    OPTIMAL_UTILIZATION_RATE = optimalUtilizationRate;
    EXCESS_UTILIZATION_RATE = WadRayMath.RAY - optimalUtilizationRate;
    addressesProvider = provider;
    _baseVariableBorrowRate = baseVariableBorrowRate;
    _variableRateSlope1 = variableRateSlope1;
    _variableRateSlope2 = variableRateSlope2;
    _stableRateSlope1 = stableRateSlope1;
    _stableRateSlope2 = stableRateSlope2;
  }

  function setLiquidityRate(uint256 liquidityRate) public {
    _liquidityRate = liquidityRate;
  }

  function setStableBorrowRate(uint256 stableBorrowRate) public {
    _stableBorrowRate = stableBorrowRate;
  }

  function setVariableBorrowRate(uint256 variableBorrowRate) public {
    _variableBorrowRate = variableBorrowRate;
  }

  function calculateInterestRates(
    address,
    uint256,
    uint256,
    uint256,
    uint256,
    uint256,
    uint256
  )
    external
    view
    override
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    return (_liquidityRate, _stableBorrowRate, _variableBorrowRate);
  }

  function calculateInterestRates(
    address,
    address,
    DataTypes.CalculateInterestRatesParams memory,
    uint256,
    uint256
  )
    external
    view
    override
    returns (
      uint256 liquidityRate,
      uint256 stableBorrowRate,
      uint256 variableBorrowRate
    )
  {
    return (_liquidityRate, _stableBorrowRate, _variableBorrowRate);
  }

  function variableRateSlope1() external view returns (uint256) {
    return _variableRateSlope1;
  }

  function variableRateSlope2() external view returns (uint256) {
    return _variableRateSlope2;
  }

  function stableRateSlope1() external view returns (uint256) {
    return _stableRateSlope1;
  }

  function stableRateSlope2() external view returns (uint256) {
    return _stableRateSlope2;
  }

  function baseVariableBorrowRate() external view override returns (uint256) {
    return _baseVariableBorrowRate;
  }

  function getMaxVariableBorrowRate() external view override returns (uint256) {
    return _baseVariableBorrowRate + _variableRateSlope1 + _variableRateSlope2;
  }
}
