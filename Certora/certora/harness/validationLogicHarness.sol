pragma solidity 0.8.10;

import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {Address} from '../../../dependencies/openzeppelin/contracts/Address.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IReserveInterestRateStrategy} from '../../../interfaces/IReserveInterestRateStrategy.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IScaledBalanceToken} from '../../../interfaces/IScaledBalanceToken.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {IPriceOracleSentinel} from '../../../interfaces/IPriceOracleSentinel.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {GenericLogic} from './GenericLogic.sol';

contract ValidationLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using Address for address;


  uint256 public constant REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD = 4000;
  uint256 public constant REBALANCE_UP_USAGE_RATIO_THRESHOLD = 0.95 * 1e27; //usage ratio of 95%
  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95 * 1e18;
  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;


  function wrapperSupply(
    uint256 currScaledVariableDebt,
    uint256 nextScaledVariableDebt,
    uint256 currPrincipalStableDebt,
    uint256 currAvgStableBorrowRate,
    uint256 currTotalStableDebt,
    uint256 nextAvgStableBorrowRate,
    uint256 nextTotalStableDebt,
    uint256 currLiquidityIndex,
    uint256 nextLiquidityIndex,
    uint256 currVariableBorrowIndex,
    uint256 nextVariableBorrowIndex,
    uint256 currLiquidityRate,
    uint256 currVariableBorrowRate,
    uint256 reserveFactor,
    uint256 data,
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    uint40 reserveLastUpdateTimestamp;
    uint40 stableDebtLastUpdateTimestamp;
  }) public {

      DataTypes.reserveConfiguration reserveConfiguration;
      reserveConfiguration.data=data;
      
      DataTypes.ReserveCache reserveCache;
      struct ReserveCache {
    uint256 currScaledVariableDebt;
    uint256 nextScaledVariableDebt;
    uint256 currPrincipalStableDebt;
    uint256 currAvgStableBorrowRate;
    uint256 currTotalStableDebt;
    uint256 nextAvgStableBorrowRate;
    uint256 nextTotalStableDebt;
    uint256 currLiquidityIndex;
    uint256 nextLiquidityIndex;
    uint256 currVariableBorrowIndex;
    uint256 nextVariableBorrowIndex;
    uint256 currLiquidityRate;
    uint256 currVariableBorrowRate;
    uint256 reserveFactor;
    DataTypes.ReserveConfigurationMap reserveConfiguration;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    uint40 reserveLastUpdateTimestamp;
    uint40 stableDebtLastUpdateTimestamp;
  }



  }
  function validateSupply(DataTypes.ReserveCache memory reserveCache, uint256 amount)
    internal
    view
  {
    (bool isActive, bool isFrozen, , , bool isPaused) = reserveCache
      .reserveConfiguration
      .getFlags();

    uint256 reserveDecimals = reserveCache.reserveConfiguration.getDecimals();
    uint256 supplyCap = reserveCache.reserveConfiguration.getSupplyCap();

    require(amount != 0, Errors.VL_INVALID_AMOUNT);
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);
    require(!isFrozen, Errors.VL_RESERVE_FROZEN);
    require(
      supplyCap == 0 ||
        (IAToken(reserveCache.aTokenAddress).scaledTotalSupply().rayMul(
          reserveCache.nextLiquidityIndex
        ) + amount) /
          (10**reserveDecimals) <
        supplyCap,
      Errors.VL_SUPPLY_CAP_EXCEEDED
    );
  }