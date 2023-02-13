pragma solidity 0.8.10;

import {StableDebtToken} from '../munged/protocol/tokenization/StableDebtToken.sol';
import {IncentivizedERC20} from '../munged/protocol/tokenization/base/IncentivizedERC20.sol';
import {IPool} from '../munged/interfaces/IPool.sol';
// import {WadRayMath} from '../munged/protocol/libraries/math/WadRayMath.sol';
// import {MathUtils} from '../munged/protocol/libraries/math/MathUtils.sol';

contract StableDebtTokenHarness is StableDebtToken {

    // using WadRayMath for uint256;

    constructor(IPool pool) public StableDebtToken(pool) {}

    /**
    Simplification: The user accumulates no interest (the balance increase is always 0).
    */
    function balanceOf(address account) public view override returns (uint256) {
        return IncentivizedERC20.balanceOf(account);
    }


    function additionalData(address user) public view returns (uint128) {
        return _userState[user].additionalData;
    }

    function debtTotalSupply() public view returns (uint256) {
        return super.totalSupply();
    }

    // function scaledBalanceOfToBalanceOf(uint256 bal) public pure returns (uint256) {
    //     uint256 rate; uint40 lastUpdateTimestamp; uint256 currentTimestamp;
    //     return bal.rayMul(MathUtils.calculateCompoundedInterest(rate, lastUpdateTimestamp, currentTimestamp));
    // }
}
