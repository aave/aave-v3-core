pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {UserConfiguration} from '../munged/protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from '../munged/protocol/libraries/types/DataTypes.sol';
import {PoolStorage} from '../munged/protocol/pool/PoolStorage.sol';

/*
A wrapper contract for calling functions from the library UserConfiguration.
*/
contract UserConfigurationHarness is PoolStorage {
    DataTypes.UserConfigurationMap public usersConfig;
    
    // Sets if the user is borrowing the reserve identified by reserveIndex
    function setBorrowing(uint256 reserveIndex, bool borrowing) public {
        UserConfiguration.setBorrowing(usersConfig, reserveIndex, borrowing);
    }

    //Sets if the user is using as collateral the reserve identified by reserveIndex
    function setUsingAsCollateral(uint256 reserveIndex, bool _usingAsCollateral) public {
        UserConfiguration.setUsingAsCollateral(usersConfig, reserveIndex, _usingAsCollateral);
    }

    // Returns if a user has been using the reserve for borrowing or as collateral
    function isUsingAsCollateralOrBorrowing(uint256 reserveIndex) public view returns (bool) {
        return UserConfiguration.isUsingAsCollateralOrBorrowing(usersConfig, reserveIndex);
    }

    // Validate a user has been using the reserve for borrowing
    function isBorrowing(uint256 reserveIndex) public view returns (bool) {
        return UserConfiguration.isBorrowing(usersConfig, reserveIndex);
    }

    // Validate a user has been using the reserve as collateral
    function isUsingAsCollateral(uint256 reserveIndex) public view returns (bool) {
        return UserConfiguration.isUsingAsCollateral(usersConfig, reserveIndex);
    }

    // Checks if a user has been supplying only one reserve as collateral
    function isUsingAsCollateralOne() public view returns (bool) {
        return UserConfiguration.isUsingAsCollateralOne(usersConfig);
    }

    // Checks if a user has been supplying any reserve as collateral
    function isUsingAsCollateralAny() public view returns (bool) {
        return UserConfiguration.isUsingAsCollateralAny(usersConfig);
    }
    
    // Checks if a user has been borrowing only one asset
    function isBorrowingOne() public view returns (bool) {
        return UserConfiguration.isBorrowingOne(usersConfig);
    }

    // Checks if a user has been borrowing from any reserve
    function isBorrowingAny() public view returns (bool) {
        return UserConfiguration.isBorrowingAny(usersConfig);
    }

    // Checks if a user has not been using any reserve for borrowing or supply
    function isEmpty() public view returns (bool) {
        return UserConfiguration.isEmpty(usersConfig);
    }

    // Returns the Isolation Mode state of the user
    function getIsolationModeState() 
        public view returns (bool, address, uint256) {
        return UserConfiguration.getIsolationModeState(usersConfig, _reserves, _reservesList);
    }

    // Returns the siloed borrowing state for the user
    function getSiloedBorrowingState() public view returns (bool, address) {
        return UserConfiguration.getSiloedBorrowingState(usersConfig, _reserves, _reservesList);
    }
}
