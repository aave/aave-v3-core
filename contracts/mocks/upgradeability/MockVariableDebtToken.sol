// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {VariableDebtToken} from '../../protocol/tokenization/VariableDebtToken.sol';
import {IPool} from '../../interfaces/IPool.sol';

contract MockVariableDebtToken is VariableDebtToken {
  constructor(IPool pool) VariableDebtToken(pool) {}

  function getRevision() internal pure override returns (uint256) {
    return 0x3;
  }
}
