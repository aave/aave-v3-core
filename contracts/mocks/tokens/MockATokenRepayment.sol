// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {AToken} from '../../protocol/tokenization/AToken.sol';
import {IPool} from '../../interfaces/IPool.sol';

contract MockATokenRepayment is AToken {
  event MockRepayment(address user, address onBehalfOf, uint256 amount);

  constructor(IPool pool) AToken(pool) {}

  function getRevision() internal pure override returns (uint256) {
    return 0x2;
  }

  function handleRepayment(
    address user,
    address onBehalfOf,
    uint256 amount
  ) external override onlyPool {
    emit MockRepayment(user, onBehalfOf, amount);
  }
}
