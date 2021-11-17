// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {WadRayMath} from '../../protocol/libraries/math/WadRayMath.sol';
import {RayMathHelper} from '../../protocol/libraries/math/RayMathHelper.sol';

contract WadRayMathWrapper {
  uint256 internal constant RAY = 1e27;
  uint256 internal constant HALF_RAY = 500000000000000000000000000;

  function wad() public pure returns (uint256) {
    return WadRayMath.wad();
  }

  function ray() public pure returns (uint256) {
    return WadRayMath.RAY;
  }

  function halfRay() public pure returns (uint256) {
    return WadRayMath.halfRay();
  }

  function halfWad() public pure returns (uint256) {
    return WadRayMath.halfWad();
  }

  function wadMul(uint256 a, uint256 b) public pure returns (uint256) {
    return WadRayMath.wadMul(a, b);
  }

  function wadDiv(uint256 a, uint256 b) public pure returns (uint256) {
    return WadRayMath.wadDiv(a, b);
  }

  function rayMul(uint256 a, uint256 b) public pure returns (uint256) {
    return WadRayMath.rayMul(a, b);
  }

  function rayDiv(uint256 a, uint256 b) public pure returns (uint256) {
    return WadRayMath.rayDiv(a, b);
  }

  function rayToWad(uint256 a) public pure returns (uint256) {
    return WadRayMath.rayToWad(a);
  }

  function wadToRay(uint256 a) public pure returns (uint256) {
    return WadRayMath.wadToRay(a);
  }

  function rayMulSlow(uint256 a, uint256 b) public view returns (uint256) {
    return RayMathHelper.rayMulSlow(a, b);
  }

  function computeConstants(uint256 denominator)
    public
    pure
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    return RayMathHelper.computeConstants(denominator);
  }
}
