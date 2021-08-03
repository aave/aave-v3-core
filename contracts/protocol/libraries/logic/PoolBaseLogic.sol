// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {UserConfiguration} from './../configuration/UserConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {IFlashLoanReceiver} from '../../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {Errors} from '../helpers/Errors.sol';
import {PercentageMath} from '../math/PercentageMath.sol';

/**
 * @title PoolBaseLogic library
 * @author Aave
 * @notice Implements the base logic for the POOL
 */
library PoolBaseLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using SafeERC20 for IERC20;
  using UserConfiguration for DataTypes.UserConfigurationMap;
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
  event FlashLoan(
    address indexed target,
    address indexed initiator,
    address indexed asset,
    uint256 amount,
    uint256 premium,
    uint16 referralCode
  );

  function executeDeposit(
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) public {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    ValidationLogic.validateDeposit(reserveCache, amount);

    reserve.updateInterestRates(reserveCache, asset, amount, 0);

    IERC20(asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, amount);

    bool isFirstDeposit =
      IAToken(reserveCache.aTokenAddress).mint(onBehalfOf, amount, reserveCache.nextLiquidityIndex);

    if (isFirstDeposit) {
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
  ) public returns (uint256) {
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

  function executeBorrow(
    mapping(address => DataTypes.ReserveData) storage reserves,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reservesList,
    DataTypes.ExecuteBorrowParams memory vars,
    DataTypes.ExecuteBorrowHelperParams memory helperVars
  ) public {
    DataTypes.ReserveData storage reserve = reserves[vars.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    ValidationLogic.validateBorrow(
      reserveCache,
      vars.asset,
      vars.onBehalfOf,
      vars.amount,
      vars.interestRateMode,
      helperVars.maxStableRateBorrowSizePercent,
      reserves,
      userConfig,
      reservesList,
      helperVars.reservesCount,
      helperVars.oracle
    );

    uint256 currentStableRate = 0;
    bool isFirstBorrowing = false;

    if (DataTypes.InterestRateMode(vars.interestRateMode) == DataTypes.InterestRateMode.STABLE) {
      currentStableRate = reserve.currentStableBorrowRate;
      isFirstBorrowing = IStableDebtToken(reserveCache.stableDebtTokenAddress).mint(
        vars.user,
        vars.onBehalfOf,
        vars.amount,
        currentStableRate
      );
      reserveCache.refreshDebt(vars.amount, 0, 0, 0);
    } else {
      isFirstBorrowing = IVariableDebtToken(reserveCache.variableDebtTokenAddress).mint(
        vars.user,
        vars.onBehalfOf,
        vars.amount,
        reserveCache.nextVariableBorrowIndex
      );
      reserveCache.refreshDebt(0, 0, vars.amount, 0);
    }

    if (isFirstBorrowing) {
      userConfig.setBorrowing(reserve.id, true);
    }

    reserve.updateInterestRates(
      reserveCache,
      vars.asset,
      0,
      vars.releaseUnderlying ? vars.amount : 0
    );

    if (vars.releaseUnderlying) {
      IAToken(reserveCache.aTokenAddress).transferUnderlyingTo(vars.user, vars.amount);
    }

    emit Borrow(
      vars.asset,
      vars.user,
      vars.onBehalfOf,
      vars.amount,
      vars.interestRateMode,
      DataTypes.InterestRateMode(vars.interestRateMode) == DataTypes.InterestRateMode.STABLE
        ? currentStableRate
        : reserve.currentVariableBorrowRate,
      vars.referralCode
    );
  }

  function executeRepay(
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteRepayParams memory vars
  ) public returns (uint256) {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    (uint256 stableDebt, uint256 variableDebt) =
      Helpers.getUserCurrentDebt(vars.onBehalfOf, reserve);
    DataTypes.InterestRateMode interestRateMode = DataTypes.InterestRateMode(vars.rateMode);

    ValidationLogic.validateRepay(
      vars.lastBorrower,
      vars.lastBorrowTimestamp,
      reserveCache,
      vars.amount,
      interestRateMode,
      vars.onBehalfOf,
      stableDebt,
      variableDebt
    );

    uint256 paybackAmount =
      interestRateMode == DataTypes.InterestRateMode.STABLE ? stableDebt : variableDebt;

    if (vars.amount < paybackAmount) {
      paybackAmount = vars.amount;
    }

    reserve.updateState(reserveCache);

    if (interestRateMode == DataTypes.InterestRateMode.STABLE) {
      IStableDebtToken(reserveCache.stableDebtTokenAddress).burn(vars.onBehalfOf, paybackAmount);
      reserveCache.refreshDebt(0, paybackAmount, 0, 0);
    } else {
      IVariableDebtToken(reserveCache.variableDebtTokenAddress).burn(
        vars.onBehalfOf,
        paybackAmount,
        reserveCache.nextVariableBorrowIndex
      );
      reserveCache.refreshDebt(0, 0, 0, paybackAmount);
    }

    reserve.updateInterestRates(reserveCache, vars.asset, paybackAmount, 0);

    if (stableDebt + variableDebt - paybackAmount == 0) {
      userConfig.setBorrowing(reserve.id, false);
    }

    IERC20(vars.asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, paybackAmount);

    IAToken(reserveCache.aTokenAddress).handleRepayment(msg.sender, paybackAmount);

    emit Repay(vars.asset, vars.onBehalfOf, msg.sender, paybackAmount);

    return paybackAmount;
  }

  function finalizeTransfer(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,
    DataTypes.FinalizeTransferParams memory vars
  ) public {
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

  struct FlashLoanLocalVars {
    IFlashLoanReceiver receiver;
    address oracle;
    uint256 i;
    address currentAsset;
    address currentATokenAddress;
    uint256 currentAmount;
    uint256 currentPremiumToLP;
    uint256 currentPremiumToProtocol;
    uint256 currentAmountPlusPremium;
    address debtToken;
    address[] aTokenAddresses;
    uint256[] totalPremiums;
    uint256 flashloanPremiumTotal;
    uint256 flashloanPremiumToProtocol;
  }

  function flashLoan(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    mapping(address => bool) storage authorizedFlashBorrowers,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.FlashloanParams memory flashParams
  ) public {
    FlashLoanLocalVars memory vars;

    vars.aTokenAddresses = new address[](flashParams.assets.length);
    vars.totalPremiums = new uint256[](flashParams.assets.length);

    ValidationLogic.validateFlashloan(flashParams.assets, flashParams.amounts, reserves);

    vars.receiver = IFlashLoanReceiver(flashParams.receiverAddress);
    (vars.flashloanPremiumTotal, vars.flashloanPremiumToProtocol) = authorizedFlashBorrowers[
      msg.sender
    ]
      ? (0, 0)
      : (flashParams.flashLoanPremiumTotal, flashParams.flashLoanPremiumToProtocol);

    for (vars.i = 0; vars.i < flashParams.assets.length; vars.i++) {
      vars.aTokenAddresses[vars.i] = reserves[flashParams.assets[vars.i]].aTokenAddress;
      vars.totalPremiums[vars.i] = flashParams.amounts[vars.i].percentMul(
        vars.flashloanPremiumTotal
      );
      IAToken(vars.aTokenAddresses[vars.i]).transferUnderlyingTo(
        flashParams.receiverAddress,
        flashParams.amounts[vars.i]
      );
    }

    require(
      vars.receiver.executeOperation(
        flashParams.assets,
        flashParams.amounts,
        vars.totalPremiums,
        msg.sender,
        flashParams.params
      ),
      Errors.P_INVALID_FLASH_LOAN_EXECUTOR_RETURN
    );

    for (vars.i = 0; vars.i < flashParams.assets.length; vars.i++) {
      vars.currentAsset = flashParams.assets[vars.i];
      vars.currentAmount = flashParams.amounts[vars.i];
      vars.currentATokenAddress = vars.aTokenAddresses[vars.i];
      vars.currentAmountPlusPremium = vars.currentAmount + vars.totalPremiums[vars.i];
      vars.currentPremiumToProtocol = flashParams.amounts[vars.i].percentMul(
        vars.flashloanPremiumToProtocol
      );
      vars.currentPremiumToLP = vars.totalPremiums[vars.i] - vars.currentPremiumToProtocol;

      if (
        DataTypes.InterestRateMode(flashParams.modes[vars.i]) == DataTypes.InterestRateMode.NONE
      ) {
        DataTypes.ReserveData storage reserve = reserves[vars.currentAsset];
        DataTypes.ReserveCache memory reserveCache = reserve.cache();

        reserve.updateState(reserveCache);
        reserve.cumulateToLiquidityIndex(
          IERC20(vars.currentATokenAddress).totalSupply(),
          vars.currentPremiumToLP
        );

        reserve.accruedToTreasury =
          reserve.accruedToTreasury +
          vars.currentPremiumToProtocol.rayDiv(reserve.liquidityIndex);

        reserve.updateInterestRates(
          reserveCache,
          vars.currentAsset,
          vars.currentAmountPlusPremium,
          0
        );

        IERC20(vars.currentAsset).safeTransferFrom(
          flashParams.receiverAddress,
          vars.currentATokenAddress,
          vars.currentAmountPlusPremium
        );
      } else {
        // If the user chose to not return the funds, the system checks if there is enough collateral and
        // eventually opens a debt position
        executeBorrow(
          reserves,
          userConfig,
          reservesList,
          DataTypes.ExecuteBorrowParams(
            vars.currentAsset,
            msg.sender,
            flashParams.onBehalfOf,
            vars.currentAmount,
            flashParams.modes[vars.i],
            flashParams.referralCode,
            false
          ),
          flashParams.borrowHelperParams
        );
      }
      emit FlashLoan(
        flashParams.receiverAddress,
        msg.sender,
        vars.currentAsset,
        vars.currentAmount,
        vars.totalPremiums[vars.i],
        flashParams.referralCode
      );
    }
  }
}
