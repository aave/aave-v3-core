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

  /// From https://github.com/Rari-Capital/solmate/blob/67d907c82f50649f8168061dcfae8617110da361/src/test/utils/DSTestPlus.sol#L116-L135
  function bound(
    uint256 x,
    uint256 min,
    uint256 max
  ) internal pure returns (uint256 result) {
    require(max >= min, 'MAX_LESS_THAN_MIN');

    uint256 size = max - min;

    if (max != type(uint256).max) size++; // Make the max inclusive.
    if (size == 0) return min; // Using max would be equivalent as well.
    // Ensure max is inclusive in cases where x != 0 and max is at uint max.
    if (max == type(uint256).max && x != 0) x--; // Accounted for later.

    if (x < min) x += size * (((min - x) / size) + 1);
    result = min + ((x - min) % size);

    // Account for decrementing x to make max inclusive.
    if (max == type(uint256).max && x != 0) result++;
  }

  function max(uint256 a, uint256 b) internal pure returns (uint256) {
    return a > b ? a : b;
  }
}
