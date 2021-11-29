// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Errors} from '../../protocol/libraries/helpers/Errors.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';

contract MockPool {
  // Reserved storage space to avoid layout collisions.
  uint256[100] private ______gap;

  address _addressesProvider;
  address[] _reserveList;

  function initialize(address provider) external {
    _addressesProvider = provider;
  }

  function addReserveToReservesList(address _reserve) external {
    _reserveList.push(_reserve);
  }

  function getReservesList() external view returns (address[] memory) {
    address[] memory reservesList = new address[](_reserveList.length);
    for (uint256 i; i < _reserveList.length; i++) {
      reservesList[i] = _reserveList[i];
    }
    return reservesList;
  }
}

import {Pool} from '../../protocol/pool/Pool.sol';

contract MockPoolInherited is Pool {
  uint256 internal _maxNumberOfReserves = 128;

  function getRevision() internal pure override returns (uint256) {
    return 0x3;
  }

  function setMaxNumberOfReserves(uint256 newMaxNumberOfReserves) public {
    _maxNumberOfReserves = newMaxNumberOfReserves;
  }

  function MAX_NUMBER_RESERVES() public view override returns (uint256) {
    return _maxNumberOfReserves;
  }

  function _addReserveToList(address asset) internal override {
    uint256 reservesCount = _reservesCount;
    require(reservesCount < _maxNumberOfReserves, Errors.P_NO_MORE_RESERVES_ALLOWED);
    bool reserveAlreadyAdded = _reserves[asset].id != 0 || _reservesList[0] == asset;

    if (!reserveAlreadyAdded) {
      for (uint8 i = 0; i <= reservesCount; i++) {
        if (_reservesList[i] == address(0)) {
          _reserves[asset].id = i;
          _reservesList[i] = asset;
          _reservesCount = uint16(reservesCount + 1);
        }
      }
    }
  }
}
