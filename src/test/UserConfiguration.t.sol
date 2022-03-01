// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import {UserConfiguration} from './../../contracts/protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from './../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';

import {TestHelper} from './TestHelper.sol';
import {Vm} from './../Vm.sol';

contract UserConfigurationTest is TestHelper {
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  Vm constant VM = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

  DataTypes.UserConfigurationMap internal config;

  mapping(address => DataTypes.ReserveData) internal reservesData;
  mapping(uint256 => address) internal reservesList;

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

  function testGetIsolationModeState(
    address[6] calldata assets,
    uint256[6] calldata assetConfigurationMaps,
    uint40[6] calldata debtCeilings,
    uint8 collateralCount,
    uint8 borrowCount
  ) public {
    VM.assume(collateralCount <= 3 && borrowCount <= 3);
    if (collateralCount == 0) {
      borrowCount = 0;
    }

    bool expectedIsolated = collateralCount == 1 &&
      debtCeilings[0] > 0 &&
      debtCeilings[0] < type(uint32).max;

    uint256 reservesCount = 0;
    config = DataTypes.UserConfigurationMap({data: 0});

    for (uint256 i = 0; i < collateralCount + borrowCount; i++) {
      reservesList[reservesCount++] = assets[i];
      DataTypes.ReserveConfigurationMap memory assetConfig = DataTypes.ReserveConfigurationMap({
        data: assetConfigurationMaps[i] & ReserveConfiguration.DEBT_CEILING_MASK
      });

      if (i < collateralCount) {
        if (expectedIsolated) {
          assetConfig.setDebtCeiling(debtCeilings[i]);
        }
        config.setUsingAsCollateral(i, true);
      } else {
        config.setBorrowing(i, true);
      }
      reservesData[assets[i]].configuration = assetConfig;
    }

    (bool isolated, address asset, uint256 ceiling) = config.getIsolationModeState(
      reservesData,
      reservesList
    );

    uint256 expectedCeiling = expectedIsolated ? debtCeilings[0] : 0;
    address expectedAsset = expectedIsolated ? assets[0] : address(0);

    assertEq(isolated, expectedIsolated);
    assertEq(asset, expectedAsset);
    assertEq(ceiling, expectedCeiling);
  }

  function testGetSiloedBorrowingState(
    address[6] calldata assets,
    uint256[6] calldata assetConfigurationMaps,
    uint8 collateralCount,
    uint8 borrowCount,
    bool siloedBorrowing
  ) public {
    VM.assume(collateralCount <= 3 && borrowCount <= 3);
    if (collateralCount == 0) {
      borrowCount = 0;
    }
    if (siloedBorrowing) {
      borrowCount = 1;
    }

    uint256 reservesCount = 0;
    config = DataTypes.UserConfigurationMap({data: 0});

    for (uint256 i = 0; i < collateralCount + borrowCount; i++) {
      reservesList[reservesCount++] = assets[i];
      DataTypes.ReserveConfigurationMap memory assetConfig = DataTypes.ReserveConfigurationMap({
        data: assetConfigurationMaps[i] & ReserveConfiguration.SILOED_BORROWING_MASK
      });

      if (i < collateralCount) {
        config.setUsingAsCollateral(i, true);
      } else {
        config.setBorrowing(i, true);
        if (siloedBorrowing) {
          assetConfig.setSiloedBorrowing(true);
        }
      }
      reservesData[assets[i]].configuration = assetConfig;
    }

    (bool siloed, address siloedAsset) = config.getSiloedBorrowingState(reservesData, reservesList);

    assertEq(siloed, siloedBorrowing);
    assertEq(siloedAsset, siloedBorrowing ? assets[collateralCount] : address(0));
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
