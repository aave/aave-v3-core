// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {Errors} from '../helpers/Errors.sol';

/**
 * @title WadRayMath library
 * @author Aave
 * @notice Provides functions to perform calculations with Wad and Ray units
 * @dev Provides mul and div function for wads (decimal numbers with 18 digits precision) and rays (decimals with 27 digits)
 **/
library WadRayMath {
  uint256 internal constant WAD = 1e18;
  uint256 internal constant HALF_WAD = WAD / 2;

  uint256 public constant RAY = 1e27;
  uint256 internal constant HALF_RAY = 500000000000000000000000000;

  uint256 internal constant WAD_RAY_RATIO = 1e9;

  /**
   * @return One wad, 1e18
   **/

  function wad() internal pure returns (uint256) {
    return WAD;
  }

  /**
   * @return Half ray, 1e27/2
   **/
  function halfRay() internal pure returns (uint256) {
    return HALF_RAY;
  }

  /**
   * @return Half ray, 1e18/2
   **/
  function halfWad() internal pure returns (uint256) {
    return HALF_WAD;
  }

  /**
   * @dev Multiplies two wad, rounding half up to the nearest wad
   * @param a Wad
   * @param b Wad
   * @return The result of a*b, in wad
   **/
  function wadMul(uint256 a, uint256 b) internal pure returns (uint256) {
    unchecked {
      if (a == 0 || b == 0) {
        return 0;
      }

      require(a <= (type(uint256).max - HALF_WAD) / b, Errors.MATH_MULTIPLICATION_OVERFLOW);

      return (a * b + HALF_WAD) / WAD;
    }
  }

  /**
   * @dev Divides two wad, rounding half up to the nearest wad
   * @param a Wad
   * @param b Wad
   * @return The result of a/b, in wad
   **/
  function wadDiv(uint256 a, uint256 b) internal pure returns (uint256) {
    unchecked {
      uint256 halfB = b / 2;

      require(a <= (type(uint256).max - halfB) / WAD, Errors.MATH_MULTIPLICATION_OVERFLOW);

      return (a * WAD + halfB) / b;
    }
  }

  /**
   * @notice Multiplies two ray, rounding half up to the nearest ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @param b Ray
   * @return z = a raymul b
   **/
  function rayMul(uint256 a, uint256 b) internal pure returns (uint256 z) {
    // to avoid overflow, a <= (type(uint256).max - HALF_RAY) / b
    assembly {
      if iszero(or(iszero(b), iszero(gt(a, div(sub(not(0), HALF_RAY), b))))) {
        revert(0, 0)
      }

      z := div(add(mul(a, b), HALF_RAY), RAY)
    }
  }

  /**
   * @notice Divides two ray, rounding half up to the nearest ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @param b Ray
   * @return z = a raydiv b
   **/
  function rayDiv(uint256 a, uint256 b) internal pure returns (uint256 z) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / RAY
    assembly {
      if iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), RAY)))) {
        revert(0, 0)
      }

      z := div(add(mul(a, RAY), div(b, 2)), b)
    }
  }

  /**
   * @dev Casts ray down to wad
   * @param a Ray
   * @return a casted to wad, rounded half up to the nearest wad
   **/
  function rayToWad(uint256 a) internal pure returns (uint256) {
    unchecked {
      uint256 halfRatio = WAD_RAY_RATIO / 2;
      uint256 result = halfRatio + a;
      require(result >= halfRatio, Errors.MATH_ADDITION_OVERFLOW);

      return result / WAD_RAY_RATIO;
    }
  }

  /**
   * @dev Converts wad up to ray
   * @param a Wad
   * @return result a converted in ray
   **/
  function wadToRay(uint256 a) internal pure returns (uint256 result) {
    // to avoid overflow, result/WAD_RAY_RATIO == a
    assembly {
      result := mul(a, WAD_RAY_RATIO)

      if iszero(eq(div(result, WAD_RAY_RATIO), a)) {
        revert(0, 0)
      }
    }
  }
}
