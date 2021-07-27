// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import {SafeMath} from '../../../dependencies/openzeppelin/contracts/SafeMath.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {GenericLogic} from './GenericLogic.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {IReserveInterestRateStrategy} from '../../../interfaces/IReserveInterestRateStrategy.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IScaledBalanceToken} from '../../../interfaces/IScaledBalanceToken.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {Address} from '../../../dependencies/openzeppelin/contracts/Address.sol';

/**
 * @title ReserveLogic library
 * @author Aave
 * @notice Implements functions to validate the different actions of the protocol
 */
library ValidationLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using SafeMath for uint256;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using Address for address;

  uint256 public constant REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD = 4000;
  uint256 public constant REBALANCE_UP_USAGE_RATIO_THRESHOLD = 0.95 * 1e27; //usage ratio of 95%

  /**
   * @dev Validates a deposit action
   * @param reserveCache The cached data of the reserve
   * @param amount The amount to be deposited
   */
  function validateDeposit(DataTypes.ReserveCache memory reserveCache, uint256 amount)
    internal
    view
  {
    (bool isActive, bool isFrozen, , , bool isPaused) =
      reserveCache.reserveConfiguration.getFlagsMemory();
    (, , , uint256 reserveDecimals, ) = reserveCache.reserveConfiguration.getParamsMemory();
    uint256 supplyCap = reserveCache.reserveConfiguration.getSupplyCapMemory();

    require(amount != 0, Errors.VL_INVALID_AMOUNT);
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);
    require(!isFrozen, Errors.VL_RESERVE_FROZEN);
    require(
      supplyCap == 0 ||
        IAToken(reserveCache.aTokenAddress)
          .scaledTotalSupply()
          .rayMul(reserveCache.nextLiquidityIndex)
          .add(amount)
          .div(10**reserveDecimals) <
        supplyCap,
      Errors.VL_SUPPLY_CAP_EXCEEDED
    );
  }

  /**
   * @dev Validates a withdraw action
   * @param reserveCache The cached data of the reserve
   * @param amount The amount to be withdrawn
   * @param userBalance The balance of the user
   */
  function validateWithdraw(
    DataTypes.ReserveCache memory reserveCache,
    uint256 amount,
    uint256 userBalance
  ) internal pure {
    require(amount != 0, Errors.VL_INVALID_AMOUNT);
    require(amount <= userBalance, Errors.VL_NOT_ENOUGH_AVAILABLE_USER_BALANCE);

    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlagsMemory();
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);
  }

  struct ValidateBorrowLocalVars {
    uint256 currentLtv;
    uint256 currentLiquidationThreshold;
    uint256 collateralNeededInBaseCurrency;
    uint256 userCollateralInBaseCurrency;
    uint256 userDebtInBaseCurrency;
    uint256 availableLiquidity;
    uint256 healthFactor;
    uint256 totalDebt;
    uint256 totalSupplyVariableDebt;
    uint256 reserveDecimals;
    uint256 borrowCap;
    uint256 amountInBaseCurrency;
    bool isActive;
    bool isFrozen;
    bool isPaused;
    bool borrowingEnabled;
    bool stableRateBorrowingEnabled;
  }

  /**
   * @dev Validates a borrow action
   * @param reserveCache the cached data of the reserve
   * @param asset The address of the asset to borrow
   * @param userAddress The address of the user
   * @param amount The amount to be borrowed
   * @param interestRateMode The interest rate mode at which the user is borrowing
   * @param maxStableLoanPercent The max amount of the liquidity that can be borrowed at stable rate, in percentage
   * @param reservesData The state of all the reserves
   * @param userConfig The state of the user for the specific reserve
   * @param reserves The addresses of all the active reserves
   * @param oracle The price oracle
   */

  function validateBorrow(
    DataTypes.ReserveCache memory reserveCache,
    address asset,
    address userAddress,
    uint256 amount,
    uint256 interestRateMode,
    uint256 maxStableLoanPercent,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  ) external view {
    ValidateBorrowLocalVars memory vars;

    (, , , vars.reserveDecimals, ) = reserveCache.reserveConfiguration.getParamsMemory();

    (
      vars.isActive,
      vars.isFrozen,
      vars.borrowingEnabled,
      vars.stableRateBorrowingEnabled,
      vars.isPaused
    ) = reserveCache.reserveConfiguration.getFlagsMemory();

    require(vars.isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!vars.isPaused, Errors.VL_RESERVE_PAUSED);
    require(!vars.isFrozen, Errors.VL_RESERVE_FROZEN);
    require(amount != 0, Errors.VL_INVALID_AMOUNT);

    require(vars.borrowingEnabled, Errors.VL_BORROWING_NOT_ENABLED);

    //validate interest rate mode
    require(
      uint256(DataTypes.InterestRateMode.VARIABLE) == interestRateMode ||
        uint256(DataTypes.InterestRateMode.STABLE) == interestRateMode,
      Errors.VL_INVALID_INTEREST_RATE_MODE_SELECTED
    );

    vars.borrowCap = reserveCache.reserveConfiguration.getBorrowCapMemory();

    if (vars.borrowCap != 0) {
      {
        vars.totalSupplyVariableDebt = reserveCache.currScaledVariableDebt.rayMul(
          reserveCache.nextVariableBorrowIndex
        );

        vars.totalDebt = reserveCache.currTotalStableDebt.add(vars.totalSupplyVariableDebt).add(
          amount
        );
        require(
          vars.totalDebt.div(10**vars.reserveDecimals) < vars.borrowCap,
          Errors.VL_BORROW_CAP_EXCEEDED
        );
      }
    }

    (
      vars.userCollateralInBaseCurrency,
      vars.userDebtInBaseCurrency,
      vars.currentLtv,
      vars.currentLiquidationThreshold,
      vars.healthFactor,

    ) = GenericLogic.calculateUserAccountData(
      userAddress,
      reservesData,
      userConfig,
      reserves,
      reservesCount,
      oracle
    );

    require(vars.userCollateralInBaseCurrency > 0, Errors.VL_COLLATERAL_BALANCE_IS_0);

    require(
      vars.healthFactor > GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    vars.amountInBaseCurrency = IPriceOracleGetter(oracle).getAssetPrice(asset);
    vars.amountInBaseCurrency = vars.amountInBaseCurrency.mul(amount).div(10**vars.reserveDecimals);

    //add the current already borrowed amount to the amount requested to calculate the total collateral needed.
    vars.collateralNeededInBaseCurrency = vars
      .userDebtInBaseCurrency
      .add(vars.amountInBaseCurrency)
      .percentDiv(vars.currentLtv); //LTV is calculated in percentage

    require(
      vars.collateralNeededInBaseCurrency <= vars.userCollateralInBaseCurrency,
      Errors.VL_COLLATERAL_CANNOT_COVER_NEW_BORROW
    );

    /**
     * Following conditions need to be met if the user is borrowing at a stable rate:
     * 1. Reserve must be enabled for stable rate borrowing
     * 2. Users cannot borrow from the reserve if their collateral is (mostly) the same currency
     *    they are borrowing, to prevent abuses.
     * 3. Users will be able to borrow only a portion of the total available liquidity
     **/

    if (interestRateMode == uint256(DataTypes.InterestRateMode.STABLE)) {
      //check if the borrow mode is stable and if stable rate borrowing is enabled on this reserve

      require(vars.stableRateBorrowingEnabled, Errors.VL_STABLE_BORROWING_NOT_ENABLED);

      require(
        !userConfig.isUsingAsCollateral(reservesData[asset].id) ||
          reserveCache.reserveConfiguration.getLtvMemory() == 0 ||
          amount > IERC20(reserveCache.aTokenAddress).balanceOf(userAddress),
        Errors.VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY
      );

      vars.availableLiquidity = IERC20(asset).balanceOf(reserveCache.aTokenAddress);

      //calculate the max available loan size in stable rate mode as a percentage of the
      //available liquidity
      uint256 maxLoanSizeStable = vars.availableLiquidity.percentMul(maxStableLoanPercent);

      require(amount <= maxLoanSizeStable, Errors.VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE);
    }
  }

  /**
   * @dev Validates a repay action
   * @param reserveCache The cached data of the reserve
   * @param amountSent The amount sent for the repayment. Can be an actual value or uint(-1)
   * @param rateMode the interest rate mode of the debt being repaid
   * @param onBehalfOf The address of the user msg.sender is repaying for
   * @param stableDebt The borrow balance of the user
   * @param variableDebt The borrow balance of the user
   */
  function validateRepay(
    address lastBorrower,
    uint40 lastBorrowTimestamp,
    DataTypes.ReserveCache memory reserveCache,
    uint256 amountSent,
    DataTypes.InterestRateMode rateMode,
    address onBehalfOf,
    uint256 stableDebt,
    uint256 variableDebt
  ) external view {
    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlagsMemory();
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);

    require(amountSent > 0, Errors.VL_INVALID_AMOUNT);

    require(
      lastBorrower != onBehalfOf || lastBorrowTimestamp != uint40(block.timestamp),
      Errors.VL_SAME_BLOCK_BORROW_REPAY
    );

    require(
      (stableDebt > 0 &&
        DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE) ||
        (variableDebt > 0 &&
          DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.VARIABLE),
      Errors.VL_NO_DEBT_OF_SELECTED_TYPE
    );

    require(
      amountSent != uint256(-1) || msg.sender == onBehalfOf,
      Errors.VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF
    );
  }

  /**
   * @dev Validates a swap of borrow rate mode.
   * @param reserve The reserve state on which the user is swapping the rate
   * @param reserveCache The cached data of the reserve
   * @param userConfig The user reserves configuration
   * @param stableDebt The stable debt of the user
   * @param variableDebt The variable debt of the user
   * @param currentRateMode The rate mode of the debt being swapped
   */
  function validateSwapRateMode(
    DataTypes.ReserveData storage reserve,
    DataTypes.ReserveCache memory reserveCache,
    DataTypes.UserConfigurationMap storage userConfig,
    uint256 stableDebt,
    uint256 variableDebt,
    DataTypes.InterestRateMode currentRateMode
  ) external view {
    (bool isActive, bool isFrozen, , bool stableRateEnabled, bool isPaused) =
      reserveCache.reserveConfiguration.getFlagsMemory();

    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);
    require(!isFrozen, Errors.VL_RESERVE_FROZEN);

    if (currentRateMode == DataTypes.InterestRateMode.STABLE) {
      require(stableDebt > 0, Errors.VL_NO_STABLE_RATE_LOAN_IN_RESERVE);
    } else if (currentRateMode == DataTypes.InterestRateMode.VARIABLE) {
      require(variableDebt > 0, Errors.VL_NO_VARIABLE_RATE_LOAN_IN_RESERVE);
      /**
       * user wants to swap to stable, before swapping we need to ensure that
       * 1. stable borrow rate is enabled on the reserve
       * 2. user is not trying to abuse the reserve by depositing
       * more collateral than he is borrowing, artificially lowering
       * the interest rate, borrowing at variable, and switching to stable
       **/
      require(stableRateEnabled, Errors.VL_STABLE_BORROWING_NOT_ENABLED);

      require(
        !userConfig.isUsingAsCollateral(reserve.id) ||
          reserveCache.reserveConfiguration.getLtvMemory() == 0 ||
          stableDebt.add(variableDebt) > IERC20(reserveCache.aTokenAddress).balanceOf(msg.sender),
        Errors.VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY
      );
    } else {
      revert(Errors.VL_INVALID_INTEREST_RATE_MODE_SELECTED);
    }
  }

  /**
   * @dev Validates a stable borrow rate rebalance action
   * @param reserve The reserve state on which the user is getting rebalanced
   * @param reserveCache The cached state of the reserve
   * @param reserveAddress The address of the reserve
   * @param stableDebtToken The stable debt token instance
   * @param variableDebtToken The variable debt token instance
   * @param aTokenAddress The address of the aToken contract
   */
  function validateRebalanceStableBorrowRate(
    DataTypes.ReserveData storage reserve,
    DataTypes.ReserveCache memory reserveCache,
    address reserveAddress,
    IERC20 stableDebtToken,
    IERC20 variableDebtToken,
    address aTokenAddress
  ) external view {
    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlagsMemory();

    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);

    //if the usage ratio is below 95%, no rebalances are needed
    uint256 totalDebt =
      stableDebtToken.totalSupply().add(variableDebtToken.totalSupply()).wadToRay();
    uint256 availableLiquidity = IERC20(reserveAddress).balanceOf(aTokenAddress).wadToRay();
    uint256 usageRatio = totalDebt == 0 ? 0 : totalDebt.rayDiv(availableLiquidity.add(totalDebt));

    //if the liquidity rate is below REBALANCE_UP_THRESHOLD of the max variable APR at 95% usage,
    //then we allow rebalancing of the stable rate positions.

    uint256 currentLiquidityRate = reserveCache.currLiquidityRate;
    uint256 maxVariableBorrowRate =
      IReserveInterestRateStrategy(reserve.interestRateStrategyAddress).getMaxVariableBorrowRate();

    require(
      usageRatio >= REBALANCE_UP_USAGE_RATIO_THRESHOLD &&
        currentLiquidityRate <=
        maxVariableBorrowRate.percentMul(REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD),
      Errors.LP_INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET
    );
  }

  /**
   * @dev Validates the action of setting an asset as collateral
   * @param reserveCache The cached data of the reserve
   */
  function validateSetUseReserveAsCollateral(
    DataTypes.ReserveCache memory reserveCache,
    uint256 userBalance
  ) external pure {
    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlagsMemory();

    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);

    require(userBalance > 0, Errors.VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0);
  }

  /**
   * @dev Validates a flashloan action
   * @param assets The assets being flashborrowed
   * @param amounts The amounts for each asset being borrowed
   **/
  function validateFlashloan(
    address[] memory assets,
    uint256[] memory amounts,
    mapping(address => DataTypes.ReserveData) storage reservesData
  ) internal view {
    for (uint256 i = 0; i < assets.length; i++) {
      require(!reservesData[assets[i]].configuration.getPaused(), Errors.VL_RESERVE_PAUSED);
    }
    require(assets.length == amounts.length, Errors.VL_INCONSISTENT_FLASHLOAN_PARAMS);
  }

  struct ValidateLiquidationCallLocalVars {
    uint256 healthFactor;
    bool collateralReserveActive;
    bool collateralReservePaused;
    bool principalReserveActive;
    bool principalReservePaused;
    bool isCollateralEnabled;
  }

  /**
   * @dev Validates the liquidation action
   * @param collateralReserve The reserve data of the collateral
   * @param principalReserveCache The cached reserve data of the principal
   * @param userConfig The user configuration
   * @param totalDebt Total debt balance of the user
   * @param user The address of the user being liquidated
   * @param reservesData The mapping of the reserves data
   * @param userConfig The user configuration mapping
   * @param reserves The list of the reserves
   * @param reservesCount The number of reserves in the list
   * @param oracle The address of the price oracle
   **/
  function validateLiquidationCall(
    DataTypes.ReserveData storage collateralReserve,
    DataTypes.ReserveCache memory principalReserveCache,
    uint256 totalDebt,
    address user,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  ) internal view returns (uint256, string memory) {
    ValidateLiquidationCallLocalVars memory vars;

    (vars.collateralReserveActive, , , , vars.collateralReservePaused) = collateralReserve
      .configuration
      .getFlagsMemory();

    (vars.principalReserveActive, , , , vars.principalReservePaused) = principalReserveCache
      .reserveConfiguration
      .getFlagsMemory();

    if (!vars.collateralReserveActive || !vars.principalReserveActive) {
      return (
        uint256(Errors.CollateralManagerErrors.NO_ACTIVE_RESERVE),
        Errors.VL_NO_ACTIVE_RESERVE
      );
    }
    if (vars.collateralReservePaused || vars.principalReservePaused) {
      return (uint256(Errors.CollateralManagerErrors.PAUSED_RESERVE), Errors.VL_RESERVE_PAUSED);
    }

    (, , , , vars.healthFactor, ) = GenericLogic.calculateUserAccountData(
      user,
      reservesData,
      userConfig,
      reserves,
      reservesCount,
      oracle
    );

    if (vars.healthFactor >= GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
      return (
        uint256(Errors.CollateralManagerErrors.HEALTH_FACTOR_ABOVE_THRESHOLD),
        Errors.LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD
      );
    }

    vars.isCollateralEnabled =
      collateralReserve.configuration.getLiquidationThreshold() > 0 &&
      userConfig.isUsingAsCollateral(collateralReserve.id);

    //if collateral isn't enabled as collateral by user, it cannot be liquidated
    if (!vars.isCollateralEnabled) {
      return (
        uint256(Errors.CollateralManagerErrors.COLLATERAL_CANNOT_BE_LIQUIDATED),
        Errors.LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED
      );
    }

    if (totalDebt == 0) {
      return (
        uint256(Errors.CollateralManagerErrors.CURRRENCY_NOT_BORROWED),
        Errors.LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER
      );
    }

    return (uint256(Errors.CollateralManagerErrors.NO_ERROR), Errors.LPCM_NO_ERRORS);
  }

  struct validateHFAndLtvLocalVars {
    uint256 healthFactor;
    uint256 assetLtv;
    uint256 reserveDecimals;
    uint256 totalSupplyAtoken;
    bool hasZeroLtvCollateral;
  }

  /**
   * @dev Validates the health factor of a user and the ltv of the asset being withdrawn
   * @param asset The asset for which the ltv will be validated
   * @param from The user from which the aTokens are being transferred
   * @param reservesData The state of all the reserves
   * @param userConfig The state of the user for the specific reserve
   * @param reserves The addresses of all the active reserves
   * @param reservesCount The number of available reserves
   * @param oracle The price oracle
   */
  function validateHFAndLtv(
    address asset,
    address from,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  ) external view {
    validateHFAndLtvLocalVars memory vars;
    DataTypes.ReserveData memory reserve = reservesData[asset];
    (, , , , vars.healthFactor, vars.hasZeroLtvCollateral) = GenericLogic.calculateUserAccountData(
      from,
      reservesData,
      userConfig,
      reserves,
      reservesCount,
      oracle
    );

    require(
      vars.healthFactor >= GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    vars.assetLtv = reserve.configuration.getLtvMemory();

    require(vars.assetLtv == 0 || !vars.hasZeroLtvCollateral, Errors.VL_LTV_VALIDATION_FAILED);
  }

  /**
   * @dev Validates a transfer action
   * @param reserve The reserve object
   */
  function validateTransfer(DataTypes.ReserveData storage reserve) internal view {
    require(!reserve.configuration.getPaused(), Errors.VL_RESERVE_PAUSED);
  }

  /**
   * @dev Validates a drop reserve action
   * @param reserve The reserve object
   **/
  function validateDropReserve(DataTypes.ReserveData storage reserve) external view {
    require(
      IERC20(reserve.stableDebtTokenAddress).totalSupply() == 0,
      Errors.RL_STABLE_DEBT_NOT_ZERO
    );
    require(
      IERC20(reserve.variableDebtTokenAddress).totalSupply() == 0,
      Errors.RL_VARIABLE_DEBT_SUPPLY_NOT_ZERO
    );
    require(IERC20(reserve.aTokenAddress).totalSupply() == 0, Errors.RL_ATOKEN_SUPPLY_NOT_ZERO);
  }
}
