// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {Errors} from '../helpers/Errors.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';

/**
 * @title BorrowLogic library
 * @author Aave
 * @notice Implements the base logic for all the actions related to borrowing
 */
library BorrowLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using SafeERC20 for IERC20;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  // See `IPool` for descriptions
  event Borrow(
    address indexed reserve,
    address user,
    address indexed onBehalfOf,
    uint256 amount,
    uint256 borrowRateMode,
    uint256 borrowRate,
    uint16 indexed referral
  );
  event Repay(
    address indexed reserve,
    address indexed user,
    address indexed repayer,
    uint256 amount
  );

  event RebalanceStableBorrowRate(address indexed reserve, address indexed user);
  event Swap(address indexed reserve, address indexed user, uint256 rateMode);

  function executeBorrow(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteBorrowParams memory params
  ) public {
    DataTypes.ReserveData storage reserve = reserves[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    (
      bool isolationModeActive,
      address isolationModeCollateralAddress,
      uint256 isolationModeDebtCeiling
    ) = userConfig.getIsolationModeState(reserves, reservesList);

    ValidationLogic.validateBorrow(
      reserves,
      reservesList,
      eModeCategories,
      DataTypes.ValidateBorrowParams(
        reserveCache,
        userConfig,
        params.asset,
        params.onBehalfOf,
        params.amount,
        params.interestRateMode,
        params.maxStableRateBorrowSizePercent,
        params.reservesCount,
        params.oracle,
        params.userEModeCategory,
        params.priceOracleSentinel,
        isolationModeActive,
        isolationModeCollateralAddress,
        isolationModeDebtCeiling
      )
    );

    uint256 currentStableRate = 0;
    bool isFirstBorrowing = false;

    if (DataTypes.InterestRateMode(params.interestRateMode) == DataTypes.InterestRateMode.STABLE) {
      currentStableRate = reserve.currentStableBorrowRate;

      (
        isFirstBorrowing,
        reserveCache.nextTotalStableDebt,
        reserveCache.nextAvgStableBorrowRate
      ) = IStableDebtToken(reserveCache.stableDebtTokenAddress).mint(
        params.user,
        params.onBehalfOf,
        params.amount,
        currentStableRate
      );
    } else {
      (isFirstBorrowing, reserveCache.nextScaledVariableDebt) = IVariableDebtToken(
        reserveCache.variableDebtTokenAddress
      ).mint(params.user, params.onBehalfOf, params.amount, reserveCache.nextVariableBorrowIndex);
    }

    if (isFirstBorrowing) {
      userConfig.setBorrowing(reserve.id, true);
    }

    if (isolationModeActive) {
      reserves[isolationModeCollateralAddress].isolationModeTotalDebt += Helpers.castUint128(
        params.amount /
          10 **
            (reserveCache.reserveConfiguration.getDecimals() -
              ReserveConfiguration.DEBT_CEILING_DECIMALS)
      );
    }

    reserve.updateInterestRates(
      reserveCache,
      params.asset,
      0,
      params.releaseUnderlying ? params.amount : 0
    );

    if (params.releaseUnderlying) {
      IAToken(reserveCache.aTokenAddress).transferUnderlyingTo(params.user, params.amount);
    }

    emit Borrow(
      params.asset,
      params.user,
      params.onBehalfOf,
      params.amount,
      params.interestRateMode,
      DataTypes.InterestRateMode(params.interestRateMode) == DataTypes.InterestRateMode.STABLE
        ? currentStableRate
        : reserve.currentVariableBorrowRate,
      params.referralCode
    );
  }

  function executeRepay(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteRepayParams memory params
  ) external returns (uint256) {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);

    DataTypes.InterestRateMode interestRateMode = DataTypes.InterestRateMode(params.rateMode);
    (uint256 stableDebt, uint256 variableDebt) = Helpers.getUserCurrentDebt(
      params.onBehalfOf,
      reserve
    );

    ValidationLogic.validateRepay(
      reserveCache,
      params.amount,
      interestRateMode,
      params.onBehalfOf,
      stableDebt,
      variableDebt
    );

    uint256 paybackAmount = interestRateMode == DataTypes.InterestRateMode.STABLE
      ? stableDebt
      : variableDebt;

    if (params.amount < paybackAmount) {
      paybackAmount = params.amount;
    }

    if (interestRateMode == DataTypes.InterestRateMode.STABLE) {
      (reserveCache.nextTotalStableDebt, reserveCache.nextAvgStableBorrowRate) = IStableDebtToken(
        reserveCache.stableDebtTokenAddress
      ).burn(params.onBehalfOf, paybackAmount);
    } else {
      reserveCache.nextScaledVariableDebt = IVariableDebtToken(
        reserveCache.variableDebtTokenAddress
      ).burn(params.onBehalfOf, paybackAmount, reserveCache.nextVariableBorrowIndex);
    }

    reserve.updateInterestRates(reserveCache, params.asset, paybackAmount, 0);

    if (stableDebt + variableDebt - paybackAmount == 0) {
      userConfig.setBorrowing(reserve.id, false);
    }

    (bool isolationModeActive, address isolationModeCollateralAddress, ) = userConfig
      .getIsolationModeState(reserves, reservesList);

    if (isolationModeActive) {
      uint128 isolationModeTotalDebt = reserves[isolationModeCollateralAddress]
        .isolationModeTotalDebt;

      uint128 isolatedDebtRepaid = Helpers.castUint128(
        paybackAmount /
          10 **
            (reserveCache.reserveConfiguration.getDecimals() -
              ReserveConfiguration.DEBT_CEILING_DECIMALS)
      );

      // since the debt ceiling does not take into account the interest accrued, it might happen that amount repaid > debt in isolation mode
      if (isolationModeTotalDebt <= isolatedDebtRepaid) {
        reserves[isolationModeCollateralAddress].isolationModeTotalDebt = 0;
      } else {
        reserves[isolationModeCollateralAddress].isolationModeTotalDebt =
          isolationModeTotalDebt -
          isolatedDebtRepaid;
      }
    }

    if (params.useATokens) {
      IAToken(reserveCache.aTokenAddress).burn(
        msg.sender,
        reserveCache.aTokenAddress,
        paybackAmount,
        reserveCache.nextLiquidityIndex
      );
    } else {
      IERC20(params.asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, paybackAmount);
      IAToken(reserveCache.aTokenAddress).handleRepayment(msg.sender, paybackAmount);
    }

    emit Repay(params.asset, params.onBehalfOf, msg.sender, paybackAmount);

    return paybackAmount;
  }

  function rebalanceStableBorrowRate(
    DataTypes.ReserveData storage reserve,
    address asset,
    address user
  ) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);

    IERC20 stableDebtToken = IERC20(reserveCache.stableDebtTokenAddress);
    IERC20 variableDebtToken = IERC20(reserveCache.variableDebtTokenAddress);
    uint256 stableDebt = IERC20(stableDebtToken).balanceOf(user);

    ValidationLogic.validateRebalanceStableBorrowRate(
      reserve,
      reserveCache,
      asset,
      stableDebtToken,
      variableDebtToken,
      reserveCache.aTokenAddress
    );

    IStableDebtToken(address(stableDebtToken)).burn(user, stableDebt);

    (, reserveCache.nextTotalStableDebt, reserveCache.nextAvgStableBorrowRate) = IStableDebtToken(
      address(stableDebtToken)
    ).mint(user, user, stableDebt, reserve.currentStableBorrowRate);

    reserve.updateInterestRates(reserveCache, asset, 0, 0);

    emit RebalanceStableBorrowRate(asset, user);
  }

  function swapBorrowRateMode(
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    address asset,
    uint256 rateMode
  ) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    (uint256 stableDebt, uint256 variableDebt) = Helpers.getUserCurrentDebt(msg.sender, reserve);

    DataTypes.InterestRateMode interestRateMode = DataTypes.InterestRateMode(rateMode);

    ValidationLogic.validateSwapRateMode(
      reserve,
      reserveCache,
      userConfig,
      stableDebt,
      variableDebt,
      interestRateMode
    );

    if (interestRateMode == DataTypes.InterestRateMode.STABLE) {
      (reserveCache.nextTotalStableDebt, reserveCache.nextAvgStableBorrowRate) = IStableDebtToken(
        reserveCache.stableDebtTokenAddress
      ).burn(msg.sender, stableDebt);

      (, reserveCache.nextScaledVariableDebt) = IVariableDebtToken(
        reserveCache.variableDebtTokenAddress
      ).mint(msg.sender, msg.sender, stableDebt, reserveCache.nextVariableBorrowIndex);
    } else {
      reserveCache.nextScaledVariableDebt = IVariableDebtToken(
        reserveCache.variableDebtTokenAddress
      ).burn(msg.sender, variableDebt, reserveCache.nextVariableBorrowIndex);

      (, reserveCache.nextTotalStableDebt, reserveCache.nextAvgStableBorrowRate) = IStableDebtToken(
        reserveCache.stableDebtTokenAddress
      ).mint(msg.sender, msg.sender, variableDebt, reserve.currentStableBorrowRate);
    }

    reserve.updateInterestRates(reserveCache, asset, 0, 0);

    emit Swap(asset, msg.sender, rateMode);
  }
}
