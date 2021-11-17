// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

// import 'hardhat/console.sol';

library RayMathHelper {
  uint256 internal constant RAY = 1e27;
  uint256 internal constant HALF_RAY = 500000000000000000000000000;

  function inv_efficient(uint256 denominator) internal pure returns (uint256 inv) {
    unchecked {
      inv = (3 * denominator) ^ 2;
      // Now use Newton-Raphson itteration to improve the precision.
      // Thanks to Hensel's lifting lemma, this also works in modular
      // arithmetic, doubling the correct bits in each step.
      inv *= 2 - denominator * inv; // inverse mod 2**8
      inv *= 2 - denominator * inv; // inverse mod 2**16
      inv *= 2 - denominator * inv; // inverse mod 2**32
      inv *= 2 - denominator * inv; // inverse mod 2**64
      inv *= 2 - denominator * inv; // inverse mod 2**128
      inv *= 2 - denominator * inv; // inverse mod 2**256
    }
  }

  function computeConstants(uint256 _denominator)
    internal
    pure
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    uint256 denominator = _denominator;
    uint256 twos_0;
    uint256 denom_div_twos;
    uint256 denom_div_twos_inv;
    uint256 twos_1;

    assembly {
      // Only dependent on the denominator, can be precomputed
      // Find the largest power of 2 that divides as number (least significant bit).
      twos_0 := and(sub(0, denominator), denominator)
      // Divide with the least significant bit. But why is this useful
      denom_div_twos := div(denominator, twos_0)
      // 2**256 / twos: divide 2**256 with least significant bit, used to figure out the bitshift
      twos_1 := add(div(sub(0, twos_0), twos_0), 1)
    }
    denom_div_twos_inv = inv_efficient(denom_div_twos);

    return (twos_0, denom_div_twos, denom_div_twos_inv, twos_1);
  }

  function rayMulSlow(uint256 a, uint256 b) internal view returns (uint256 c) {
    uint256 x0;
    uint256 x1;

    assembly {
      // X = x1 * 2**256 + x0
      let mm := addmod(mulmod(a, b, not(0)), HALF_RAY, not(0))
      x0 := add(mul(a, b), HALF_RAY)
      x1 := sub(sub(mm, x0), lt(mm, x0))
    }

    if (x1 == 0) {
      assembly {
        c := div(x0, RAY)
      }
      return c;
    }

    uint256 denominator = RAY;
    uint256 twos;

    assembly {
      if lt(denominator, x1) {
        revert(0, 0)
      }
      // remainder = (a * b + half_ray) % ray
      let remainder := addmod(mulmod(a, b, RAY), HALF_RAY, RAY)

      // Rounds - 1 if reminder needs to loop around
      x1 := sub(x1, gt(remainder, x0))
      // x0 just sub remainder (can underflow)
      x0 := sub(x0, remainder)

      // Only dependent on the denominator, can be precomputed
      // Find the largest power of 2 that divides as number (least significant bit).
      twos := and(sub(0, denominator), denominator)
      // Divide with the least significant bit. But why is this useful
      denominator := div(denominator, twos)
    }
    uint256 inverse = inv_efficient(denominator);

    /*console.log('Twos_0 : ', twos);
    console.log('denom / two: ', denominator);
    console.log('Inverse: ', inverse);*/

    assembly {
      // bitshift x0 with least significant bit index. e.g, Divide x0 with the largest r = 2**n, that divides with no remainder
      x0 := div(x0, twos)

      // 2**256 / twos: divide 2**256 with least significant bit, used to figure out the bitshift
      twos := add(div(sub(0, twos), twos), 1)

      // x1*twos = bitshifting x1 into x0. X0 needed to add as well.
      x0 := or(x0, mul(x1, twos))

      // Multiply with the inverser, need not take x1 into account here
      // as the computation is mod 2**256 and we already got the needed
      // bits from computation above
      c := mul(x0, inverse)
    }
    //console.log('Twos_1 : ', twos);

    return c;
  }
}
