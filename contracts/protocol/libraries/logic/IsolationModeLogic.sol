// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Helpers} from '../helpers/Helpers.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';

/**
 * @title IsolationModeLogic library
 * @author Aave
 * @notice Implements the base logic for handling repayments for assets borrowed in isolation mode
 */
library IsolationModeLogic {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  function executeIsolationModeRepayment(
    mapping(address => DataTypes.ReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ReserveCache memory reserveCache,
    uint256 repayAmount
  ) internal {
    (bool isolationModeActive, address isolationModeCollateralAddress, ) = userConfig
      .getIsolationModeState(reserves, reservesList);

    if (isolationModeActive) {
      uint128 isolationModeTotalDebt = reserves[isolationModeCollateralAddress]
        .isolationModeTotalDebt;

      uint128 isolatedDebtRepaid = Helpers.castUint128(
        repayAmount /
          10 **
            (reserveCache.reserveConfiguration.getDecimals() -
              ReserveConfiguration.DEBT_CEILING_DECIMALS)
      );

      // since the debt ceiling does not take into account the interest accrued, it might happen that amount repaid > debt in isolation mode
      if (isolationModeTotalDebt <= isolatedDebtRepaid) {
        reserves[isolationModeCollateralAddress].isolationModeTotalDebt = 0;
      } else {
        reserves[isolationModeCollateralAddress].isolationModeTotalDebt =
          isolationModeTotalDebt -
          isolatedDebtRepaid;
      }
    }
  }
}
