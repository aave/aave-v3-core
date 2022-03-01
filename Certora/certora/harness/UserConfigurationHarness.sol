pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {UserConfiguration} from '../../contracts/protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';
import {PoolStorage} from '../../contracts/protocol/pool/PoolStorage.sol';

/*
A wrapper contract for calling functions from the library UserConfiguration.
*/
contract UserConfigurationHarness is PoolStorage {
  DataTypes.UserConfigurationMap public usersConfig;
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

  function isUsingAsCollateralOne() public view returns (bool) {
    return UserConfiguration.isUsingAsCollateralOne(usersConfig);
  }

  function isUsingAsCollateralAny() public view returns (bool) {
    return UserConfiguration.isUsingAsCollateralAny(usersConfig);
  }

  function isBorrowingAny() public view returns (bool) {
    return UserConfiguration.isBorrowingAny(usersConfig);
  }

  function isEmpty() public view returns (bool) {
    return UserConfiguration.isEmpty(usersConfig);
  }

  function getIsolationModeState() 
    public view returns (bool, address, uint256) {
    return UserConfiguration.getIsolationModeState(usersConfig, _reserves, _reservesList);
  }

  function _getFirstAssetAsCollateralId() public view returns(uint256) {
    return UserConfiguration._getFirstAssetAsCollateralId(usersConfig);
  }

  function isIsolated() public view returns (bool) {
    (bool isolated, , ) = getIsolationModeState();
    return isolated;
  }

  /*
		Mimics the original constructor of the contract.
	*/
  function init_state() public {}
}
