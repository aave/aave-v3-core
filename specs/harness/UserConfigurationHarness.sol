pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {
  UserConfiguration
} from '../../contracts/protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';

/*
A wrapper contract for calling functions from the library UserConfiguration.
*/
contract UserConfigurationHarness {
  DataTypes.UserConfigurationMap internal usersConfig;

  function setBorrowing(uint256 reserveIndex, bool borrowing) public {
    UserConfiguration.setBorrowing(usersConfig, reserveIndex, borrowing);
  }

  function setUsingAsCollateral(uint256 reserveIndex, bool _usingAsCollateral) public {
    UserConfiguration.setUsingAsCollateral(usersConfig, reserveIndex, _usingAsCollateral);
  }

  function isUsingAsCollateralOrBorrowing(uint256 reserveIndex) public view returns (bool) {
    return UserConfiguration.isUsingAsCollateralOrBorrowing(usersConfig, reserveIndex);
  }

  function isBorrowing(uint256 reserveIndex) public view returns (bool) {
    return UserConfiguration.isBorrowing(usersConfig, reserveIndex);
  }

  function isUsingAsCollateral(uint256 reserveIndex) public view returns (bool) {
    return UserConfiguration.isUsingAsCollateral(usersConfig, reserveIndex);
  }

  function isBorrowingAny() public view returns (bool) {
    return UserConfiguration.isBorrowingAny(usersConfig);
  }

  function isEmpty() public view returns (bool) {
    return UserConfiguration.isEmpty(usersConfig);
  }

  /*
		Mimics the original constructor of the contract.
	*/
  function init_state() public {}
}
