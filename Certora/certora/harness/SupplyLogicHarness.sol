pragma solidity 0.8.10;

import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';
import {SupplyLogic} from '../../contracts/protocol/libraries/logic/SupplyLogic.sol';

contract SupplyLogicHarness {
    
    address public asset;
    mapping(address => DataTypes.ReserveData) public reserves;
    mapping(uint256 => address) public reservesList;
    DataTypes.UserConfigurationMap public userConfig;
    mapping(uint8 => DataTypes.EModeCategory) public eModeCategories;
    

    function executeSupply(
        uint256 amount, 
        address onBehalfOf, 
        uint16 referralCode
    ) external {
        DataTypes.ReserveData storage reserve = reserves[asset];
        DataTypes.ReserveCache memory reserveCache = reserve.cache();

        reserve.updateState(reserveCache);

        ValidationLogic.validateSupply(reserveCache, amount);

        reserve.updateInterestRates(reserveCache, asset, amount, 0);

        IERC20(params.asset).safeTransferFrom(msg.sender, reserveCache.aTokenAddress, amount);

        bool isFirstSupply = IAToken(reserveCache.aTokenAddress).mint(
            params.onBehalfOf,
            params.amount,
            reserveCache.nextLiquidityIndex
        );

        if (isFirstSupply) {
            (bool isolationModeActive, , ) = userConfig.getIsolationModeState(reserves, reservesList);
            if (
            ((!isolationModeActive && (reserveCache.reserveConfiguration.getDebtCeiling() == 0)) ||
                !userConfig.isUsingAsCollateralAny())
            ) {
                userConfig.setUsingAsCollateral(reserve.id, true);
            }
        }
    }
}