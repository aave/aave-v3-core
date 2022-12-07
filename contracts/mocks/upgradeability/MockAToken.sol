// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {AToken} from '../../protocol/tokenization/AToken.sol';
import {IPool} from '../../interfaces/IPool.sol';

contract MockAToken is AToken {
  constructor(IPool pool) AToken(pool) {}

  function getRevision() internal pure override returns (uint256) {
    return 0x2;
  }
}
