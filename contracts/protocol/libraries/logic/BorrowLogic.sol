// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IStableDebtToken} from '../../../interfaces/IStableDebtToken.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {IFlashLoanReceiver} from '../../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {Errors} from '../helpers/Errors.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
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
  using WadRayMath for uint256;
  using PercentageMath for uint256;

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
  event FlashLoan(
    address indexed target,
    address indexed initiator,
    address indexed asset,
    uint256 amount,
    uint256 premium,
    uint16 referralCode
  );

  event RebalanceStableBorrowRate(address indexed reserve, address indexed user);
  event Swap(address indexed reserve, address indexed user, uint256 rateMode);

  function executeBorrow(
    mapping(address => DataTypes.ReserveData) storage reserves,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reservesList,
    DataTypes.ExecuteBorrowParams memory params
  ) public {
    DataTypes.ReserveData storage reserve = reserves[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    ValidationLogic.validateBorrow(
      reserveCache,
      params.asset,
      params.onBehalfOf,
      params.amount,
      params.interestRateMode,
      params.maxStableRateBorrowSizePercent,
      reserves,
      userConfig,
      reservesList,
      params.reservesCount,
      params.oracle
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

    reserve.updateInterestRates(
      reserveCache,
      params.asset,
      0,
      0,
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
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteRepayParams memory params
  ) external returns (uint256) {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    (uint256 stableDebt, uint256 variableDebt) = Helpers.getUserCurrentDebt(
      params.onBehalfOf,
      reserve
    );
    DataTypes.InterestRateMode interestRateMode = DataTypes.InterestRateMode(params.rateMode);

    reserve.updateState(reserveCache);

    ValidationLogic.validateRepay(
      params.lastBorrower,
      params.lastBorrowTimestamp,
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

    reserve.updateInterestRates(reserveCache, params.asset, 0, 0, paybackAmount, 0);

    if (stableDebt + variableDebt - paybackAmount == 0) {
      userConfig.setBorrowing(reserve.id, false);
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

  function executeFlashLoan(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    bool isAuthorizedFlashBorrower,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.FlashloanParams memory flashParams
  ) external {
    FlashLoanLocalVars memory vars;

    vars.aTokenAddresses = new address[](flashParams.assets.length);
    vars.totalPremiums = new uint256[](flashParams.assets.length);

    ValidationLogic.validateFlashloan(flashParams.assets, flashParams.amounts, reserves);

    vars.receiver = IFlashLoanReceiver(flashParams.receiverAddress);
    (vars.flashloanPremiumTotal, vars.flashloanPremiumToProtocol) = isAuthorizedFlashBorrower
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
          0,
          0,
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
            false,
            flashParams.maxStableRateBorrowSizePercent,
            flashParams.reservesCount,
            flashParams.oracle
          )
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

  function rebalanceStableBorrowRate(
    DataTypes.ReserveData storage reserve,
    address asset,
    address user
  ) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

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

    reserve.updateState(reserveCache);

    IStableDebtToken(address(stableDebtToken)).burn(user, stableDebt);

    (, reserveCache.nextTotalStableDebt, reserveCache.nextAvgStableBorrowRate) = IStableDebtToken(
      address(stableDebtToken)
    ).mint(user, user, stableDebt, reserve.currentStableBorrowRate);

    reserve.updateInterestRates(reserveCache, asset, 0, 0, 0, 0);

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

    reserve.updateInterestRates(reserveCache, asset, 0, 0, 0, 0);

    emit Swap(asset, msg.sender, rateMode);
  }
}
