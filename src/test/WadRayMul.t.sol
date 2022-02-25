// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import 'ds-test/test.sol';

import {WadRayMath} from './../../contracts/protocol/libraries/math/WadRayMath.sol';

import {Vm} from './../Vm.sol';

contract WadRayMathTest is DSTest {
  using WadRayMath for uint256;

  Vm constant VM = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

  function testWadMul(uint256 a, uint256 b) public {
    bool safe = b == 0 || a <= (type(uint256).max - WadRayMath.HALF_WAD) / b;
    VM.assume(safe);
    assertEq(a.wadMul(b), (a * b + WadRayMath.HALF_WAD) / WadRayMath.WAD);
  }

  function testWadDiv(uint256 a, uint256 b) public {
    bool safe = b != 0 && a <= (type(uint256).max - b / 2) / WadRayMath.WAD;
    VM.assume(safe);
    assertEq(a.wadDiv(b), (a * WadRayMath.WAD + b / 2) / b);
  }

  function testRayMul(uint256 a, uint256 b) public {
    bool safe = b == 0 || a <= (type(uint256).max - WadRayMath.HALF_RAY) / b;
    VM.assume(safe);
    assertEq(a.rayMul(b), (a * b + WadRayMath.HALF_RAY) / WadRayMath.RAY);
  }

  function testRayDiv(uint256 a, uint256 b) public {
    bool safe = b != 0 && a <= (type(uint256).max - b / 2) / WadRayMath.RAY;
    VM.assume(safe);
    assertEq(a.rayDiv(b), (a * WadRayMath.RAY + b / 2) / b);
  }

  function testRayToWad(uint256 a) public {
    uint256 remainder = a % WadRayMath.WAD_RAY_RATIO;
    uint256 expectedResult = a / WadRayMath.WAD_RAY_RATIO;
    if (remainder >= WadRayMath.WAD_RAY_RATIO / 2) {
      expectedResult++;
    }
    assertEq(a.rayToWad(), expectedResult);
  }

  function testWadToRay(uint256 a) public {
    bool safe = a <= type(uint256).max / WadRayMath.WAD_RAY_RATIO;
    VM.assume(safe);
    assertEq(a.wadToRay(), a * WadRayMath.WAD_RAY_RATIO);
  }

  /// NEGATIVES ///

  function testFailWadDiv(uint256 a, uint256 b) public {
    bool safe = b != 0 && a <= (type(uint256).max - b / 2) / WadRayMath.WAD;
    VM.assume(!safe);
    a.wadDiv(b);
  }

  function testFailWadMul(uint256 a, uint256 b) public {
    bool safe = b == 0 || a <= (type(uint256).max - WadRayMath.HALF_WAD) / b;
    VM.assume(!safe);
    a.wadMul(b);
  }

  function testFailRayMul(uint256 a, uint256 b) public {
    bool safe = b == 0 || a <= (type(uint256).max - WadRayMath.HALF_RAY) / b;
    VM.assume(!safe);
    a.rayMul(b);
  }

  function testFailRayDiv(uint256 a, uint256 b) public {
    bool safe = b != 0 && a <= (type(uint256).max - b / 2) / WadRayMath.RAY;
    VM.assume(!safe);
    a.rayDiv(b);
  }

  function testFailWadToRay(uint256 a) public {
    bool safe = a <= type(uint256).max / WadRayMath.WAD_RAY_RATIO;
    VM.assume(!safe);
    a.wadToRay();
  }
}
