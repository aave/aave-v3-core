// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {IAaveIncentivesController} from '../../interfaces/IAaveIncentivesController.sol';

contract MockIncentivesController is IAaveIncentivesController {
  function handleAction(address, uint256, uint256) external override {}
}
