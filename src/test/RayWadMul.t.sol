// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import 'ds-test/test.sol';

import {UserConfiguration} from './../../contracts/protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {WadRayMul} from './../../contracts/protocol/libraries/configuration/WadRayMul.sol';

contract RayWadMulTest is DSTest {
  using WadRayMul for uint256;

  function testWadMul(uint256 a, uint256 b) public {}
}
