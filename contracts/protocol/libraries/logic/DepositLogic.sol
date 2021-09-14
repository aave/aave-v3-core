// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IFlashLoanReceiver} from '../../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {Errors} from '../helpers/Errors.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';

/**
 * @title DepositLogic library
 * @author Aave
 * @notice Implements the base logic for deposit/withdraw
 */
library DepositLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using SafeERC20 for IERC20;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  // See `IPool` for descriptions
  event ReserveUsedAsCollateralEnabled(address indexed reserve, address indexed user);
  event ReserveUsedAsCollateralDisabled(address indexed reserve, address indexed user);
  event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount);
  event Deposit(
    address indexed reserve,
    address user,
    address indexed onBehalfOf,
    uint256 amount,
    uint16 indexed referral
  );

  function executeDeposit(
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    uint256 userEModeCategoryId,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) internal {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    ValidationLogic.validateDeposit(reserveCache, amount);

    reserve.updateInterestRates(reserveCache, asset, amount, 0);

    IERC20(asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, amount);

    bool isFirstDeposit =
      IAToken(reserveCache.aTokenAddress).mint(onBehalfOf, amount, reserveCache.nextLiquidityIndex);

    uint256 assetCategoryId = reserveCache.reserveConfiguration.getEModeCategoryMemory();

    if (isFirstDeposit && (assetCategoryId == userEModeCategoryId || userEModeCategoryId == 0)) {
      userConfig.setUsingAsCollateral(reserve.id, true);
      emit ReserveUsedAsCollateralEnabled(asset, onBehalfOf);
    }

    emit Deposit(asset, msg.sender, onBehalfOf, amount, referralCode);
  }

  function executeWithdraw(
    mapping(address => DataTypes.ReserveData) storage reserves,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reservesList,
    DataTypes.ExecuteWithdrawParams memory vars
  ) internal returns (uint256) {
    DataTypes.ReserveData storage reserve = reserves[vars.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    uint256 userBalance =
      IAToken(reserveCache.aTokenAddress).scaledBalanceOf(msg.sender).rayMul(
        reserveCache.nextLiquidityIndex
      );

    uint256 amountToWithdraw = vars.amount;

    if (vars.amount == type(uint256).max) {
      amountToWithdraw = userBalance;
    }

    ValidationLogic.validateWithdraw(reserveCache, amountToWithdraw, userBalance);

    reserve.updateInterestRates(reserveCache, vars.asset, 0, amountToWithdraw);

    IAToken(reserveCache.aTokenAddress).burn(
      msg.sender,
      vars.to,
      amountToWithdraw,
      reserveCache.nextLiquidityIndex
    );

    if (userConfig.isUsingAsCollateral(reserve.id)) {
      if (userConfig.isBorrowingAny()) {
        ValidationLogic.validateHFAndLtv(
          vars.asset,
          msg.sender,
          reserves,
          userConfig,
          reservesList,
          vars.reservesCount,
          vars.oracle
        );
      }

      if (amountToWithdraw == userBalance) {
        userConfig.setUsingAsCollateral(reserve.id, false);
        emit ReserveUsedAsCollateralDisabled(vars.asset, msg.sender);
      }
    }

    emit Withdraw(vars.asset, msg.sender, vars.to, amountToWithdraw);

    return amountToWithdraw;
  }

  function finalizeTransfer(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,
    DataTypes.FinalizeTransferParams memory vars
  ) external {
    ValidationLogic.validateTransfer(reserves[vars.asset]);

    uint256 reserveId = reserves[vars.asset].id;

    if (vars.from != vars.to) {
      DataTypes.UserConfigurationMap storage fromConfig = usersConfig[vars.from];

      if (fromConfig.isUsingAsCollateral(reserveId)) {
        if (fromConfig.isBorrowingAny()) {
          ValidationLogic.validateHFAndLtv(
            vars.asset,
            vars.from,
            reserves,
            usersConfig[vars.from],
            reservesList,
            vars.reservesCount,
            vars.oracle
          );
        }
        if (vars.balanceFromBefore - vars.amount == 0) {
          fromConfig.setUsingAsCollateral(reserveId, false);
          emit ReserveUsedAsCollateralDisabled(vars.asset, vars.from);
        }
      }

      if (vars.balanceToBefore == 0 && vars.amount != 0) {
        DataTypes.UserConfigurationMap storage toConfig = usersConfig[vars.to];
        toConfig.setUsingAsCollateral(reserveId, true);
        emit ReserveUsedAsCollateralEnabled(vars.asset, vars.to);
      }
    }
  }

  function executeUseReserveAsCollateral(
    mapping(address => DataTypes.ReserveData) storage reserves,
    DataTypes.UserConfigurationMap storage userConfig,
    uint256 userEModeCategoryId,
    address asset,
    bool useAsCollateral,
    mapping(uint256 => address) storage reservesList,
    uint256 reservesCount,
    address priceOracle
  ) external {
    DataTypes.ReserveData storage reserve = reserves[asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    uint256 userBalance = IERC20(reserveCache.aTokenAddress).balanceOf(msg.sender);

    ValidationLogic.validateSetUseReserveAsCollateral(reserveCache, userEModeCategoryId, userBalance);

    userConfig.setUsingAsCollateral(reserve.id, useAsCollateral);

    if (useAsCollateral) {
      emit ReserveUsedAsCollateralEnabled(asset, msg.sender);
    } else {
      ValidationLogic.validateHFAndLtv(
        asset,
        msg.sender,
        reserves,
        userConfig,
        reservesList,
        reservesCount,
        priceOracle
      );

      emit ReserveUsedAsCollateralDisabled(asset, msg.sender);
    }
  }
}
