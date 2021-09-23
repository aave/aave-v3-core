// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {UserConfiguration} from '../libraries/configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../libraries/configuration/ReserveConfiguration.sol';
import {ReserveLogic} from '../libraries/logic/ReserveLogic.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';

/**
 * @title PoolStorage
 * @author Aave
 * @notice Contract used as storage of the Pool contract.
 * @dev It defines the storage layout of the Pool contract.
 */
contract PoolStorage {
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  IPoolAddressesProvider internal _addressesProvider;

  mapping(address => DataTypes.ReserveData) internal _reserves;
  mapping(address => DataTypes.UserConfigurationMap) internal _usersConfig;

  // the list of the available reserves, structured as a mapping for gas savings reasons
  mapping(uint256 => address) internal _reservesList;

  uint256 internal _reservesCount;

  uint256 internal _maxStableRateBorrowSizePercent;

  uint256 internal _flashLoanPremiumTotal;

  uint256 internal _maxNumberOfReserves;

  uint256 internal _flashLoanPremiumToProtocol;
}
