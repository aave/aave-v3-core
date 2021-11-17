// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Errors} from '../helpers/Errors.sol';

/**
 * @title WadRayMath library
 * @author Aave
 * @notice Provides functions to perform calculations with Wad and Ray units
 * @dev Provides mul and div function for wads (decimal numbers with 18 digits precision) and rays (decimals with 27 digits)
 **/
library WadRayMath {
  // HALF_WAD and HALF_RAY expressed with extended notation as constant with operations are not supported in Yul assembly
  uint256 internal constant WAD = 1e18;
  uint256 internal constant HALF_WAD = 500000000000000000;

  uint256 public constant RAY = 1e27;
  uint256 internal constant HALF_RAY = 500000000000000000000000000;

  uint256 internal constant WAD_RAY_RATIO = 1e9;

  // Math constants for optimized 512bit computation of rayMul
  uint256 internal constant TWOS_0 = 134217728;
  uint256 internal constant DENOM_DIV_TWOS = 7450580596923828125;
  uint256 internal constant DENOM_DIV_TWOS_INV =
    15501966263465142598656971426345627788199674109747006013765225610400761231029;
  uint256 internal constant TWOS_1 =
    862718293348820473429344482784628181556388621521298319395315527974912;

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
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @param b Wad
   * @return c = a*b, in wad
   **/
  function wadMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - HALF_WAD) / b
    assembly {
      if iszero(or(iszero(b), iszero(gt(a, div(sub(not(0), HALF_WAD), b))))) {
        revert(0, 0)
      }

      c := div(add(mul(a, b), HALF_WAD), WAD)
    }
  }

  /**
   * @dev Divides two wad, rounding half up to the nearest wad
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @param b Wad
   * @return c = a/b, in wad
   **/
  function wadDiv(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / WAD
    assembly {
      if iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), WAD)))) {
        revert(0, 0)
      }

      c := div(add(mul(a, WAD), div(b, 2)), b)
    }
  }

  /**
   * @notice Multiplies two ray, rounding half up to the nearest ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @param b Ray
   * @return c = a raymul b
   **/
  function rayMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // For some reason, if we return from within the assembly, we return completely and not just this function.
    assembly {
      let mm := addmod(mulmod(a, b, not(0)), HALF_RAY, not(0))
      let x0 := add(mul(a, b), HALF_RAY)
      let x1 := sub(sub(mm, x0), lt(mm, x0))

      switch iszero(x1)
      case true {
        c := div(x0, RAY)
      }
      default {
        if lt(RAY, x1) {
          revert(0, 0)
        }

        let remainder := addmod(mulmod(a, b, RAY), HALF_RAY, RAY)
        x1 := sub(x1, gt(remainder, x0))
        x0 := sub(x0, remainder)
        x0 := div(x0, TWOS_0)
        x0 := or(x0, mul(x1, TWOS_1))

        c := mul(x0, DENOM_DIV_TWOS_INV)
      }
    }
    return c;
  }

  /**
   * @notice Divides two ray, rounding half up to the nearest ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @param b Ray
   * @return c = a raydiv b
   **/
  function rayDiv(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / RAY
    assembly {
      if iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), RAY)))) {
        revert(0, 0)
      }

      c := div(add(mul(a, RAY), div(b, 2)), b)
    }
  }

  /**
   * @dev Casts ray down to wad
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Ray
   * @return b = a converted to wad, rounded half up to the nearest wad
   **/
  function rayToWad(uint256 a) internal pure returns (uint256 b) {
    // to avoid overflow, a + HALF_RAY_RATIO >= HALF_RAY_RATIO
    assembly {
      b := add(a, div(WAD_RAY_RATIO, 2))
      if lt(b, div(WAD_RAY_RATIO, 2)) {
        revert(0, 0)
      }
      b := div(b, WAD_RAY_RATIO)
    }
  }

  /**
   * @dev Converts wad up to ray
   * @dev assembly optimized for improved gas savings, see https://twitter.com/transmissions11/status/1451131036377571328
   * @param a Wad
   * @return b = a converted in ray
   **/
  function wadToRay(uint256 a) internal pure returns (uint256 b) {
    // to avoid overflow, b/WAD_RAY_RATIO == a
    assembly {
      b := mul(a, WAD_RAY_RATIO)

      if iszero(eq(div(b, WAD_RAY_RATIO), a)) {
        revert(0, 0)
      }
    }
  }
}
