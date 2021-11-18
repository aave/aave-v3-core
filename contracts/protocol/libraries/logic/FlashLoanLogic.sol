// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {IFlashLoanReceiver} from '../../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {IFlashLoanSimpleReceiver} from '../../../flashloan/interfaces/IFlashLoanSimpleReceiver.sol';
import {IPoolAddressesProvider} from '../../../interfaces/IPoolAddressesProvider.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {Errors} from '../helpers/Errors.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {BorrowLogic} from './BorrowLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';

/**
 * @title FlashLoanLogic library
 * @author Aave
 * @notice Implements the logic for the flash loans
 */
library FlashLoanLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  // See `IPool` for descriptions
  event FlashLoan(
    address indexed target,
    address indexed initiator,
    address indexed asset,
    uint256 amount,
    uint256 premium,
    uint16 referralCode
  );

  struct FlashLoanLocalVars {
    IFlashLoanReceiver receiver;
    address oracle;
    address oracleSentinel;
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
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.FlashloanParams memory params
  ) external {
    // The usual action flow (cache -> updateState -> validation -> changeState -> updateRates)
    // is altered to (validation -> user payload -> cache -> updateState -> changeState -> updateRates) for flashloans.
    // This is done to protect against reentrance and rate manipulation within the user specified payload.

    FlashLoanLocalVars memory vars;

    vars.aTokenAddresses = new address[](params.assets.length);
    vars.totalPremiums = new uint256[](params.assets.length);

    ValidationLogic.validateFlashloan(params.assets, params.amounts, reserves);

    vars.receiver = IFlashLoanReceiver(params.receiverAddress);
    (vars.flashloanPremiumTotal, vars.flashloanPremiumToProtocol) = params.isAuthorizedFlashBorrower
      ? (0, 0)
      : (params.flashLoanPremiumTotal, params.flashLoanPremiumToProtocol);

    for (vars.i = 0; vars.i < params.assets.length; vars.i++) {
      vars.aTokenAddresses[vars.i] = reserves[params.assets[vars.i]].aTokenAddress;
      vars.totalPremiums[vars.i] = params.amounts[vars.i].percentMul(vars.flashloanPremiumTotal);
      IAToken(vars.aTokenAddresses[vars.i]).transferUnderlyingTo(
        params.receiverAddress,
        params.amounts[vars.i]
      );
    }

    require(
      vars.receiver.executeOperation(
        params.assets,
        params.amounts,
        vars.totalPremiums,
        msg.sender,
        params.params
      ),
      Errors.P_INVALID_FLASH_LOAN_EXECUTOR_RETURN
    );

    for (vars.i = 0; vars.i < params.assets.length; vars.i++) {
      vars.currentAsset = params.assets[vars.i];
      vars.currentAmount = params.amounts[vars.i];
      vars.currentATokenAddress = vars.aTokenAddresses[vars.i];
      vars.currentAmountPlusPremium = vars.currentAmount + vars.totalPremiums[vars.i];
      vars.currentPremiumToProtocol = params.amounts[vars.i].percentMul(
        vars.flashloanPremiumToProtocol
      );
      vars.currentPremiumToLP = vars.totalPremiums[vars.i] - vars.currentPremiumToProtocol;

      if (DataTypes.InterestRateMode(params.modes[vars.i]) == DataTypes.InterestRateMode.NONE) {
        DataTypes.ReserveData storage reserve = reserves[vars.currentAsset];
        DataTypes.ReserveCache memory reserveCache = reserve.cache();

        reserve.updateState(reserveCache);
        reserve.cumulateToLiquidityIndex(
          IERC20(vars.currentATokenAddress).totalSupply(),
          vars.currentPremiumToLP
        );

        reserve.accruedToTreasury =
          reserve.accruedToTreasury +
          Helpers.castUint128(vars.currentPremiumToProtocol.rayDiv(reserve.liquidityIndex));

        reserve.updateInterestRates(
          reserveCache,
          vars.currentAsset,
          vars.currentAmountPlusPremium,
          0
        );

        IERC20(vars.currentAsset).safeTransferFrom(
          params.receiverAddress,
          vars.currentATokenAddress,
          vars.currentAmountPlusPremium
        );
      } else {
        // If the user chose to not return the funds, the system checks if there is enough collateral and
        // eventually opens a debt position
        vars.oracle = IPoolAddressesProvider(params.addressesProvider).getPriceOracle();
        vars.oracleSentinel = IPoolAddressesProvider(params.addressesProvider)
          .getPriceOracleSentinel();
        BorrowLogic.executeBorrow(
          reserves,
          reservesList,
          eModeCategories,
          userConfig,
          DataTypes.ExecuteBorrowParams(
            vars.currentAsset,
            msg.sender,
            params.onBehalfOf,
            vars.currentAmount,
            params.modes[vars.i],
            params.referralCode,
            false,
            params.maxStableRateBorrowSizePercent,
            params.reservesCount,
            vars.oracle,
            params.userEModeCategory,
            vars.oracleSentinel
          )
        );
      }
      emit FlashLoan(
        params.receiverAddress,
        msg.sender,
        vars.currentAsset,
        vars.currentAmount,
        vars.totalPremiums[vars.i],
        params.referralCode
      );
    }
  }

  struct FlashLoanSimpleLocalVars {
    IFlashLoanSimpleReceiver receiver;
    uint256 totalPremium;
    uint256 premiumToLP;
    uint256 premiumToProtocol;
    uint256 amountPlusPremium;
  }

  function executeFlashLoanSimple(
    DataTypes.ReserveData storage reserve,
    DataTypes.FlashloanSimpleParams memory params
  ) external {
    // The usual action flow (cache -> updateState -> validation -> changeState -> updateRates)
    // is altered to (validation -> user payload -> cache -> updateState -> changeState -> updateRates) for flashloans.
    // This is done to protect against reentrance and rate manipulation within the user specified payload.

    ValidationLogic.validateFlashloanSimple(reserve);
    FlashLoanSimpleLocalVars memory vars;

    vars.receiver = IFlashLoanSimpleReceiver(params.receiverAddress);
    vars.totalPremium = params.amount.percentMul(params.flashLoanPremiumTotal);
    vars.amountPlusPremium = params.amount + vars.totalPremium;
    IAToken(reserve.aTokenAddress).transferUnderlyingTo(params.receiverAddress, params.amount);

    require(
      vars.receiver.executeOperation(
        params.asset,
        params.amount,
        vars.totalPremium,
        msg.sender,
        params.params
      ),
      Errors.P_INVALID_FLASH_LOAN_EXECUTOR_RETURN
    );

    vars.premiumToProtocol = params.amount.percentMul(params.flashLoanPremiumToProtocol);
    vars.premiumToLP = vars.totalPremium - vars.premiumToProtocol;

    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);
    reserve.cumulateToLiquidityIndex(
      IERC20(reserveCache.aTokenAddress).totalSupply(),
      vars.premiumToLP
    );

    reserve.accruedToTreasury =
      reserve.accruedToTreasury +
      Helpers.castUint128(vars.premiumToProtocol.rayDiv(reserve.liquidityIndex));

    reserve.updateInterestRates(reserveCache, params.asset, vars.amountPlusPremium, 0);

    IERC20(params.asset).safeTransferFrom(
      params.receiverAddress,
      reserveCache.aTokenAddress,
      vars.amountPlusPremium
    );

    emit FlashLoan(
      params.receiverAddress,
      msg.sender,
      params.asset,
      params.amount,
      vars.totalPremium,
      0
    );
  }
}
