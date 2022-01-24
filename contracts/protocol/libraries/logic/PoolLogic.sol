// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {GPv2SafeERC20} from '../../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {Errors} from '../helpers/Errors.sol';

/**
 * @title PoolLogic library
 * @author Aave
 * @notice
 */
library PoolLogic {
  using GPv2SafeERC20 for IERC20;
  using WadRayMath for uint256;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  // See `IPool` for descriptions
  event MintedToTreasury(address indexed reserve, uint256 amountMinted);
  event IsolationModeTotalDebtUpdated(address indexed asset, uint256 totalDebt);

  function addReserveToList(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    address asset,
    uint16 reservesCount,
    uint16 maxNumberReserves
  ) external returns (bool) {
    bool reserveAlreadyAdded = reserves[asset].id != 0 || reservesList[0] == asset;
    require(!reserveAlreadyAdded, Errors.RESERVE_ALREADY_ADDED);

    for (uint16 i = 0; i < reservesCount; i++) {
      if (reservesList[i] == address(0)) {
        reserves[asset].id = i;
        reservesList[i] = asset;
        return false;
      }
    }
    require(reservesCount < maxNumberReserves, Errors.NO_MORE_RESERVES_ALLOWED);
    reserves[asset].id = reservesCount;
    reservesList[reservesCount] = asset;
    return true;
  }

  function rescueTokens(
    address token,
    address to,
    uint256 amount
  ) external {
    IERC20(token).safeTransfer(to, amount);
  }

  function mintToTreasury(
    mapping(address => DataTypes.ReserveData) storage reserves,
    address[] calldata assets
  ) external {
    for (uint256 i = 0; i < assets.length; i++) {
      address assetAddress = assets[i];

      DataTypes.ReserveData storage reserve = reserves[assetAddress];

      // this cover both inactive reserves and invalid reserves since the flag will be 0 for both
      if (!reserve.configuration.getActive()) {
        continue;
      }

      uint256 accruedToTreasury = reserve.accruedToTreasury;

      if (accruedToTreasury != 0) {
        reserve.accruedToTreasury = 0;
        uint256 normalizedIncome = reserve.getNormalizedIncome();
        uint256 amountToMint = accruedToTreasury.rayMul(normalizedIncome);
        IAToken(reserve.aTokenAddress).mintToTreasury(amountToMint, normalizedIncome);

        emit MintedToTreasury(assetAddress, amountToMint);
      }
    }
  }

  function resetIsolationModeTotalDebt(
    mapping(address => DataTypes.ReserveData) storage reserves,
    address asset
  ) external {
    require(reserves[asset].configuration.getDebtCeiling() == 0, Errors.DEBT_CEILING_NOT_ZERO);
    reserves[asset].isolationModeTotalDebt = 0;
    emit IsolationModeTotalDebtUpdated(asset, 0);
  }

  function MAX_NUMBER_RESERVES() external view returns (uint16) {
    return ReserveConfiguration.MAX_RESERVES_COUNT;
  }
}
