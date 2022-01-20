// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

contract SelfdestructTransfer {
  function destroyAndTransfer(address payable to) external payable {
    selfdestruct(to);
  }
}
