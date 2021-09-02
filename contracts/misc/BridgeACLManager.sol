// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IBridgeACLManager} from './../interfaces/IBridgeACLManager.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';
import {IPool} from './../interfaces/IPool.sol';
import {IPoolAddressesProvider} from './../interfaces/IPoolAddressesProvider.sol';
import {IERC20} from './../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from './../dependencies/openzeppelin/contracts/SafeERC20.sol';

contract BridgeACLManager is IBridgeACLManager, Ownable {
  using SafeERC20 for IERC20;

  mapping(address => bool) internal _allowedToMint;

  IPool public immutable override POOL;

  constructor(IPoolAddressesProvider provider) public {
    POOL = IPool(provider.getPool());
  }

  modifier onlyMinter() {
    require(_allowedToMint[msg.sender], 'BridgeACLManager: caller is not a minter');
    _;
  }

  function setAllowedToMint(address user, bool value) external override onlyOwner {
    _allowedToMint[user] = value;
    emit SetAllowedToMint(user, value);
  }

  function isAllowedToMint(address user) external view override returns (bool) {
    return _allowedToMint[user];
  }

  ///@inheritdoc IBridgeACLManager
  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override onlyMinter {
    POOL.mintUnbacked(asset, amount, onBehalfOf, referralCode);
  }

  ///@inheritdoc IBridgeACLManager
  function backUnbacked(
    address asset,
    uint256 amount,
    uint256 fee
  ) external override onlyMinter {
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount + fee);
    IERC20(asset).safeApprove(address(POOL), amount + fee);
    POOL.backUnbacked(asset, amount, fee);
  }
}
