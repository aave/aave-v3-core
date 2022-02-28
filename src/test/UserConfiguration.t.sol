// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import {UserConfiguration} from './../../contracts/protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from './../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';

import {TestHelper} from './TestHelper.sol';

contract ContractTest is TestHelper {
  using UserConfiguration for DataTypes.UserConfigurationMap;

  DataTypes.UserConfigurationMap internal config;

  function testSetBorrowing(
    uint256 data,
    uint8 index,
    bool borrowing
  ) public {
    config = DataTypes.UserConfigurationMap({data: data});

    uint256 reserveIndex = index % ReserveConfiguration.MAX_RESERVES_COUNT;
    config.setBorrowing(reserveIndex, borrowing);

    uint256 bitToCheck = 1 << (reserveIndex * 2);
    bool isBorrowing = (config.data & UserConfiguration.BORROWING_MASK) & bitToCheck > 0;

    assertEq(borrowing, isBorrowing);
  }

  function testSetAsCollateral(
    uint256 data,
    uint8 index,
    bool usingAsCollateral
  ) public {
    config = DataTypes.UserConfigurationMap({data: data});

    uint256 reserveIndex = index % ReserveConfiguration.MAX_RESERVES_COUNT;
    config.setUsingAsCollateral(reserveIndex, usingAsCollateral);

    uint256 bitToCheck = 1 << (reserveIndex * 2 + 1);
    bool isUsingAsCollateral = (config.data & UserConfiguration.COLLATERAL_MASK) & bitToCheck > 0;

    assertEq(usingAsCollateral, isUsingAsCollateral);
  }

  function testIsUsingAsCollateralOrBorrowing(uint256 data, uint8 index) public {
    config = DataTypes.UserConfigurationMap({data: data});

    uint256 reserveIndex = index % ReserveConfiguration.MAX_RESERVES_COUNT;
    uint256 bitToCheckBorrowing = 1 << (reserveIndex * 2);
    uint256 bitToCheckCollateral = 1 << (reserveIndex * 2 + 1);

    bool isBorrowing = config.data & UserConfiguration.BORROWING_MASK & bitToCheckBorrowing > 0;
    bool isUsingAsCollateral = config.data &
      UserConfiguration.COLLATERAL_MASK &
      bitToCheckCollateral >
      0;

    assertEq(
      config.isUsingAsCollateralOrBorrowing(reserveIndex),
      isUsingAsCollateral || isBorrowing
    );
  }

  function testIsBorrowing(uint256 data, uint8 index) public {
    config = DataTypes.UserConfigurationMap({data: data});
    uint256 reserveIndex = index % ReserveConfiguration.MAX_RESERVES_COUNT;
    uint256 bitToCheck = 1 << (reserveIndex * 2);
    bool isBorrowing = (config.data & UserConfiguration.BORROWING_MASK) & bitToCheck > 0;
    assertEq(config.isBorrowing(reserveIndex), isBorrowing);
  }

  function testIsUsingAsCollateral(uint256 data, uint8 index) public {
    config = DataTypes.UserConfigurationMap({data: data});
    uint256 reserveIndex = index % ReserveConfiguration.MAX_RESERVES_COUNT;
    uint256 bitToCheck = 1 << (reserveIndex * 2 + 1);
    bool isUsingAsCollateral = (config.data & UserConfiguration.COLLATERAL_MASK) & bitToCheck > 0;
    assertEq(config.isUsingAsCollateral(reserveIndex), isUsingAsCollateral);
  }

  function testIsUsingAsCollateralOne(uint256 data) public {
    config = DataTypes.UserConfigurationMap({data: data});
    assertEq(
      config.isUsingAsCollateralOne(),
      _countBitsOn(data & UserConfiguration.COLLATERAL_MASK) == 1
    );
  }

  function testIsUsingAsCollateralAny(uint256 data) public {
    config = DataTypes.UserConfigurationMap({data: data});
    assertEq(
      config.isUsingAsCollateralAny(),
      _countBitsOn(data & UserConfiguration.COLLATERAL_MASK) > 0
    );
  }

  function testIsBorrowingOne(uint256 data) public {
    config = DataTypes.UserConfigurationMap({data: data});
    assertEq(config.isBorrowingOne(), _countBitsOn(data & UserConfiguration.BORROWING_MASK) == 1);
  }

  function testIsBorrowingAny(uint256 data) public {
    config = DataTypes.UserConfigurationMap({data: data});
    assertEq(config.isBorrowingAny(), _countBitsOn(data & UserConfiguration.BORROWING_MASK) > 0);
  }

  function testIsEmpty(uint256 data) public {
    config = DataTypes.UserConfigurationMap({data: data});
    assertEq(config.isEmpty(), data == 0);
  }

  function testGetIsolationModeState() public {
    require(false, 'TO BE IMPLEMENTED');
  }

  function testGetSiloedBorrowingState() public {
    require(false, 'TO BE IMPLEMENTED');
  }

  function Test_getFirstAssetIdByMask(uint256 data, bool collateralMask) internal {
    config = DataTypes.UserConfigurationMap({data: data});

    uint256 mask = (
      collateralMask ? UserConfiguration.COLLATERAL_MASK : UserConfiguration.BORROWING_MASK
    );

    uint256 mapped = data & mask;

    uint256 id;

    while ((mapped >>= 1) & 1 == 0) {
      id++;
    }
    id /= 2;

    assertEq(config._getFirstAssetIdByMask(mask), id);
  }
}
