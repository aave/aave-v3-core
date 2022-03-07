// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import 'ds-test/test.sol';

contract TestHelper is DSTest {
  function assertNotEq(address a, address b) internal {
    if (a == b) {
      emit log('Error: a != b not satisfied [address]');
      emit log_named_address('  Expected', b);
      emit log_named_address('    Actual', a);
      fail();
    }
  }

  function assertEq(bool a, bool b) internal {
    if (a != b) {
      emit log('Error: a == b not satisfied [bool]');
      fail();
    }
  }

  function assertEq(
    bool a,
    bool b,
    string memory err
  ) internal {
    if (a != b) {
      emit log_named_string('Error', err);
      assertEq(a, b);
    }
  }

  function _countBitsOn(uint256 a) internal returns (uint256) {
    uint256 counter = 0;
    while (a > 0) {
      if (a & 1 == 1) {
        counter++;
      }
      a >>= 1;
    }
    return counter;
  }
}
