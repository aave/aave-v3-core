// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {Address} from '../../../dependencies/openzeppelin/contracts/Address.sol';
import {GPv2SafeERC20} from '../../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {Errors} from '../helpers/Errors.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title PoolLogic library
 * @author Aave
 * @notice Implements the logic for Pool specific functions
 */
library PoolLogic {
  using GPv2SafeERC20 for IERC20;
  using WadRayMath for uint256;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  // See `IPool` for descriptions
  event MintedToTreasury(address indexed reserve, uint256 amountMinted);
  event IsolationModeTotalDebtUpdated(address indexed asset, uint256 totalDebt);

  /**
   * @notice Initialize an asset to the  Add a reserve to the list of reserves
   * @param reservesData The state of all the reserves
   * @param reserves The addresses of all the active reserves
   * @param params Additional parameters needed for initiation
   * @return true if appended, false if inserted at existing empty spot
   **/
  function initReserve(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    DataTypes.InitReserveParams memory params
  ) external returns (bool) {
    require(Address.isContract(params.asset), Errors.NOT_CONTRACT);
    reservesData[params.asset].init(
      params.aTokenAddress,
      params.stableDebtAddress,
      params.variableDebtAddress,
      params.interestRateStrategyAddress
    );
    return
      PoolLogic.addReserveToList(
        reservesData,
        reserves,
        params.asset,
        params.reservesCount,
        params.maxNumberReserves
      );
  }

  /**
   * @notice Add a reserve to the list of reserves
   * @param reservesData The state of all the reserves
   * @param reserves The addresses of all the active reserves
   * @param asset The address of the underlying asset to add to the list of reserves
   * @param reservesCount The number of available reserves
   * @param maxNumberReserves The maximum number of reserves
   * @return true if appended, false if inserted at existing empty spot
   **/
  function addReserveToList(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reserves,
    address asset,
    uint16 reservesCount,
    uint16 maxNumberReserves
  ) internal returns (bool) {
    bool reserveAlreadyAdded = reservesData[asset].id != 0 || reserves[0] == asset;
    require(!reserveAlreadyAdded, Errors.RESERVE_ALREADY_ADDED);

    for (uint16 i = 0; i < reservesCount; i++) {
      if (reserves[i] == address(0)) {
        reservesData[asset].id = i;
        reserves[i] = asset;
        return false;
      }
    }
    require(reservesCount < maxNumberReserves, Errors.NO_MORE_RESERVES_ALLOWED);
    reservesData[asset].id = reservesCount;
    reserves[reservesCount] = asset;
    return true;
  }

  /**
   * @notice Rescue and transfer tokens locked in this contract
   * @param token The address of the token
   * @param to The address of the recipient
   * @param amount The amount of token to transfer
   */
  function rescueTokens(
    address token,
    address to,
    uint256 amount
  ) external {
    IERC20(token).safeTransfer(to, amount);
  }

  /**
   * @notice Mints the assets accrued through the reserve factor to the treasury in the form of aTokens
   * @param reservesData The state of all the reserves
   * @param assets The list of reserves for which the minting needs to be executed
   **/
  function mintToTreasury(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    address[] calldata assets
  ) external {
    for (uint256 i = 0; i < assets.length; i++) {
      address assetAddress = assets[i];

      DataTypes.ReserveData storage reserve = reservesData[assetAddress];

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

  /**
   * @notice Resets the isolation mode total debt of the given asset to zero
   * @dev It requires the given asset has zero debt ceiling
   * @param reservesData The state of all the reserves
   * @param asset The address of the underlying asset to reset the isolationModeTotalDebt
   */
  function resetIsolationModeTotalDebt(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    address asset
  ) external {
    require(reservesData[asset].configuration.getDebtCeiling() == 0, Errors.DEBT_CEILING_NOT_ZERO);
    reservesData[asset].isolationModeTotalDebt = 0;
    emit IsolationModeTotalDebtUpdated(asset, 0);
  }

  /**
   * @notice Returns the maximum number of reserves supported to be listed in this Pool
   * @return The maximum number of reserves supported
   */
  function MAX_NUMBER_RESERVES() external view returns (uint16) {
    return ReserveConfiguration.MAX_RESERVES_COUNT;
  }

  function getReservesList(mapping(uint256 => address) storage reserves, uint256 reservesListCount)
    external
    view
    returns (address[] memory)
  {
    uint256 droppedReservesCount = 0;
    address[] memory reservesList = new address[](reservesListCount);

    for (uint256 i = 0; i < reservesListCount; i++) {
      if (reserves[i] != address(0)) {
        reservesList[i - droppedReservesCount] = reserves[i];
      } else {
        droppedReservesCount++;
      }
    }

    // Reduces the length of the reserves array by `droppedReservesCount`
    assembly {
      mstore(reservesList, sub(reservesListCount, droppedReservesCount))
    }
    return reservesList;
  }
}
