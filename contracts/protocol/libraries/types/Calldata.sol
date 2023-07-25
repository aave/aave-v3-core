pragma solidity ^0.8.0;

library Calldata {
  function getAddress(bytes calldata self) internal pure returns (address output) {
    assembly {
      output := calldataload(self.offset)
    }
  }

  function getAddress(bytes calldata self, uint8 index) internal pure returns (address output) {
    assembly {
      output := calldataload(add(self.offset, mul(index, 0x20)))
    }
  }

  function getUint256(bytes calldata self, uint8 index) internal pure returns (uint output) {
    assembly {
      output := calldataload(add(self.offset, mul(index, 0x20)))
    }
  }

  function getUint16(bytes calldata self, uint8 index) internal pure returns (uint16 output) {
    assembly {
      output := calldataload(add(self.offset, mul(index, 0x20)))
    }
  }

  function getUint8(bytes calldata self, uint8 index) internal pure returns (uint8 output) {
    assembly {
      output := calldataload(add(self.offset, mul(index, 0x20)))
    }
  }

  function getBool(bytes calldata self, uint8 index) internal pure returns (bool output) {
    assembly {
      output := calldataload(add(self.offset, mul(index, 0x20)))
    }
  }

  function getBytes32(bytes calldata self, uint8 index) internal pure returns (bytes32 output) {
    assembly {
      output := calldataload(add(self.offset, mul(index, 0x20)))
    }
  }
}
