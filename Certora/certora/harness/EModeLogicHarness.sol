import {EModeLogic} from '../../contracts/protocol/libraries/logic/EModeLogic.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';

contract EModeLogicHarness {
mapping(address => DataTypes.ReserveData)  reserves;
    mapping(uint256 => address)  reservesList;
    mapping(uint8 => DataTypes.EModeCategory)  eModeCategories;
    mapping(address => uint8) usersEModeCategory;
    DataTypes.UserConfigurationMap userConfig;
    DataTypes.ExecuteSetUserEModeParams params;

    function test() public {
        EModeLogic.executeSetUserEMode(
          reserves,
          reservesList,
          eModeCategories,
          usersEModeCategory,
          userConfig,
          params
        );
    }
}