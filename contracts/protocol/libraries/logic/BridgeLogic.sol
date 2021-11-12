// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {Errors} from '../helpers/Errors.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';

library BridgeLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeERC20 for IERC20;

  event ReserveUsedAsCollateralEnabled(address indexed reserve, address indexed user);
  event MintUnbacked(
    address indexed reserve,
    address user,
    address indexed onBehalfOf,
    uint256 amount,
    uint16 indexed referral
  );
  event BackUnbacked(address indexed reserve, address indexed backer, uint256 amount, uint256 fee);

  /**
   * @notice Mint unbacked aTokens to a user and updates the unbacked for the reserve.
   * @dev Essentially a supply without transferring the underlying.
   * @param reserve The reserve to mint to
   * @param userConfig The user configuration to update
   * @param asset The address of the asset
   * @param amount The amount to mint
   * @param onBehalfOf The address that will receive the aTokens
   * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
   *   0 if the action is executed directly by the user, without any middle-man
   **/
  function mintUnbacked(
    DataTypes.ReserveData storage reserve,
    DataTypes.UserConfigurationMap storage userConfig,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    ValidationLogic.validateSupply(reserveCache, amount);

    uint256 unbackedMintCap = reserveCache.reserveConfiguration.getUnbackedMintCap();
    uint256 reserveDecimals = reserveCache.reserveConfiguration.getDecimals();

    uint256 unbacked = reserve.unbacked = reserve.unbacked + Helpers.castUint128(amount);

    require(
      unbacked / (10**reserveDecimals) < unbackedMintCap,
      Errors.VL_UNBACKED_MINT_CAP_EXCEEDED
    );

    reserve.updateInterestRates(reserveCache, asset, 0, 0);

    bool isFirstSupply = IAToken(reserveCache.aTokenAddress).mint(
      onBehalfOf,
      amount,
      reserveCache.nextLiquidityIndex
    );

    if (isFirstSupply) {
      userConfig.setUsingAsCollateral(reserve.id, true);
      emit ReserveUsedAsCollateralEnabled(asset, onBehalfOf);
    }

    emit MintUnbacked(asset, msg.sender, onBehalfOf, amount, referralCode);
  }

  /**
   * @notice Back the current unbacked with `amount` and pay `fee`.
   * @param reserve The reserve to back unbacked for
   * @param asset The address of the underlying asset to repay
   * @param amount The amount to back
   * @param fee The amount paid in fees
   * @param protocolFeeBps The fraction of fees in basis points paid to the protocol
   **/
  function backUnbacked(
    DataTypes.ReserveData storage reserve,
    address asset,
    uint256 amount,
    uint256 fee,
    uint256 protocolFeeBps
  ) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    uint256 backingAmount = (amount < reserve.unbacked) ? amount : reserve.unbacked;

    uint256 feeToProtocol = fee.percentMul(protocolFeeBps);
    uint256 feeToLP = fee - feeToProtocol;
    uint256 added = backingAmount + fee;

    reserve.cumulateToLiquidityIndex(IERC20(reserveCache.aTokenAddress).totalSupply(), feeToLP);

    reserve.accruedToTreasury += Helpers.castUint128(feeToProtocol.rayDiv(reserve.liquidityIndex));

    reserve.unbacked -= Helpers.castUint128(backingAmount);
    reserve.updateInterestRates(reserveCache, asset, added, 0);

    IERC20(asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, added);

    emit BackUnbacked(asset, msg.sender, backingAmount, fee);
  }
}
