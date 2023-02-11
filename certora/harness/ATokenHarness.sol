// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Pool} from '../munged/protocol/pool/Pool.sol';
import {AToken} from '../munged/protocol/tokenization/AToken.sol';
import {WadRayMath} from '../munged/protocol/libraries/math/WadRayMath.sol';

/**
 * @title Certora harness for Aave ERC20 AToken
 *
 * @dev Certora's harness contract for the verification of Aave ERC20 AToken.
 */
contract ATokenHarness is AToken {

using WadRayMath for uint256;

  constructor(Pool pool) public AToken(pool) {}

  function scaledTotalSupply() public view override returns (uint256) {
    uint256 val = super.scaledTotalSupply();
    return val;
  }

  function additionalData(address user) public view returns (uint128) {
    return _userState[user].additionalData;
  }
  
  function scaledBalanceOfToBalanceOf(uint256 bal) public view returns (uint256) {
    return bal.rayMul(POOL.getReserveNormalizedIncome(_underlyingAsset));
  }
}