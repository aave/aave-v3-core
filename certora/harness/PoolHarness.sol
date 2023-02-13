// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {Pool} from '../munged/protocol/pool/Pool.sol';
import {DataTypes} from '../munged/protocol/libraries/types/DataTypes.sol';
import {ReserveLogic} from '../munged/protocol/libraries/logic/ReserveLogic.sol';
import {IPoolAddressesProvider} from '../munged/interfaces/IPoolAddressesProvider.sol';

contract PoolHarness is Pool {
    
    using ReserveLogic for DataTypes.ReserveData;
    using ReserveLogic for DataTypes.ReserveCache;

    constructor(IPoolAddressesProvider provider) public Pool(provider){}

    function getCurrScaledVariableDebt(address asset) public view returns (uint256){
        DataTypes.ReserveData storage reserve = _reserves[asset];
        DataTypes.ReserveCache memory reserveCache = reserve.cache();
        return reserveCache.currScaledVariableDebt;
    }
}
