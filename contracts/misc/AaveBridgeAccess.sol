// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IAaveBridgeAccessControl} from './../interfaces/IAaveBridgeAccessControl.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';
import {IPool} from './../interfaces/IPool.sol';
import {IPoolAddressesProvider} from './../interfaces/IPoolAddressesProvider.sol';

contract AaveBridgeAccessControl is IAaveBridgeAccessControl, Ownable {
  mapping(address => bool) internal _allowedToMint;

  IPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;

  constructor(IPoolAddressesProvider provider) public {
    ADDRESSES_PROVIDER = provider;
  }

  modifier onlyMinter() {
    require(_allowedToMint[msg.sender], 'AaveBridgeAccessControl: caller is not a minter');
    _;
  }

  function setAllowedToMint(address user, bool value) external override onlyOwner {
    _allowedToMint[user] = value;
    emit SetAllowedToMint(user, value);
  }

  function isAllowedToMint(address user) external view override returns (bool) {
    return _allowedToMint[user];
  }

  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override onlyMinter {
    IPool(ADDRESSES_PROVIDER.getPool()).mintUnbacked(asset, amount, onBehalfOf, referralCode);
  }
}
