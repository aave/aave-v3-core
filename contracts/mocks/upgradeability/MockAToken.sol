// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {AToken} from '../../protocol/tokenization/AToken.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IAaveIncentivesController} from '../../interfaces/IAaveIncentivesController.sol';

contract MockAToken is AToken {
  function getRevision() internal pure override returns (uint256) {
    return 0x2;
  }
}
