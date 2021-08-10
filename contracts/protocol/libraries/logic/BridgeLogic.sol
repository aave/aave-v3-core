// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {DataTypes} from './../types/DataTypes.sol';

library BridgeLogic {
  function mintUnbacked() public {
    // TODO: Access control must be enforced before this call
    require(false, 'NOT-IMPLEMENTED');
  }

  function backUnbacked() public {
    // TODO: pull funds, compute how much that is in scaled. Transfer it to aToken.
    require(false, 'NOT-IMPLEMENTED');
  }
}
