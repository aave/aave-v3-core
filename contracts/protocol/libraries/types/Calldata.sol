pragma solidity ^0.8.0;

library Calldata {
  function getAddress(bytes calldata self) internal pure returns (address output) {
    assembly {
      output := calldataload(self.offset)
    }
  }

  function getAddress(bytes calldata self, bytes1 offset) internal pure returns (address output) {
    assembly {
      output := calldataload(add(self.offset, offset))
    }
  }

  function getUint256(bytes calldata self, bytes1 offset) internal pure returns (uint output) {
    assembly {
      output := calldataload(add(self.offset, offset))
    }
  }

  function getUint16(bytes calldata self, bytes1 offset) internal pure returns (uint16 output) {
    assembly {
      output := calldataload(add(self.offset, offset))
    }
  }

  function getUint8(bytes calldata self, bytes1 offset) internal pure returns (uint8 output) {
    assembly {
      output := calldataload(add(self.offset, offset))
    }
  }

  function getBool(bytes calldata self, bytes1 offset) internal pure returns (bool output) {
    assembly {
      output := calldataload(add(self.offset, offset))
    }
  }

  function getBytes32(bytes calldata self, bytes1 offset) internal pure returns (bytes32 output) {
    assembly {
      output := calldataload(add(self.offset, offset))
    }
  }
}
