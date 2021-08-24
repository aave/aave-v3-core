// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IERC20} from '../../../dependencies/openzeppelin/contracts//IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {
  VersionedInitializable
} from '../../libraries/aave-upgradeability/VersionedInitializable.sol';
import {ReserveLogic} from '../../libraries/logic/ReserveLogic.sol';
import {GenericLogic} from '../../libraries/logic/GenericLogic.sol';
import {Helpers} from '../../libraries/helpers/Helpers.sol';
import {WadRayMath} from '../../libraries/math/WadRayMath.sol';
import {PercentageMath} from '../../libraries/math/PercentageMath.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {Errors} from '../../libraries/helpers/Errors.sol';
import {ValidationLogic} from '../../libraries/logic/ValidationLogic.sol';
import {DataTypes} from '../../libraries/types/DataTypes.sol';
import {UserConfiguration} from '../../libraries/configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../../libraries/configuration/ReserveConfiguration.sol';

/**
 * @title LiquidationLogic library
 * @author Aave
 * @dev Implements actions involving management of collateral in the protocol, the main one being the liquidations
 * IMPORTANT This contract will run always via DELEGATECALL, through the Pool, so the chain of inheritance
 * is the same as the Pool, to have compatible storage layouts
 **/
library LiquidationLogic {
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using SafeERC20 for IERC20;

  event ReserveUsedAsCollateralEnabled(address indexed reserve, address indexed user);
  event ReserveUsedAsCollateralDisabled(address indexed reserve, address indexed user);
  event LiquidationCall(
    address indexed collateralAsset,
    address indexed debtAsset,
    address indexed user,
    uint256 debtToCover,
    uint256 liquidatedCollateralAmount,
    address liquidator,
    bool receiveAToken
  );

  uint256 public constant DEFAULT_LIQUIDATION_CLOSE_FACTOR = 5000;

  uint256 public constant MAX_LIQUIDATION_CLOSE_FACTOR = 10000;

  uint256 public constant CLOSE_FACTOR_HF_THRESHOLD = 0.98 * 1e18;

  address public constant AAVE_COLLECTOR_ADDRESS = 0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c;

  struct LiquidationCallLocalVars {
    uint256 userCollateralBalance;
    uint256 userStableDebt;
    uint256 userVariableDebt;
    uint256 maxLiquidatableDebt;
    uint256 actualDebtToLiquidate;
    uint256 liquidationRatio;
    uint256 maxAmountCollateralToLiquidate;
    uint256 userStableRate;
    uint256 maxCollateralToLiquidate;
    uint256 debtAmountNeeded;
    uint256 healthFactor;
    uint256 liquidatorPreviousATokenBalance;
    uint256 closeFactor;
    uint256 protocolFee;
    IAToken collateralAtoken;
    IPriceOracleGetter oracle;
    bool isCollateralEnabled;
    DataTypes.InterestRateMode borrowRateMode;
    uint256 errorCode;
    string errorMsg;
    DataTypes.ReserveCache debtReserveCache;
  }

  /**
   * @dev Function to liquidate a position if its Health Factor drops below 1
   * - The caller (liquidator) covers `debtToCover` amount of debt of the user getting liquidated, and receives
   *   a proportionally amount of the `collateralAsset` plus a bonus to cover market risk
   **/
  function executeLiquidationCall(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,
    mapping(uint256 => address) storage reservesList,
    DataTypes.ExecuteLiquidationCallParams memory params
  ) external {
    LiquidationCallLocalVars memory vars;

    DataTypes.ReserveData storage collateralReserve = reserves[params.collateralAsset];
    DataTypes.ReserveData storage debtReserve = reserves[params.debtAsset];
    DataTypes.UserConfigurationMap storage userConfig = usersConfig[params.user];
    vars.debtReserveCache = debtReserve.cache();

    (vars.userStableDebt, vars.userVariableDebt) = Helpers.getUserCurrentDebt(
      params.user,
      debtReserve
    );
    vars.oracle = IPriceOracleGetter(params.priceOracle);

    (, , , , vars.healthFactor, ) = GenericLogic.calculateUserAccountData(
      params.user,
      reserves,
      userConfig,
      reservesList,
      params.reservesCount,
      address(vars.oracle)
    );

    ValidationLogic.validateLiquidationCall(
      collateralReserve,
      vars.debtReserveCache,
      vars.userStableDebt + vars.userVariableDebt,
      userConfig,
      vars.healthFactor
    );

    vars.collateralAtoken = IAToken(collateralReserve.aTokenAddress);

    vars.userCollateralBalance = vars.collateralAtoken.balanceOf(params.user);

    vars.closeFactor = vars.healthFactor > CLOSE_FACTOR_HF_THRESHOLD
      ? DEFAULT_LIQUIDATION_CLOSE_FACTOR
      : MAX_LIQUIDATION_CLOSE_FACTOR;

    vars.maxLiquidatableDebt = (vars.userStableDebt + vars.userVariableDebt).percentMul(
      vars.closeFactor
    );

    vars.actualDebtToLiquidate = params.debtToCover > vars.maxLiquidatableDebt
      ? vars.maxLiquidatableDebt
      : params.debtToCover;

    (
      vars.maxCollateralToLiquidate,
      vars.debtAmountNeeded,
      vars.protocolFee
    ) = _calculateAvailableCollateralToLiquidate(
      collateralReserve,
      vars.debtReserveCache,
      params.collateralAsset,
      params.debtAsset,
      vars.actualDebtToLiquidate,
      vars.userCollateralBalance,
      vars.oracle
    );

    // If debtAmountNeeded < actualDebtToLiquidate, there isn't enough
    // collateral to cover the actual amount that is being liquidated, hence we liquidate
    // a smaller amount

    if (vars.debtAmountNeeded < vars.actualDebtToLiquidate) {
      vars.actualDebtToLiquidate = vars.debtAmountNeeded;
    }

    debtReserve.updateState(vars.debtReserveCache);

    if (vars.userVariableDebt >= vars.actualDebtToLiquidate) {
      IVariableDebtToken(vars.debtReserveCache.variableDebtTokenAddress).burn(
        params.user,
        vars.actualDebtToLiquidate,
        vars.debtReserveCache.nextVariableBorrowIndex
      );
      vars.debtReserveCache.refreshDebt(0, 0, 0, vars.actualDebtToLiquidate);
      debtReserve.updateInterestRates(
        vars.debtReserveCache,
        params.debtAsset,
        vars.actualDebtToLiquidate,
        0
      );
    } else {
      // If the user doesn't have variable debt, no need to try to burn variable debt tokens
      if (vars.userVariableDebt > 0) {
        IVariableDebtToken(vars.debtReserveCache.variableDebtTokenAddress).burn(
          params.user,
          vars.userVariableDebt,
          vars.debtReserveCache.nextVariableBorrowIndex
        );
      }
      IStableDebtToken(vars.debtReserveCache.stableDebtTokenAddress).burn(
        params.user,
        vars.actualDebtToLiquidate - vars.userVariableDebt
      );
      vars.debtReserveCache.refreshDebt(
        0,
        vars.actualDebtToLiquidate - vars.userVariableDebt,
        0,
        vars.userVariableDebt
      );

      debtReserve.updateInterestRates(
        vars.debtReserveCache,
        params.debtAsset,
        vars.actualDebtToLiquidate,
        0
      );
    }

    if (params.receiveAToken) {
      vars.liquidatorPreviousATokenBalance = IERC20(vars.collateralAtoken).balanceOf(msg.sender);
      vars.collateralAtoken.transferOnLiquidation(
        params.user,
        msg.sender,
        vars.maxCollateralToLiquidate - vars.protocolFee
      );

      if (vars.liquidatorPreviousATokenBalance == 0) {
        DataTypes.UserConfigurationMap storage liquidatorConfig = usersConfig[msg.sender];
        liquidatorConfig.setUsingAsCollateral(collateralReserve.id, true);
        emit ReserveUsedAsCollateralEnabled(params.collateralAsset, msg.sender);
      }
    } else {
      DataTypes.ReserveCache memory collateralReserveCache = collateralReserve.cache();
      collateralReserve.updateState(collateralReserveCache);
      collateralReserve.updateInterestRates(
        collateralReserveCache,
        params.collateralAsset,
        0,
        vars.maxCollateralToLiquidate
      );

      // Burn the equivalent amount of aToken, sending the underlying to the liquidator
      vars.collateralAtoken.burn(
        params.user,
        msg.sender,
        vars.maxCollateralToLiquidate - vars.protocolFee,
        collateralReserveCache.nextLiquidityIndex
      );
    }

    // Transfer fee to treasury if it is non-zero
    if (vars.protocolFee > 0) {
      vars.collateralAtoken.transferOnLiquidation(
        params.user,
        AAVE_COLLECTOR_ADDRESS,
        vars.maxCollateralToLiquidate - vars.protocolFee
      );
    }

    // If the collateral being liquidated is equal to the user balance,
    // we set the currency as not being used as collateral anymore
    if (vars.maxCollateralToLiquidate == vars.userCollateralBalance) {
      userConfig.setUsingAsCollateral(collateralReserve.id, false);
      emit ReserveUsedAsCollateralDisabled(params.collateralAsset, params.user);
    }

    // Transfers the debt asset being repaid to the aToken, where the liquidity is kept
    IERC20(params.debtAsset).safeTransferFrom(
      msg.sender,
      vars.debtReserveCache.aTokenAddress,
      vars.actualDebtToLiquidate
    );

    emit LiquidationCall(
      params.collateralAsset,
      params.debtAsset,
      params.user,
      vars.actualDebtToLiquidate,
      vars.maxCollateralToLiquidate,
      msg.sender,
      params.receiveAToken
    );
  }

  struct AvailableCollateralToLiquidateLocalVars {
    uint256 userCompoundedBorrowBalance;
    uint256 liquidationBonus;
    uint256 collateralPrice;
    uint256 debtAssetPrice;
    uint256 maxAmountCollateralToLiquidate;
    uint256 debtAssetDecimals;
    uint256 collateralDecimals;
    uint256 collateralAssetUnit;
    uint256 debtAssetUnit;
    uint256 collateralAmount;
    uint256 debtAmountNeeded;
    uint256 collateralProtocolFee;
    uint256 collateralProtocolFeeAmount;
  }

  /**
   * @dev Calculates how much of a specific collateral can be liquidated, given
   * a certain amount of debt asset.
   * - This function needs to be called after all the checks to validate the liquidation have been performed,
   *   otherwise it might fail.
   * @param collateralReserve The data of the collateral reserve
   * @param debtReserveCache The cached data of the debt reserve
   * @param collateralAsset The address of the underlying asset used as collateral, to receive as result of the liquidation
   * @param debtAsset The address of the underlying borrowed asset to be repaid with the liquidation
   * @param debtToCover The debt amount of borrowed `asset` the liquidator wants to cover
   * @param userCollateralBalance The collateral balance for the specific `collateralAsset` of the user being liquidated
   * @return collateralAmount: The maximum amount that is possible to liquidate given all the liquidation constraints
   *                           (user balance, close factor)
   *         debtAmountNeeded: The amount to repay with the liquidation
   *         collateralProtocolFeeAmount: The amount of collateral to send as a liquidation protocol fee
   **/
  function _calculateAvailableCollateralToLiquidate(
    DataTypes.ReserveData storage collateralReserve,
    DataTypes.ReserveCache memory debtReserveCache,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 userCollateralBalance,
    IPriceOracleGetter oracle
  )
    internal
    view
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    AvailableCollateralToLiquidateLocalVars memory vars;

    vars.collateralPrice = oracle.getAssetPrice(collateralAsset);
    vars.debtAssetPrice = oracle.getAssetPrice(debtAsset);

    (, , vars.liquidationBonus, vars.collateralDecimals, ) = collateralReserve
      .configuration
      .getParams();

    vars.collateralProtocolFee = collateralReserve.configuration.getLiquidationProtocolFee();

    vars.debtAssetDecimals = debtReserveCache.reserveConfiguration.getDecimalsMemory();
    unchecked {
      vars.collateralAssetUnit = 10**vars.collateralDecimals;
      vars.debtAssetUnit = 10**vars.debtAssetDecimals;
    }

    // This is the maximum possible amount of the selected collateral that can be liquidated, given the
    // max amount of liquidatable debt
    vars.maxAmountCollateralToLiquidate =
      (
        (vars.debtAssetPrice * debtToCover * vars.collateralAssetUnit).percentMul(
          vars.liquidationBonus
        )
      ) /
      (vars.collateralPrice * vars.debtAssetUnit);

    if (vars.maxAmountCollateralToLiquidate > userCollateralBalance) {
      vars.collateralAmount = userCollateralBalance;
      vars.debtAmountNeeded = ((vars.collateralPrice * vars.collateralAmount * vars.debtAssetUnit) /
        (vars.debtAssetPrice * vars.collateralAssetUnit))
        .percentDiv(vars.liquidationBonus);
    } else {
      vars.collateralAmount = vars.maxAmountCollateralToLiquidate;
      vars.debtAmountNeeded = debtToCover;
    }
    vars.collateralProtocolFeeAmount = vars.collateralAmount.percentMul(vars.collateralProtocolFee);
    return (vars.collateralAmount, vars.debtAmountNeeded, vars.collateralProtocolFeeAmount);
  }
}
