// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {IFlashLoanReceiver} from '../../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {Errors} from '../helpers/Errors.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';

/**
 * @title EModeLogic library
 * @author Aave
 * @notice Implements the base logic for all the actions related to the eMode
 */
library EModeLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using SafeERC20 for IERC20;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  // See `IPool` for descriptions
  event UserEModeSet(address indexed user, uint8 categoryId);

  function executeSetUserEMode(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    mapping(address => uint8) storage usersEModeCategory,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteSetUserEModeParams memory params
  ) external {
    ValidationLogic.validateSetUserEMode(
      reserves,
      reservesList,
      eModeCategories,
      userConfig,
      params.reservesCount,
      params.categoryId
    );

    uint8 prevCategoryId = usersEModeCategory[msg.sender];
    usersEModeCategory[msg.sender] = params.categoryId;

    if (prevCategoryId != 0) {
      ValidationLogic.validateHealthFactor(
        reserves,
        reservesList,
        eModeCategories,
        userConfig,
        msg.sender,
        params.categoryId,
        params.reservesCount,
        params.oracle
      );
    }
    emit UserEModeSet(msg.sender, params.categoryId);
  }
}
