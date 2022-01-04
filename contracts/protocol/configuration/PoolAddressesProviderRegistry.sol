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
  /// Map of address provider ids (addressesProvider => id)
  mapping(address => uint256) private _addressesProviderToId;
  /// Map of id to address provider (id => addressesProvider)
  mapping(uint256 => address) private _idToAddressesProvider;
  address[] private _addressesProvidersList;

  /// @inheritdoc IPoolAddressesProviderRegistry
  function getAddressesProvidersList() external view override returns (address[] memory) {
    uint256 providersListCount = _addressesProvidersList.length;
    uint256 removedProvidersCount = 0;

    address[] memory providers = new address[](providersListCount);

    for (uint256 i = 0; i < providersListCount; i++) {
      if (_addressesProviderToId[_addressesProvidersList[i]] > 0) {
        providers[i - removedProvidersCount] = _addressesProvidersList[i];
      } else {
        removedProvidersCount++;
      }
    }

    // Reduces the length of the providers array by `removedProvidersCount`
    assembly {
      mstore(providers, sub(providersListCount, removedProvidersCount))
    }
    return providers;
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function registerAddressesProvider(address provider, uint256 id) external override onlyOwner {
    require(id != 0, Errors.INVALID_ADDRESSES_PROVIDER_ID);
    require(_idToAddressesProvider[id] == address(0), Errors.INVALID_ADDRESSES_PROVIDER_ID);
    require(_addressesProviderToId[provider] == 0, Errors.ADDRESSES_PROVIDER_ALREADY_ADDED);

    _addressesProviderToId[provider] = id;
    _idToAddressesProvider[id] = provider;

    _addToAddressesProvidersList(provider);
    emit AddressesProviderRegistered(provider);
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function unregisterAddressesProvider(address provider) external override onlyOwner {
    require(_addressesProviderToId[provider] > 0, Errors.PROVIDER_NOT_REGISTERED);

    uint256 oldId = _addressesProviderToId[provider];
    _idToAddressesProvider[oldId] = address(0);

    _addressesProviderToId[provider] = 0;
    emit AddressesProviderUnregistered(provider);
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function getAddressesProviderIdByAddress(address addressesProvider)
    external
    view
    override
    returns (uint256)
  {
    return _addressesProviderToId[addressesProvider];
  }

  /// @inheritdoc IPoolAddressesProviderRegistry
  function getAddressesProviderAddressById(uint256 id) external view override returns (address) {
    return _idToAddressesProvider[id];
  }

  /**
   * @notice Adds the addresses provider address to the list.
   * @dev The addressesProvider must not already exists in the registry
   * @param provider The address of the PoolAddressesProvider
   */
  function _addToAddressesProvidersList(address provider) internal {
    uint256 providersCount = _addressesProvidersList.length;

    for (uint256 i = 0; i < providersCount; i++) {
      require(_addressesProvidersList[i] != provider, Errors.ADDRESSES_PROVIDER_ALREADY_ADDED);
    }

    _addressesProvidersList.push(provider);
  }
}
