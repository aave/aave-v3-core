// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.10;

import {PercentageMath} from './../../contracts/protocol/libraries/math/PercentageMath.sol';

import {Test} from 'forge-std/Test.sol';

contract PercentageMathTest is Test {
  using PercentageMath for uint256;

  function testPercentMul(uint256 a, uint256 b) public pure {
    bool safe = b == 0 || a <= (type(uint256).max - PercentageMath.HALF_PERCENTAGE_FACTOR) / b;
    vm.assume(safe);
    assertEq(
      a.percentMul(b),
      (a * b + PercentageMath.HALF_PERCENTAGE_FACTOR) / PercentageMath.PERCENTAGE_FACTOR
    );
  }

  function testPercentDiv(uint256 a, uint256 b) public pure {
    bool safe = b != 0 && a <= (type(uint256).max - b / 2) / PercentageMath.PERCENTAGE_FACTOR;
    vm.assume(safe);
    assertEq(a.percentDiv(b), (a * PercentageMath.PERCENTAGE_FACTOR + b / 2) / b);
  }

  /// NEGATIVES ///

  function testFailPercentMul(uint256 a, uint256 b) public pure {
    bool safe = b == 0 || a <= (type(uint256).max - PercentageMath.HALF_PERCENTAGE_FACTOR) / b;
    vm.assume(!safe);
    a.percentMul(b);
  }

  function testFailPercentDiv(uint256 a, uint256 b) public pure {
    bool safe = b != 0 && a <= (type(uint256).max - b / 2) / PercentageMath.PERCENTAGE_FACTOR;
    vm.assume(!safe);
    a.percentDiv(b);
  }
}
