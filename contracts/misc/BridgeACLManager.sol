// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {AccessControl} from '../dependencies/openzeppelin/contracts/access/AccessControl.sol';
import {IBridgeACLManager} from './../interfaces/IBridgeACLManager.sol';
import {IPool} from './../interfaces/IPool.sol';
import {IPoolAddressesProvider} from './../interfaces/IPoolAddressesProvider.sol';
import {IERC20} from './../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from './../dependencies/openzeppelin/contracts/SafeERC20.sol';

contract BridgeACLManager is IBridgeACLManager, AccessControl {
  using SafeERC20 for IERC20;

  bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

  IPool public immutable override POOL;

  constructor(IPoolAddressesProvider provider, address admin) public {
    _setupRole(DEFAULT_ADMIN_ROLE, admin);
    POOL = IPool(provider.getPool());
  }

  ///@inheritdoc IBridgeACLManager
  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override onlyRole(MINTER_ROLE) {
    POOL.mintUnbacked(asset, amount, onBehalfOf, referralCode);
  }

  ///@inheritdoc IBridgeACLManager
  function backUnbacked(
    address asset,
    uint256 amount,
    uint256 fee
  ) external override onlyRole(MINTER_ROLE) {
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount + fee);
    IERC20(asset).safeApprove(address(POOL), amount + fee);
    POOL.backUnbacked(asset, amount, fee);
  }
}
