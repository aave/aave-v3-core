// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {SafeMath} from '../../../dependencies/openzeppelin/contracts/SafeMath.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IScaledBalanceToken} from '../../../interfaces/IScaledBalanceToken.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title GenericLogic library
 * @author Aave
 * @title Implements protocol-level logic to calculate and validate the state of a user
 */
library GenericLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using SafeMath for uint256;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1 ether;

  struct CalculateUserAccountDataVars {
    uint256 assetPrice;
    uint256 assetUnit;
    uint256 userBalance;
    uint256 userBalanceInBaseCurrency;
    uint256 userDebt;
    uint256 userStableDebt;
    uint256 userDebtInBaseCurrency;
    uint256 decimals;
    uint256 ltv;
    uint256 liquidationThreshold;
    uint256 i;
    uint256 healthFactor;
    uint256 totalCollateralInBaseCurrency;
    uint256 totalDebtInBaseCurrency;
    uint256 avgLtv;
    uint256 avgLiquidationThreshold;
    uint256 normalizedIncome;
    uint256 normalizedDebt;
    address currentReserveAddress;
    bool hasZeroLtvCollateral;
  }

  /**
   * @dev Calculates the user data across the reserves.
   * this includes the total liquidity/collateral/borrow balances in the base currency used by the price feed,
   * the average Loan To Value, the average Liquidation Ratio, and the Health factor.
   * @param user The address of the user
   * @param reservesData Data of all the reserves
   * @param userConfig The configuration of the user
   * @param reserves The list of the available reserves
   * @param oracle The price oracle address
   * @return The total collateral and total debt of the user in the base currency used by the price feed,
   *         the avg ltv, liquidation threshold, the HF and the uncapped avg ltv
   **/
  function calculateUserAccountData(
    address user,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap memory userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  )
    internal
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256,
      uint256,
      bool
    )
  {
    CalculateUserAccountDataVars memory vars;

    if (userConfig.isEmpty()) {
      return (0, 0, 0, 0, type(uint256).max, false);
    }
    for (vars.i = 0; vars.i < reservesCount; vars.i++) {
      if (!userConfig.isUsingAsCollateralOrBorrowing(vars.i)) {
        continue;
      }

      vars.currentReserveAddress = reserves[vars.i];

      if (vars.currentReserveAddress == address(0)) continue;

      DataTypes.ReserveData storage currentReserve = reservesData[vars.currentReserveAddress];

      (vars.ltv, vars.liquidationThreshold, , vars.decimals, ) = currentReserve
        .configuration
        .getParams();

      vars.assetUnit = 10**vars.decimals;
      vars.assetPrice = IPriceOracleGetter(oracle).getAssetPrice(vars.currentReserveAddress);

      if (vars.liquidationThreshold != 0 && userConfig.isUsingAsCollateral(vars.i)) {
        vars.normalizedIncome = currentReserve.getNormalizedIncome();
        vars.userBalance = IScaledBalanceToken(currentReserve.aTokenAddress).scaledBalanceOf(user);
        vars.userBalance = vars.userBalance.rayMul(vars.normalizedIncome);

        vars.userBalanceInBaseCurrency = vars.assetPrice.mul(vars.userBalance).div(vars.assetUnit);
        vars.totalCollateralInBaseCurrency = vars.totalCollateralInBaseCurrency.add(
          vars.userBalanceInBaseCurrency
        );

        vars.avgLtv = vars.avgLtv.add(vars.userBalanceInBaseCurrency.mul(vars.ltv));
        vars.hasZeroLtvCollateral = vars.hasZeroLtvCollateral || vars.ltv == 0;

        vars.avgLiquidationThreshold = vars.avgLiquidationThreshold.add(
          vars.userBalanceInBaseCurrency.mul(vars.liquidationThreshold)
        );
      }

      if (userConfig.isBorrowing(vars.i)) {
        vars.userStableDebt = IERC20(currentReserve.stableDebtTokenAddress).balanceOf(user);
        vars.userDebt = IScaledBalanceToken(currentReserve.variableDebtTokenAddress)
          .scaledBalanceOf(user);

        if (vars.userDebt > 0) {
          vars.normalizedDebt = currentReserve.getNormalizedDebt();
          vars.userDebt = vars.userDebt.rayMul(vars.normalizedDebt);
        }
        vars.userDebt = vars.userDebt.add(vars.userStableDebt);
        vars.userDebtInBaseCurrency = vars.assetPrice.mul(vars.userDebt).div(vars.assetUnit);
        vars.totalDebtInBaseCurrency = vars.totalDebtInBaseCurrency.add(
          vars.userDebtInBaseCurrency
        );
      }
    }

    vars.avgLtv = vars.totalCollateralInBaseCurrency > 0
      ? vars.avgLtv.div(vars.totalCollateralInBaseCurrency)
      : 0;
    vars.avgLiquidationThreshold = vars.totalCollateralInBaseCurrency > 0
      ? vars.avgLiquidationThreshold.div(vars.totalCollateralInBaseCurrency)
      : 0;

    vars.healthFactor = calculateHealthFactorFromBalances(
      vars.totalCollateralInBaseCurrency,
      vars.totalDebtInBaseCurrency,
      vars.avgLiquidationThreshold
    );
    return (
      vars.totalCollateralInBaseCurrency,
      vars.totalDebtInBaseCurrency,
      vars.avgLtv,
      vars.avgLiquidationThreshold,
      vars.healthFactor,
      vars.hasZeroLtvCollateral
    );
  }

  /**
   * @dev Calculates the health factor from the corresponding balances
   * @param totalCollateralInBaseCurrency The total collateral in the base currency used by the price feed
   * @param totalDebtInBaseCurrency The total debt in the base currency used by the price feed
   * @param liquidationThreshold The avg liquidation threshold
   * @return The health factor calculated from the balances provided
   **/
  function calculateHealthFactorFromBalances(
    uint256 totalCollateralInBaseCurrency,
    uint256 totalDebtInBaseCurrency,
    uint256 liquidationThreshold
  ) internal pure returns (uint256) {
    if (totalDebtInBaseCurrency == 0) return type(uint256).max;

    return
      (totalCollateralInBaseCurrency.percentMul(liquidationThreshold)).wadDiv(
        totalDebtInBaseCurrency
      );
  }

  /**
   * @dev Calculates the maximum amount that can be borrowed depending on the available collateral, the total debt and the
   * average Loan To Value
   * @param totalCollateralInBaseCurrency The total collateral in the base currency used by the price feed
   * @param totalDebtInBaseCurrency The total borrow balance in the base currency used by the price feed
   * @param ltv The average loan to value
   * @return the amount available to borrow in the base currency of the used by the price feed
   **/

  function calculateAvailableBorrows(
    uint256 totalCollateralInBaseCurrency,
    uint256 totalDebtInBaseCurrency,
    uint256 ltv
  ) internal pure returns (uint256) {
    uint256 availableBorrowsInBaseCurrency = totalCollateralInBaseCurrency.percentMul(ltv);

    if (availableBorrowsInBaseCurrency < totalDebtInBaseCurrency) {
      return 0;
    }

    availableBorrowsInBaseCurrency = availableBorrowsInBaseCurrency.sub(totalDebtInBaseCurrency);
    return availableBorrowsInBaseCurrency;
  }

  /**
   * @dev proxy call for calculateUserAccountData as external function.
   * Used in LendingPool to work around contract size limit issues
   * @param user The address of the user
   * @param reservesData Data of all the reserves
   * @param userConfig The configuration of the user
   * @param reserves The list of the available reserves
   * @param oracle The price oracle address
   * @return The total collateral and total debt of the user in ETH, the avg ltv, liquidation threshold and the HF
   **/
  function getUserAccountData(
    address user,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap memory userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  )
    external
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256,
      uint256,
      bool
    )
  {
    return
      calculateUserAccountData(user, reservesData, userConfig, reserves, reservesCount, oracle);
  }
}
