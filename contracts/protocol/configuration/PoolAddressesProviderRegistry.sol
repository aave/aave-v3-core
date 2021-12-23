// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Ownable} from '../../dependencies/openzeppelin/contracts/Ownable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IPoolAddressesProviderRegistry} from '../../interfaces/IPoolAddressesProviderRegistry.sol';

/**
 * @title PoolAddressesProviderRegistry
 * @author Aave
 * @notice Main registry of PoolAddressesProvider of Aave markets.
 * @dev Used for indexing purposes of Aave protocol's markets. The id assigned
 *   to a PoolAddressesProvider refers to the market it is connected with, for
 *   example with `1` for the Aave main market and `2` for the next created.
 **/
contract PoolAddressesProviderRegistry is Ownable, IPoolAddressesProviderRegistry {
  mapping(address => uint256) private _addressesProviders;
  mapping(address => uint256) private _addressesProvidersIndexes;
  address[] private _addressesProvidersList;

  /// @inheritdoc IPoolAddressesProviderRegistry
  function getAddressesProvidersList() external view override returns (address[] memory) {
    return _addressesProvidersList;
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function registerAddressesProvider(address provider, uint256 id) external override onlyOwner {
    require(id != 0, Errors.PAPR_INVALID_ADDRESSES_PROVIDER_ID);

    _addressesProviders[provider] = id;
    _addToAddressesProvidersList(provider);
    emit AddressesProviderRegistered(provider);
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function unregisterAddressesProvider(address provider) external override onlyOwner {
    require(_addressesProviders[provider] > 0, Errors.PAPR_PROVIDER_NOT_REGISTERED);
    _removeFromAddressesProvidersList(provider);
    emit AddressesProviderUnregistered(provider);
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function getAddressesProviderIdByAddress(address addressesProvider)
    external
    view
    override
    returns (uint256)
  {
    return _addressesProviders[addressesProvider];
  }

  /**
   * @notice Adds the addresses provider address to the list.
   * @dev The addressesProvider is not added if it already exists in the registry
   * @param provider The address of the PoolAddressesProvider
   */
  function _addToAddressesProvidersList(address provider) internal {
    uint256 providersCount = _addressesProvidersList.length;

    if (providersCount != 0) {
      uint256 index = _addressesProvidersIndexes[provider];
      if (_addressesProvidersList[index] == provider) {
        return;
      }
    }

    _addressesProvidersIndexes[provider] = _addressesProvidersList.length;
    _addressesProvidersList.push(provider);
  }

  /**
   * @notice Removes the addresses provider address from the list.
   * @param provider The address of the PoolAddressesProvider
   */
  function _removeFromAddressesProvidersList(address provider) internal {
    uint256 index = _addressesProvidersIndexes[provider];

    _addressesProviders[provider] = 0;
    _addressesProvidersIndexes[provider] = 0;

    uint256 lastIndex = _addressesProvidersList.length - 1;
    if (index < lastIndex) {
      address lastProvider = _addressesProvidersList[lastIndex];
      _addressesProvidersList[index] = lastProvider;
      _addressesProvidersIndexes[lastProvider] = index;
    }
    _addressesProvidersList.pop();
  }
}
