// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {VariableDebtToken} from '../munged/protocol/tokenization/VariableDebtToken.sol';
import {WadRayMath} from '../munged/protocol/libraries/math/WadRayMath.sol';
import {IPool} from '../munged/interfaces/IPool.sol';

contract VariableDebtTokenHarness is VariableDebtToken {

using WadRayMath for uint256;

    constructor(IPool pool) public VariableDebtToken(pool) {}

    function scaledBalanceOfToBalanceOf(uint256 bal) public view returns (uint256) {
        return bal.rayMul(POOL.getReserveNormalizedVariableDebt(_underlyingAsset));
    }
}
