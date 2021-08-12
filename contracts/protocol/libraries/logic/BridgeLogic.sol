// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IAToken} from '../../../interfaces/IAToken.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';

import {DataTypes} from './../types/DataTypes.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {UserConfiguration} from './../configuration/UserConfiguration.sol';

import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';

library BridgeLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using WadRayMath for uint256;
  using SafeERC20 for IERC20;

  event ReserveUsedAsCollateralEnabled(address indexed reserve, address indexed user);
  event Bridged(
    address indexed reserve,
    address user,
    address indexed onBehalfOf,
    uint256 amount,
    uint16 indexed referral
  );
  event Backed(address indexed reserve, address indexed backer, uint256 amount, uint256 fee);

  function mintUnbacked(
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) public {
    // TODO: Access control must be enforced before this call
    // Essentially `executeDeposit` logic but without the underlying deposit but instead
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);
    ValidationLogic.validateDeposit(reserveCache, amount);
    reserve.updateInterestRates(reserveCache, asset, amount, 0);
    bool isFirstDeposit =
      IAToken(reserveCache.aTokenAddress).mint(onBehalfOf, amount, reserveCache.nextLiquidityIndex);
    reserve.unbackedUnderlying = reserve.unbackedUnderlying + amount;
    if (isFirstDeposit) {
      userConfig.setUsingAsCollateral(reserve.id, true);
      emit ReserveUsedAsCollateralEnabled(asset, onBehalfOf);
    }
    emit Bridged(asset, msg.sender, onBehalfOf, amount, referralCode);
  }

  function backUnbacked(
    DataTypes.ReserveData storage reserve,
    address asset,
    uint256 amount,
    uint256 fee
  ) public {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);
    // We can give fee and amount as input.
    // This allow anyone to throw away money without a fee.
    // But for the bridges, they can compute the correct fee at L2 and simply pass it along.
    // Gives us a lot of flexibility.
    // Also allows the safetymodule to back unbacked if necessary, without paying fee.

    // limit backing amount to be min(unbackedUnderlying, amount) to not underflow
    uint256 backingAmount =
      (amount < reserve.unbackedUnderlying) ? amount : reserve.unbackedUnderlying;

    // Excess backing will be added to the fee
    uint256 totalFee = (backingAmount < amount) ? fee + (amount - backingAmount) : fee;

    // He is also paying fee to himself, feels a bit weird. He gets balanceOf(himself) / totalSupply * fee.
    reserve.cumulateToLiquidityIndex(IERC20(reserve.aTokenAddress).totalSupply(), totalFee);

    // Similar to a flashloan. The fee is additional liquidity.
    // If we flip the order here, we probably don't need to pass totalFee as argument as it is in the underlying already then.
    reserve.updateInterestRates(reserveCache, asset, totalFee, 0);

    reserve.unbackedUnderlying = reserve.unbackedUnderlying - backingAmount;
    IERC20(asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, amount + fee);

    emit Backed(asset, msg.sender, backingAmount, totalFee);
  }
}
