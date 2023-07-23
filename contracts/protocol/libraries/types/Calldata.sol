pragma solidity ^0.8.0;

library Calldata {
  function getAddress(bytes calldata self, bytes1 pos) internal pure returns (address output) {
    assembly {
      output := calldataload(add(self.offset, pos))
    }
  }

  function getUint256(bytes calldata self, bytes1 pos) internal pure returns (uint output) {
    assembly {
      output := calldataload(add(self.offset, pos))
    }
  }

  function getUint16(bytes calldata self, bytes1 pos) internal pure returns (uint16 output) {
    assembly {
      output := calldataload(add(self.offset, pos))
    }
  }

  function getUint8(bytes calldata self, bytes1 pos) internal pure returns (uint8 output) {
    assembly {
      output := calldataload(add(self.offset, pos))
    }
  }

  function getBool(bytes calldata self, bytes1 pos) internal pure returns (bool output) {
    assembly {
      output := calldataload(add(self.offset, pos))
    }
  }

  function getBytes32(bytes calldata self, bytes1 pos) internal pure returns (bytes32 output) {
    assembly {
      output := calldataload(add(self.offset, pos))
    }
  }
}
