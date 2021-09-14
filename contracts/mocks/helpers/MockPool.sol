// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

contract MockPool {
  // Reserved storage space to avoid layout collisions.
  uint256[100] private ______gap;

  address _addressesProvider;
  address[] _reserveList;

  function initialize(address provider) public {
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
  function getRevision() internal pure override returns (uint256) {
    return 0x3;
  }

  function setMaxNumberOfReserves(uint256 newMaxNumberOfReserves) public {
    _maxNumberOfReserves = newMaxNumberOfReserves;
  }
}
