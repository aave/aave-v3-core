// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {PercentageMath} from '../libraries/math/PercentageMath.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {IReserveInterestRateStrategy} from '../../interfaces/IReserveInterestRateStrategy.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {Errors} from '../libraries/helpers/Errors.sol';

/**
 * @title DefaultReserveInterestRateStrategy contract
 * @author Aave
 * @notice Implements the calculation of the interest rates depending on the reserve state
 * @dev The model of interest rate is based on 2 slopes, one before the `OPTIMAL_UTILIZATION_RATE`
 * point of utilization and another from that one to 100%.
 * - An instance of this same contract, can't be used across different Aave markets, due to the caching
 *   of the PoolAddressesProvider
 **/
contract DefaultReserveInterestRateStrategy is IReserveInterestRateStrategy {
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  /**
   * @dev This constant represents the utilization rate at which the pool aims to obtain most competitive borrow rates.
   * Expressed in ray
   **/
  uint256 public immutable OPTIMAL_UTILIZATION_RATE;

  /**
   * @dev This constant represents the optimal stable debt to total debt ratio of the reserve.
   * Expressed in ray
   */
  uint256 public immutable OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO;

  /**
   * @dev This constant represents the excess utilization rate above the optimal. It's always equal to
   * 1-optimal utilization rate. Added as a constant here for gas optimizations.
   * Expressed in ray
   **/
  uint256 public immutable EXCESS_UTILIZATION_RATE;

  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

  /// Base variable borrow rate when Utilization rate = 0. Expressed in ray
  uint256 internal immutable _baseVariableBorrowRate;

  /// Slope of the variable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray
  uint256 internal immutable _variableRateSlope1;

  /// Slope of the variable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray
  uint256 internal immutable _variableRateSlope2;

  /// Slope of the stable interest curve when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE. Expressed in ray
  uint256 internal immutable _stableRateSlope1;

  /// Slope of the stable interest curve when utilization rate > OPTIMAL_UTILIZATION_RATE. Expressed in ray
  uint256 internal immutable _stableRateSlope2;

  /// Premium on top of `_variableRateSlope1` for base stable borrowing rate
  uint256 internal immutable _baseStableRateOffset;

  /// Additional premium applied to stable rate when stable debt surpass `OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO`
  uint256 internal immutable _stableRateExcessOffset;

  /**
   * @dev Constructor.
   * @param provider The address of the PoolAddressesProvider contract
   * @param optimalUtilizationRate The optimal utilization rate
   * @param baseVariableBorrowRate The base variable borrow rate
   * @param variableRateSlope1 The variable rate slope below optimal utilization rate
   * @param variableRateSlope2 The variable rate slope beyond optimal utilization rate
   * @param stableRateSlope1 The stable rate slope below optimal utilization rate
   * @param stableRateSlope2 The stable rate slope beyond optimal utilization rate
   * @param baseStableRateOffset The premium on top of variable rate for base stable borrowing rate
   * @param stableRateExcessOffset The premium on top of stable rate when there stable debt surpass the threshold
   * @param optimalStableToTotalDebtRatio The optimal stable debt to total debt ratio of the reserve
   */
  constructor(
    IPoolAddressesProvider provider,
    uint256 optimalUtilizationRate,
    uint256 baseVariableBorrowRate,
    uint256 variableRateSlope1,
    uint256 variableRateSlope2,
    uint256 stableRateSlope1,
    uint256 stableRateSlope2,
    uint256 baseStableRateOffset,
    uint256 stableRateExcessOffset,
    uint256 optimalStableToTotalDebtRatio
  ) {
    require(WadRayMath.RAY >= optimalUtilizationRate, Errors.INVALID_OPTIMAL_UTILIZATION_RATE);
    require(
      WadRayMath.RAY >= optimalStableToTotalDebtRatio,
      Errors.INVALID_OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO
    );
    OPTIMAL_UTILIZATION_RATE = optimalUtilizationRate;
    EXCESS_UTILIZATION_RATE = WadRayMath.RAY - optimalUtilizationRate;
    OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO = optimalStableToTotalDebtRatio;
    ADDRESSES_PROVIDER = provider;
    _baseVariableBorrowRate = baseVariableBorrowRate;
    _variableRateSlope1 = variableRateSlope1;
    _variableRateSlope2 = variableRateSlope2;
    _stableRateSlope1 = stableRateSlope1;
    _stableRateSlope2 = stableRateSlope2;
    _baseStableRateOffset = baseStableRateOffset;
    _stableRateExcessOffset = stableRateExcessOffset;
  }

  /**
   * @notice Returns the variable rate slope below optimal utilization rate
   * @dev Its the variable rate when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE
   * @return The variable rate slope
   **/
  function getVariableRateSlope1() external view returns (uint256) {
    return _variableRateSlope1;
  }

  /**
   * @notice Returns the variable rate slope beyond optimal utilization rate
   * @dev Its the variable rate when utilization rate > OPTIMAL_UTILIZATION_RATE
   * @return The variable rate slope
   **/
  function getVariableRateSlope2() external view returns (uint256) {
    return _variableRateSlope2;
  }

  /**
   * @notice Returns the stable rate slope below optimal utilization rate
   * @dev Its the stable rate when utilization rate > 0 and <= OPTIMAL_UTILIZATION_RATE
   * @return The stable rate slope
   **/
  function getStableRateSlope1() external view returns (uint256) {
    return _stableRateSlope1;
  }

  /**
   * @notice Returns the stable rate slope beyond optimal utilization rate
   * @dev Its the variable rate when utilization rate > OPTIMAL_UTILIZATION_RATE
   * @return The stable rate slope
   **/
  function getStableRateSlope2() external view returns (uint256) {
    return _stableRateSlope2;
  }

  /**
   * @notice Returns the base stable borrow rate
   * @return The base stable borrow rate
   **/
  function getBaseStableBorrowRate() public view returns (uint256) {
    return _variableRateSlope1 + _baseStableRateOffset;
  }

  /// @inheritdoc IReserveInterestRateStrategy
  function getBaseVariableBorrowRate() external view override returns (uint256) {
    return _baseVariableBorrowRate;
  }

  /// @inheritdoc IReserveInterestRateStrategy
  function getMaxVariableBorrowRate() external view override returns (uint256) {
    return _baseVariableBorrowRate + _variableRateSlope1 + _variableRateSlope2;
  }

  struct CalcInterestRatesLocalVars {
    uint256 availableLiquidity;
    uint256 totalDebt;
    uint256 currentVariableBorrowRate;
    uint256 currentStableBorrowRate;
    uint256 currentLiquidityRate;
    uint256 borrowUtilizationRate;
    uint256 supplyUtilizationRate;
    uint256 stableToTotalDebtRatio;
  }

  /// @inheritdoc IReserveInterestRateStrategy
  function calculateInterestRates(DataTypes.CalculateInterestRatesParams calldata params)
    external
    view
    override
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    CalcInterestRatesLocalVars memory vars;

    vars.availableLiquidity =
      IERC20(params.reserve).balanceOf(params.aToken) +
      params.liquidityAdded -
      params.liquidityTaken;

    vars.totalDebt = params.totalStableDebt + params.totalVariableDebt;

    vars.stableToTotalDebtRatio = vars.totalDebt > 0
      ? params.totalStableDebt.rayDiv(vars.totalDebt)
      : 0;

    vars.currentLiquidityRate = 0;
    vars.currentVariableBorrowRate = _baseVariableBorrowRate;
    vars.currentStableBorrowRate = getBaseStableBorrowRate();

    vars.borrowUtilizationRate = vars.totalDebt == 0
      ? 0
      : vars.totalDebt.rayDiv(vars.availableLiquidity + vars.totalDebt);

    vars.supplyUtilizationRate = vars.totalDebt == 0
      ? 0
      : vars.totalDebt.rayDiv(vars.availableLiquidity + params.unbacked + vars.totalDebt);

    if (vars.borrowUtilizationRate > OPTIMAL_UTILIZATION_RATE) {
      uint256 excessUtilizationRateRatio = (vars.borrowUtilizationRate - OPTIMAL_UTILIZATION_RATE)
        .rayDiv(EXCESS_UTILIZATION_RATE);

      vars.currentStableBorrowRate +=
        _stableRateSlope1 +
        _stableRateSlope2.rayMul(excessUtilizationRateRatio);

      vars.currentVariableBorrowRate +=
        _variableRateSlope1 +
        _variableRateSlope2.rayMul(excessUtilizationRateRatio);
    } else {
      vars.currentStableBorrowRate += _stableRateSlope1.rayMul(vars.borrowUtilizationRate).rayDiv(
        OPTIMAL_UTILIZATION_RATE
      );

      vars.currentVariableBorrowRate += _variableRateSlope1
        .rayMul(vars.borrowUtilizationRate)
        .rayDiv(OPTIMAL_UTILIZATION_RATE);
    }

    if (vars.stableToTotalDebtRatio > OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO) {
      uint256 excessRatio = (vars.stableToTotalDebtRatio - OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO)
        .rayDiv(WadRayMath.RAY - OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO);
      vars.currentStableBorrowRate += _stableRateExcessOffset.rayMul(excessRatio);
    }

    vars.currentLiquidityRate = _getOverallBorrowRate(
      params.totalStableDebt,
      params.totalVariableDebt,
      vars.currentVariableBorrowRate,
      params.averageStableBorrowRate
    ).rayMul(vars.supplyUtilizationRate).percentMul(
        PercentageMath.PERCENTAGE_FACTOR - params.reserveFactor
      );

    return (
      vars.currentLiquidityRate,
      vars.currentStableBorrowRate,
      vars.currentVariableBorrowRate
    );
  }

  /**
   * @dev Calculates the overall borrow rate as the weighted average between the total variable debt and total stable debt
   * @param totalStableDebt The total borrowed from the reserve at a stable rate
   * @param totalVariableDebt The total borrowed from the reserve at a variable rate
   * @param currentVariableBorrowRate The current variable borrow rate of the reserve
   * @param currentAverageStableBorrowRate The current weighted average of all the stable rate loans
   * @return The weighted averaged borrow rate
   **/
  function _getOverallBorrowRate(
    uint256 totalStableDebt,
    uint256 totalVariableDebt,
    uint256 currentVariableBorrowRate,
    uint256 currentAverageStableBorrowRate
  ) internal pure returns (uint256) {
    uint256 totalDebt = totalStableDebt + totalVariableDebt;

    if (totalDebt == 0) return 0;

    uint256 weightedVariableRate = totalVariableDebt.wadToRay().rayMul(currentVariableBorrowRate);

    uint256 weightedStableRate = totalStableDebt.wadToRay().rayMul(currentAverageStableBorrowRate);

    uint256 overallBorrowRate = (weightedVariableRate + weightedStableRate).rayDiv(
      totalDebt.wadToRay()
    );

    return overallBorrowRate;
  }
}
