// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title BytesLib
 * @author Aave
 */
library BytesLib {
  /**
   * @notice Converts a dynamic array of bytes to an address
   * @param bys bytes array
   * @return address
   **/
  function toAddress(bytes memory bys) internal pure returns (address) {
    address addr;
    assembly {
      addr := mload(add(bys, 32))
    }
    return addr;
  }
}
