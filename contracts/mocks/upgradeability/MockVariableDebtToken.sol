// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {VariableDebtToken} from '../../protocol/tokenization/VariableDebtToken.sol';
import {IPool} from '../../interfaces/IPool.sol';

contract MockVariableDebtToken is VariableDebtToken {
  constructor(IPool pool) VariableDebtToken(pool) {}

  function getRevision() internal pure override returns (uint256) {
    return 0x3;
  }
}
