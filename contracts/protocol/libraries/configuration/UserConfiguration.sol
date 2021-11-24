// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Errors} from '../helpers/Errors.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveConfiguration} from './ReserveConfiguration.sol';

/**
 * @title UserConfiguration library
 * @author Aave
 * @notice Implements the bitmap logic to handle the user configuration
 */
library UserConfiguration {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  uint256 internal constant BORROWING_MASK =
    0x5555555555555555555555555555555555555555555555555555555555555555;
  uint256 internal constant COLLATERAL_MASK =
    0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA;

  uint256 internal constant _maxReserves = 256;
  uint256 internal constant _indexCount = _maxReserves / 128 + ((_maxReserves % 128 > 0) ? 1 : 0);

  /**
   * @notice Sets if the user is borrowing the reserve identified by reserveIndex
   * @param self The configuration object
   * @param reserveIndex The index of the reserve in the bitmap
   * @param borrowing True if the user is borrowing the reserve, false otherwise
   **/
  function setBorrowing(
    DataTypes.UserConfigurationMap storage self,
    uint256 reserveIndex,
    bool borrowing
  ) internal {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.UL_INVALID_INDEX);
      uint256 index = reserveIndex / 128;
      reserveIndex = reserveIndex % 128;
      self.data[index] =
        (self.data[index] & ~(1 << (reserveIndex * 2))) |
        (uint256(borrowing ? 1 : 0) << (reserveIndex * 2));
    }
  }

  /**
   * @notice Sets if the user is using as collateral the reserve identified by reserveIndex
   * @param self The configuration object
   * @param reserveIndex The index of the reserve in the bitmap
   * @param usingAsCollateral True if the user is usin the reserve as collateral, false otherwise
   **/
  function setUsingAsCollateral(
    DataTypes.UserConfigurationMap storage self,
    uint256 reserveIndex,
    bool usingAsCollateral
  ) internal {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.UL_INVALID_INDEX);
      uint256 index = reserveIndex / 128;
      reserveIndex = reserveIndex % 128;
      self.data[index] =
        (self.data[index] & ~(1 << (reserveIndex * 2 + 1))) |
        (uint256(usingAsCollateral ? 1 : 0) << (reserveIndex * 2 + 1));
    }
  }

  /**
   * @notice Returns if a user has been using the reserve for borrowing or as collateral
   * @param self The configuration object
   * @param reserveIndex The index of the reserve in the bitmap
   * @return True if the user has been using a reserve for borrowing or as collateral, false otherwise
   **/
  function isUsingAsCollateralOrBorrowing(
    DataTypes.UserConfigurationMap memory self,
    uint256 reserveIndex
  ) internal pure returns (bool) {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.UL_INVALID_INDEX);
      uint256 index = reserveIndex / 128;
      reserveIndex = reserveIndex % 128;
      return (self.data[index] >> (reserveIndex * 2)) & 3 != 0;
    }
  }

  /**
   * @notice Validate a user has been using the reserve for borrowing
   * @param self The configuration object
   * @param reserveIndex The index of the reserve in the bitmap
   * @return True if the user has been using a reserve for borrowing, false otherwise
   **/
  function isBorrowing(DataTypes.UserConfigurationMap memory self, uint256 reserveIndex)
    internal
    pure
    returns (bool)
  {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.UL_INVALID_INDEX);
      uint256 index = reserveIndex / 128;
      reserveIndex = reserveIndex % 128;
      return (self.data[index] >> (reserveIndex * 2)) & 1 != 0;
    }
  }

  /**
   * @notice Validate a user has been using the reserve as collateral
   * @param self The configuration object
   * @param reserveIndex The index of the reserve in the bitmap
   * @return True if the user has been using a reserve as collateral, false otherwise
   **/
  function isUsingAsCollateral(DataTypes.UserConfigurationMap memory self, uint256 reserveIndex)
    internal
    pure
    returns (bool)
  {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.UL_INVALID_INDEX);
      uint256 index = reserveIndex / 128;
      reserveIndex = reserveIndex % 128;
      return (self.data[index] >> (reserveIndex * 2 + 1)) & 1 != 0;
    }
  }

  /**
   * @notice Checks if a user has been supplying only one reserve as collateral
   * @dev this uses a simple trick - if a number is a power of two (only one bit set) then n & (n - 1) == 0
   * @param self The configuration object
   * @return True if the user has been supplying as collateral one reserve, false otherwise
   **/
  function isUsingAsCollateralOne(DataTypes.UserConfigurationMap memory self)
    internal
    pure
    returns (bool)
  {
    bool used;
    for (uint8 i = 0; i < _indexCount; i++) {
      uint256 temp = self.data[i] & COLLATERAL_MASK;
      if (temp > 0) {
        if (used) {
          return false;
        }
        if (temp & (temp - 1) != 0) {
          return false;
        }
        used = true;
      }
    }
    return used;
  }

  /**
   * @notice Checks if a user has been supplying any reserve as collateral
   * @param self The configuration object
   * @return True if the user has been supplying as collateral any reserve, false otherwise
   **/
  function isUsingAsCollateralAny(DataTypes.UserConfigurationMap memory self)
    internal
    pure
    returns (bool)
  {
    for (uint8 i = 0; i < _indexCount; i++) {
      if (self.data[i] & COLLATERAL_MASK != 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * @notice Checks if a user has been borrowing from any reserve
   * @param self The configuration object
   * @return True if the user has been borrowing any reserve, false otherwise
   **/
  function isBorrowingAny(DataTypes.UserConfigurationMap memory self) internal pure returns (bool) {
    for (uint8 i = 0; i < _indexCount; i++) {
      if (self.data[i] & BORROWING_MASK != 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * @notice Checks if a user has not been using any reserve for borrowing or supply
   * @param self The configuration object
   * @return True if the user has been borrowing any reserve, false otherwise
   **/
  function isEmpty(DataTypes.UserConfigurationMap memory self) internal pure returns (bool) {
    for (uint8 i = 0; i < _indexCount; i++) {
      if (self.data[i] != 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * @notice Returns the Isolation Mode state of the user
   * @param self The configuration object
   * @param reservesData The data of all the reserves
   * @param reservesList The reserve list
   * @return True if the user is in isolation mode, false otherwise
   * @return The address of the first asset used as collateral
   * @return The debt ceiling of the reserve
   */
  function getIsolationModeState(
    DataTypes.UserConfigurationMap memory self,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList
  )
    internal
    view
    returns (
      bool,
      address,
      uint256
    )
  {
    if (!isUsingAsCollateralAny(self)) {
      return (false, address(0), 0);
    }
    if (isUsingAsCollateralOne(self)) {
      uint256 assetId = _getFirstAssetAsCollateralId(self);

      address assetAddress = reservesList[assetId];
      uint256 ceiling = reservesData[assetAddress].configuration.getDebtCeiling();
      if (ceiling > 0) {
        return (true, assetAddress, ceiling);
      }
    }
    return (false, address(0), 0);
  }

  /**
   * @notice Returns the address of the first asset used as collateral by the user
   * @param self The configuration object
   * @return The address of the first collateral asset
   */
  function _getFirstAssetAsCollateralId(DataTypes.UserConfigurationMap memory self)
    internal
    pure
    returns (uint256)
  {
    unchecked {
      for (uint8 i = 0; i < _indexCount; i++) {
        uint256 collateralData = self.data[i] & COLLATERAL_MASK;
        if (collateralData == 0) {
          continue;
        }
        uint256 firstCollateralPosition = collateralData & ~(collateralData - 1);
        uint256 id;

        while ((firstCollateralPosition >>= 2) > 0) {
          id += 2;
        }
        return id / 2;
      }
    }
    return 0;
  }
}
