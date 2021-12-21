// SPDX-License-Identifier: agpl-3.0
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

/**
 * @title ReserveLogic library
 * @author Aave
 * @notice Implements functions to validate the different actions of the protocol
 */
library ValidationLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using Address for address;

  // Factor to apply to the maximum variable borrow to calculate the maximum liquidity rate allowed, expressed in bps
  // A factor of 4000 results in 40%
  uint256 public constant REBALANCE_UP_MAXIMUM_VARIABLE_RATE_FACTOR = 4000;

  // Maximum borrow utilization rate allowed, expressed in ray
  // A rate of 0.95e27 results in 95%
  uint256 public constant REBALANCE_UP_MAXIMUM_BORROW_UTILIZATION_RATE = 0.95e27;

  // Minimum health factor allowed under any circumstance
  // A value of 0.95e18 results in 0.95
  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95e18;

  // Minimum health factor to consider a user position healthy
  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;

  /**
   * @notice Validates a supply action.
   * @param reserveCache The cached data of the reserve
   * @param amount The amount to be supplied
   */
  function validateSupply(DataTypes.ReserveCache memory reserveCache, uint256 amount)
    internal
    view
  {
    require(amount != 0, Errors.VL_INVALID_AMOUNT);

    (bool isActive, bool isFrozen, , , bool isPaused) = reserveCache
      .reserveConfiguration
      .getFlags();
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);
    require(!isFrozen, Errors.VL_RESERVE_FROZEN);

    uint256 supplyCap = reserveCache.reserveConfiguration.getSupplyCap();
    require(
      supplyCap == 0 ||
        (IAToken(reserveCache.aTokenAddress).scaledTotalSupply().rayMul(
          reserveCache.nextLiquidityIndex
        ) + amount) <=
        supplyCap * (10**reserveCache.reserveConfiguration.getDecimals()),
      Errors.VL_SUPPLY_CAP_EXCEEDED
    );
  }

  /**
   * @notice Validates a withdraw action.
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

    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
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
    uint256 assetUnit;
    address eModePriceSource;
    bool isActive;
    bool isFrozen;
    bool isPaused;
    bool borrowingEnabled;
    bool stableRateBorrowingEnabled;
  }

  /**
   * @notice Validates a borrow action.
   * @param reservesData The state of all the reserves
   * @param reserves The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param params Additional params needed for the validation
   */
  function validateBorrow(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.ValidateBorrowParams memory params
  ) internal view {
    require(params.amount != 0, Errors.VL_INVALID_AMOUNT);

    ValidateBorrowLocalVars memory vars;

    (
      vars.isActive,
      vars.isFrozen,
      vars.borrowingEnabled,
      vars.stableRateBorrowingEnabled,
      vars.isPaused
    ) = params.reserveCache.reserveConfiguration.getFlags();

    require(vars.isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!vars.isPaused, Errors.VL_RESERVE_PAUSED);
    require(!vars.isFrozen, Errors.VL_RESERVE_FROZEN);
    require(vars.borrowingEnabled, Errors.VL_BORROWING_NOT_ENABLED);

    require(
      params.priceOracleSentinel == address(0) ||
        IPriceOracleSentinel(params.priceOracleSentinel).isBorrowAllowed(),
      Errors.VL_PRICE_ORACLE_SENTINEL_CHECK_FAILED
    );

    //validate interest rate mode
    require(
      uint256(DataTypes.InterestRateMode.VARIABLE) == params.interestRateMode ||
        uint256(DataTypes.InterestRateMode.STABLE) == params.interestRateMode,
      Errors.VL_INVALID_INTEREST_RATE_MODE_SELECTED
    );

    vars.reserveDecimals = params.reserveCache.reserveConfiguration.getDecimals();
    vars.borrowCap = params.reserveCache.reserveConfiguration.getBorrowCap();
    unchecked {
      vars.assetUnit = 10**vars.reserveDecimals;
    }

    if (vars.borrowCap != 0) {
      vars.totalSupplyVariableDebt = params.reserveCache.currScaledVariableDebt.rayMul(
        params.reserveCache.nextVariableBorrowIndex
      );

      vars.totalDebt =
        params.reserveCache.currTotalStableDebt +
        vars.totalSupplyVariableDebt +
        params.amount;

      unchecked {
        require(vars.totalDebt <= vars.borrowCap * vars.assetUnit, Errors.VL_BORROW_CAP_EXCEEDED);
      }
    }

    if (params.isolationModeActive) {
      // check that the asset being borrowed is borrowable in isolation mode AND
      // the total exposure is no bigger than the collateral debt ceiling
      require(
        params.reserveCache.reserveConfiguration.getBorrowableInIsolation(),
        Errors.VL_ASSET_NOT_BORROWABLE_IN_ISOLATION
      );

      require(
        reservesData[params.isolationModeCollateralAddress].isolationModeTotalDebt +
          Helpers.castUint128(
            params.amount / 10**(vars.reserveDecimals - ReserveConfiguration.DEBT_CEILING_DECIMALS)
          ) <=
          params.isolationModeDebtCeiling,
        Errors.VL_DEBT_CEILING_CROSSED
      );
    }

    if (params.userEModeCategory != 0) {
      require(
        params.reserveCache.reserveConfiguration.getEModeCategory() == params.userEModeCategory,
        Errors.VL_INCONSISTENT_EMODE_CATEGORY
      );
      vars.eModePriceSource = eModeCategories[params.userEModeCategory].priceSource;
    }

    (
      vars.userCollateralInBaseCurrency,
      vars.userDebtInBaseCurrency,
      vars.currentLtv,
      vars.currentLiquidationThreshold,
      vars.healthFactor,

    ) = GenericLogic.calculateUserAccountData(
      reservesData,
      reserves,
      eModeCategories,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: params.userConfig,
        reservesCount: params.reservesCount,
        user: params.userAddress,
        oracle: params.oracle,
        userEModeCategory: params.userEModeCategory
      })
    );

    require(vars.userCollateralInBaseCurrency > 0, Errors.VL_COLLATERAL_BALANCE_IS_0);
    require(vars.currentLtv > 0, Errors.VL_LTV_VALIDATION_FAILED);
    require(
      vars.healthFactor > HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    vars.amountInBaseCurrency =
      IPriceOracleGetter(params.oracle).getAssetPrice(
        vars.eModePriceSource != address(0) ? vars.eModePriceSource : params.asset
      ) *
      params.amount;
    unchecked {
      vars.amountInBaseCurrency /= vars.assetUnit;
    }

    //add the current already borrowed amount to the amount requested to calculate the total collateral needed.
    vars.collateralNeededInBaseCurrency = (vars.userDebtInBaseCurrency + vars.amountInBaseCurrency)
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

    if (params.interestRateMode == uint256(DataTypes.InterestRateMode.STABLE)) {
      //check if the borrow mode is stable and if stable rate borrowing is enabled on this reserve

      require(vars.stableRateBorrowingEnabled, Errors.VL_STABLE_BORROWING_NOT_ENABLED);

      require(
        !params.userConfig.isUsingAsCollateral(reservesData[params.asset].id) ||
          params.reserveCache.reserveConfiguration.getLtv() == 0 ||
          params.amount > IERC20(params.reserveCache.aTokenAddress).balanceOf(params.userAddress),
        Errors.VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY
      );

      vars.availableLiquidity = IERC20(params.asset).balanceOf(params.reserveCache.aTokenAddress);

      //calculate the max available loan size in stable rate mode as a percentage of the
      //available liquidity
      uint256 maxLoanSizeStable = vars.availableLiquidity.percentMul(params.maxStableLoanPercent);

      require(
        params.amount <= maxLoanSizeStable,
        Errors.VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE
      );
    }
  }

  /**
   * @notice Validates a repay action.
   * @param reserveCache The cached data of the reserve
   * @param amountSent The amount sent for the repayment. Can be an actual value or uint(-1)
   * @param rateMode The interest rate mode of the debt being repaid
   * @param onBehalfOf The address of the user msg.sender is repaying for
   * @param stableDebt The borrow balance of the user
   * @param variableDebt The borrow balance of the user
   */
  function validateRepay(
    DataTypes.ReserveCache memory reserveCache,
    uint256 amountSent,
    DataTypes.InterestRateMode rateMode,
    address onBehalfOf,
    uint256 stableDebt,
    uint256 variableDebt
  ) internal view {
    require(amountSent > 0, Errors.VL_INVALID_AMOUNT);

    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);

    uint256 variableDebtPreviousIndex = IScaledBalanceToken(reserveCache.variableDebtTokenAddress)
      .getPreviousIndex(onBehalfOf);

    uint40 stableRatePreviousTimestamp = IStableDebtToken(reserveCache.stableDebtTokenAddress)
      .getUserLastUpdated(onBehalfOf);

    require(
      (stableRatePreviousTimestamp < uint40(block.timestamp) &&
        DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.STABLE) ||
        (variableDebtPreviousIndex < reserveCache.nextVariableBorrowIndex &&
          DataTypes.InterestRateMode(rateMode) == DataTypes.InterestRateMode.VARIABLE),
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
      amountSent != type(uint256).max || msg.sender == onBehalfOf,
      Errors.VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF
    );
  }

  /**
   * @notice Validates a swap of borrow rate mode.
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
  ) internal view {
    (bool isActive, bool isFrozen, , bool stableRateEnabled, bool isPaused) = reserveCache
      .reserveConfiguration
      .getFlags();
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
       * 2. user is not trying to abuse the reserve by supplying
       * more collateral than he is borrowing, artificially lowering
       * the interest rate, borrowing at variable, and switching to stable
       **/
      require(stableRateEnabled, Errors.VL_STABLE_BORROWING_NOT_ENABLED);

      require(
        !userConfig.isUsingAsCollateral(reserve.id) ||
          reserveCache.reserveConfiguration.getLtv() == 0 ||
          stableDebt + variableDebt > IERC20(reserveCache.aTokenAddress).balanceOf(msg.sender),
        Errors.VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY
      );
    } else {
      revert(Errors.VL_INVALID_INTEREST_RATE_MODE_SELECTED);
    }
  }

  /**
   * @notice Validates a stable borrow rate rebalance action.
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
  ) internal view {
    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);

    //if the usage ratio is below 95%, no rebalances are needed
    uint256 totalDebt = (stableDebtToken.totalSupply() + variableDebtToken.totalSupply())
      .wadToRay();
    uint256 availableLiquidity = IERC20(reserveAddress).balanceOf(aTokenAddress).wadToRay();
    uint256 borrowUtilizationRate = totalDebt == 0
      ? 0
      : totalDebt.rayDiv(availableLiquidity + totalDebt);

    //if the utilization rate is more than the threshold and liquidity rate less than the maximum allowed based
    // on the max variable borrow rate, we allow rebalancing of the stable rate positions.

    uint256 currentLiquidityRate = reserveCache.currLiquidityRate;
    uint256 maxVariableBorrowRate = IReserveInterestRateStrategy(
      reserve.interestRateStrategyAddress
    ).getMaxVariableBorrowRate();

    require(
      borrowUtilizationRate >= REBALANCE_UP_MAXIMUM_BORROW_UTILIZATION_RATE &&
        currentLiquidityRate <=
        maxVariableBorrowRate.percentMul(REBALANCE_UP_MAXIMUM_VARIABLE_RATE_FACTOR),
      Errors.P_INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET
    );
  }

  /**
   * @notice Validates the action of setting an asset as collateral.
   * @param reserveCache The cached data of the reserve
   * @param userBalance The balance of the user
   */
  function validateSetUseReserveAsCollateral(
    DataTypes.ReserveCache memory reserveCache,
    uint256 userBalance
  ) internal pure {
    require(userBalance > 0, Errors.VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0);

    (bool isActive, , , , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.VL_NO_ACTIVE_RESERVE);
    require(!isPaused, Errors.VL_RESERVE_PAUSED);
  }

  /**
   * @notice Validates a flashloan action.
   * @param assets The assets being flash-borrowed
   * @param amounts The amounts for each asset being borrowed
   * @param reservesData The state of all the reserves
   */
  function validateFlashloan(
    address[] memory assets,
    uint256[] memory amounts,
    mapping(address => DataTypes.ReserveData) storage reservesData
  ) internal view {
    require(assets.length == amounts.length, Errors.VL_INCONSISTENT_FLASHLOAN_PARAMS);
    for (uint256 i = 0; i < assets.length; i++) {
      DataTypes.ReserveConfigurationMap memory configuration = reservesData[assets[i]]
        .configuration;
      require(!configuration.getPaused(), Errors.VL_RESERVE_PAUSED);
      require(configuration.getActive(), Errors.VL_NO_ACTIVE_RESERVE);
    }
  }

  /**
   * @notice Validates a flashloan action.
   * @param reserve The state of the reserve
   */
  function validateFlashloanSimple(DataTypes.ReserveData storage reserve) internal view {
    DataTypes.ReserveConfigurationMap memory configuration = reserve.configuration;
    require(!configuration.getPaused(), Errors.VL_RESERVE_PAUSED);
    require(configuration.getActive(), Errors.VL_NO_ACTIVE_RESERVE);
  }

  struct ValidateLiquidationCallLocalVars {
    bool collateralReserveActive;
    bool collateralReservePaused;
    bool principalReserveActive;
    bool principalReservePaused;
    bool isCollateralEnabled;
  }

  /**
   * @notice Validates the liquidation action.
   * @param userConfig The user configuration mapping
   * @param collateralReserve The reserve data of the collateral
   * @param params Additional parameters needed for the validation
   */
  function validateLiquidationCall(
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ReserveData storage collateralReserve,
    DataTypes.ValidateLiquidationCallParams memory params
  ) internal view {
    ValidateLiquidationCallLocalVars memory vars;

    (vars.collateralReserveActive, , , , vars.collateralReservePaused) = collateralReserve
      .configuration
      .getFlags();

    (vars.principalReserveActive, , , , vars.principalReservePaused) = params
      .debtReserveCache
      .reserveConfiguration
      .getFlags();

    require(
      vars.collateralReserveActive && vars.principalReserveActive,
      Errors.VL_NO_ACTIVE_RESERVE
    );
    require(
      !vars.collateralReservePaused && !vars.principalReservePaused,
      Errors.VL_RESERVE_PAUSED
    );

    require(
      params.priceOracleSentinel == address(0) ||
        params.healthFactor < MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD ||
        IPriceOracleSentinel(params.priceOracleSentinel).isLiquidationAllowed(),
      Errors.VL_PRICE_ORACLE_SENTINEL_CHECK_FAILED
    );

    require(
      params.healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD
    );

    vars.isCollateralEnabled =
      collateralReserve.configuration.getLiquidationThreshold() > 0 &&
      userConfig.isUsingAsCollateral(collateralReserve.id);

    //if collateral isn't enabled as collateral by user, it cannot be liquidated
    require(vars.isCollateralEnabled, Errors.VL_COLLATERAL_CANNOT_BE_LIQUIDATED);
    require(params.totalDebt > 0, Errors.VL_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER);
  }

  /**
   * @notice Validates the health factor of a user.
   * @param reservesData The state of all the reserves
   * @param reserves The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param userConfig The state of the user for the specific reserve
   * @param user The user to validate health factor of
   * @param userEModeCategory The users active efficiency mode category
   * @param reservesCount The number of available reserves
   * @param oracle The price oracle
   */
  function validateHealthFactor(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    uint8 userEModeCategory,
    uint256 reservesCount,
    address oracle
  ) internal view returns (uint256, bool) {
    (, , , , uint256 healthFactor, bool hasZeroLtvCollateral) = GenericLogic
      .calculateUserAccountData(
        reservesData,
        reserves,
        eModeCategories,
        DataTypes.CalculateUserAccountDataParams({
          userConfig: userConfig,
          reservesCount: reservesCount,
          user: user,
          oracle: oracle,
          userEModeCategory: userEModeCategory
        })
      );

    require(
      healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    return (healthFactor, hasZeroLtvCollateral);
  }

  struct ValidateHFAndLtvLocalVars {
    uint256 assetLtv;
    bool hasZeroLtvCollateral;
  }

  /**
   * @notice Validates the health factor of a user and the ltv of the asset being withdrawn.
   * @param reservesData The state of all the reserves
   * @param reserves The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param userConfig The state of the user for the specific reserve
   * @param asset The asset for which the ltv will be validated
   * @param from The user from which the aTokens are being transferred
   * @param reservesCount The number of available reserves
   * @param oracle The price oracle
   * @param userEModeCategory The users active efficiency mode category
   */
  function validateHFAndLtv(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    address asset,
    address from,
    uint256 reservesCount,
    address oracle,
    uint8 userEModeCategory
  ) internal view {
    ValidateHFAndLtvLocalVars memory vars;

    DataTypes.ReserveData memory reserve = reservesData[asset];

    vars.assetLtv = reserve.configuration.getLtv();
    if (vars.assetLtv == 0) return;

    (, vars.hasZeroLtvCollateral) = validateHealthFactor(
      reservesData,
      reserves,
      eModeCategories,
      userConfig,
      from,
      userEModeCategory,
      reservesCount,
      oracle
    );
    require(!vars.hasZeroLtvCollateral, Errors.VL_LTV_VALIDATION_FAILED);
  }

  /**
   * @notice Validates a transfer action.
   * @param reserve The reserve object
   */
  function validateTransfer(DataTypes.ReserveData storage reserve) internal view {
    require(!reserve.configuration.getPaused(), Errors.VL_RESERVE_PAUSED);
  }

  /**
   * @notice Validates a drop reserve action.
   * @param reserve The reserve object
   **/
  function validateDropReserve(DataTypes.ReserveData storage reserve) internal view {
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

  /**
   * @notice Validates the action of setting efficiency mode.
   * @param reservesData the data mapping of the reserves
   * @param reserves a mapping storing the list of reserves
   * @param eModeCategories a mapping storing configurations for all efficiency mode categories
   * @param userConfig the user configuration
   * @param reservesCount The total number of valid reserves
   * @param categoryId The id of the category
   **/
  function validateSetUserEMode(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    uint256 reservesCount,
    uint8 categoryId
  ) internal view {
    // category is invalid if the liq threshold is not set
    require(
      categoryId == 0 || eModeCategories[categoryId].liquidationThreshold > 0,
      Errors.VL_INCONSISTENT_EMODE_CATEGORY
    );

    //eMode can always be enabled if the user hasn't supplied anything
    if (userConfig.isEmpty()) {
      return;
    }

    // if user is trying to set another category than default we require that
    // either the user is not borrowing, or it's borrowing assets of categoryId
    if (categoryId > 0) {
      unchecked {
        for (uint256 i = 0; i < reservesCount; i++) {
          if (userConfig.isBorrowing(i)) {
            DataTypes.ReserveConfigurationMap memory configuration = reservesData[reserves[i]]
              .configuration;
            require(
              configuration.getEModeCategory() == categoryId,
              Errors.VL_INCONSISTENT_EMODE_CATEGORY
            );
          }
        }
      }
    }
  }

  /**
   * @notice Validates if an asset can be activated as collateral in supply/transfer/set as collateral/mint unbacked/liquidate
   * @dev This is used to ensure that the constraints for isolated assets are respected by all the actions that generate transfers of aTokens
   * @param reservesData the data mapping of the reserves
   * @param reserves a mapping storing the list of reserves
   * @param userConfig the user configuration
   * @param asset The address of the asset being validated as collateral
   * @return True if the asset can be activated as collateral, false otherwise
   **/
  function validateUseAsCollateral(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    DataTypes.UserConfigurationMap storage userConfig,
    address asset
  ) internal view returns (bool) {
    if (!userConfig.isUsingAsCollateralAny()) {
      return true;
    }

    (bool isolationModeActive, , ) = userConfig.getIsolationModeState(reservesData, reserves);
    DataTypes.ReserveConfigurationMap memory configuration = reservesData[asset].configuration;

    return (!isolationModeActive && configuration.getDebtCeiling() == 0);
  }
}
