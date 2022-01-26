// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../../contracts/dependencies/openzeppelin/contracts/IERC20.sol';
import {IScaledBalanceToken} from '../../contracts/interfaces/IScaledBalanceToken.sol';
import {IPriceOracleGetter} from '../../contracts/interfaces/IPriceOracleGetter.sol';
import {ReserveConfiguration} from '../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../../contracts/protocol/libraries/configuration/UserConfiguration.sol';
import {PercentageMath} from '../../contracts/protocol/libraries/math/PercentageMath.sol';
import {WadRayMath} from '../../contracts/protocol/libraries/math/WadRayMath.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveLogic} from '../../contracts/protocol/libraries/logic/ReserveLogic.sol';

/**
 * @title GenericLogic library
 * @author Aave
 * @notice Implements protocol-level logic to calculate and validate the state of a user
 */
contract GenericLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  mapping(address => DataTypes.ReserveData) public reservesData;
  mapping(uint256 => address) public reserves;
  mapping(uint8 => DataTypes.EModeCategory) public eModeCategories;
  //DataTypes.CalculateUserAccountDataParams public params;
  DataTypes.UserConfigurationMap public userConfig;
  uint256 public reservesCount;
  address public user;
  address public oracle;
  uint8 public userEModeCategory;

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
    uint256 eModeAssetPrice;
    uint256 eModeLtv;
    uint256 eModeLiqThreshold;
    uint256 eModeAssetCategory;
    address eModePriceSource;
    address currentReserveAddress;
    bool hasZeroLtvCollateral;
  }

  /**
   * @notice Calculates the user data across the reserves.
   * @dev It includes the total liquidity/collateral/borrow balances in the base currency used by the price feed,
   * the average Loan To Value, the average Liquidation Ratio, and the Health factor.
   * @return The total collateral of the user in the base currency used by the price feed
   * @return The total debt of the user in the base currency used by the price feed
   * @return The average ltv of the user
   * @return The average liquidation threshold of the user
   * @return The health factor of the user
   * @return True if the ltv is zero, false otherwise
   **/
  function calculateUserAccountData()
    public
    returns (
      uint256,
      uint256,
      uint256,
      uint256,
      uint256,
      bool
    )
  {
    if (userConfig.isEmpty()) {
      return (0, 0, 0, 0, type(uint256).max, false);
    }

    CalculateUserAccountDataVars memory vars;

    if (userEModeCategory != 0) {
      vars.eModePriceSource = eModeCategories[userEModeCategory].priceSource;
      vars.eModeLtv = eModeCategories[userEModeCategory].ltv;
      vars.eModeLiqThreshold = eModeCategories[userEModeCategory].liquidationThreshold;

      if (vars.eModePriceSource != address(0)) {
        vars.eModeAssetPrice = IPriceOracleGetter(oracle).getAssetPrice(
          vars.eModePriceSource
        );
      }
    }

    while (vars.i < reservesCount) {
      if (!userConfig.isUsingAsCollateralOrBorrowing(vars.i)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      vars.currentReserveAddress = reserves[vars.i];

      if (vars.currentReserveAddress == address(0)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      DataTypes.ReserveData storage currentReserve = reservesData[vars.currentReserveAddress];

      (
        vars.ltv,
        vars.liquidationThreshold,
        ,
        vars.decimals,
        ,
        vars.eModeAssetCategory
      ) = currentReserve.configuration.getParams();

      unchecked {
        vars.assetUnit = 10**vars.decimals;
      }
      vars.assetPrice = vars.eModeAssetPrice > 0
        ? vars.eModeAssetPrice
        : IPriceOracleGetter(oracle).getAssetPrice(vars.currentReserveAddress);

      if (vars.liquidationThreshold != 0 && userConfig.isUsingAsCollateral(vars.i)) {
        vars.normalizedIncome = currentReserve.getNormalizedIncome();
        vars.userBalance = IScaledBalanceToken(currentReserve.aTokenAddress).scaledBalanceOf(
          user
        );
        vars.userBalance = vars.userBalance.rayMul(vars.normalizedIncome);

        vars.userBalanceInBaseCurrency = (vars.assetPrice * vars.userBalance);
        unchecked {
          vars.userBalanceInBaseCurrency /= vars.assetUnit;
        }
        vars.totalCollateralInBaseCurrency =
          vars.totalCollateralInBaseCurrency +
          vars.userBalanceInBaseCurrency;

        vars.hasZeroLtvCollateral = vars.hasZeroLtvCollateral || vars.ltv == 0;

        vars.avgLtv = vars.ltv > 0
          ? vars.avgLtv +
            vars.userBalanceInBaseCurrency *
            (
              (userEModeCategory == 0 || vars.eModeAssetCategory != userEModeCategory)
                ? vars.ltv
                : vars.eModeLtv
            )
          : vars.avgLtv;

        vars.avgLiquidationThreshold =
          vars.avgLiquidationThreshold +
          vars.userBalanceInBaseCurrency *
          (
            (userEModeCategory == 0 || vars.eModeAssetCategory != userEModeCategory)
              ? vars.liquidationThreshold
              : vars.eModeLiqThreshold
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
        vars.userDebt = vars.userDebt + vars.userStableDebt;
        vars.userDebtInBaseCurrency = (vars.assetPrice * vars.userDebt);
        unchecked {
          vars.userDebtInBaseCurrency /= vars.assetUnit;
        }
        vars.totalDebtInBaseCurrency = vars.totalDebtInBaseCurrency + vars.userDebtInBaseCurrency;
      }

      unchecked {
        ++vars.i;
      }
    }

    unchecked {
      vars.avgLtv = vars.totalCollateralInBaseCurrency > 0
        ? vars.avgLtv / vars.totalCollateralInBaseCurrency
        : 0;
      vars.avgLiquidationThreshold = vars.totalCollateralInBaseCurrency > 0
        ? vars.avgLiquidationThreshold / vars.totalCollateralInBaseCurrency
        : 0;
    }

    vars.healthFactor = (vars.totalDebtInBaseCurrency == 0)
      ? type(uint256).max
      : (vars.totalCollateralInBaseCurrency.percentMul(vars.avgLiquidationThreshold)).wadDiv(
        vars.totalDebtInBaseCurrency
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
   * @notice Calculates the maximum amount that can be borrowed depending on the available collateral, the total debt and the
   * average Loan To Value
   * @param totalCollateralInBaseCurrency The total collateral in the base currency used by the price feed
   * @param totalDebtInBaseCurrency The total borrow balance in the base currency used by the price feed
   * @param ltv The average loan to value
   * @return The amount available to borrow in the base currency of the used by the price feed
   **/
  function calculateAvailableBorrows(
    uint256 totalCollateralInBaseCurrency,
    uint256 totalDebtInBaseCurrency,
    uint256 ltv
  ) public pure returns (uint256) {
    uint256 availableBorrowsInBaseCurrency = totalCollateralInBaseCurrency.percentMul(ltv);

    if (availableBorrowsInBaseCurrency < totalDebtInBaseCurrency) {
      return 0;
    }

    availableBorrowsInBaseCurrency = availableBorrowsInBaseCurrency - totalDebtInBaseCurrency;
    return availableBorrowsInBaseCurrency;
  }
}
