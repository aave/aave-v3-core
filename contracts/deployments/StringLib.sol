// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

library StringLib {
  function concat(string memory a, string memory b) internal pure returns (string memory) {
    return string(abi.encodePacked(a, b));
  }
}
