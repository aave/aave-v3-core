// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {WETH9} from '../../dependencies/weth/WETH9.sol';

contract WETH9Mocked is WETH9 {
  // Mint not backed by Ether: only for testing purposes
  function mint(uint256 value) public returns (bool) {
    balanceOf[msg.sender] += value;
    emit Transfer(address(0), msg.sender, value);
    return true;
  }

  function mint(address account, uint256 value) public returns (bool) {
    balanceOf[account] += value;
    emit Transfer(address(0), account, value);
    return true;
  }
}
