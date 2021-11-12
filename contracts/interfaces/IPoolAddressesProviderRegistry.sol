// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title IPoolAddressesProviderRegistry
 * @author Aave
 * @notice Defines the basic interface for an Aave Pool Addresses Provider Registry.
 **/
interface IPoolAddressesProviderRegistry {
  event AddressesProviderRegistered(address indexed newAddress);
  event AddressesProviderUnregistered(address indexed newAddress);

  /**
   * @notice Returns the list of registered addresses provider
   * @return The list of addresses provider, potentially containing address(0) elements
   **/
  function getAddressesProvidersList() external view returns (address[] memory);

  /**
   * @notice Returns the id on a registered PoolAddressesProvider
   * @param addressesProvider The address of the PoolAddressesProvider
   * @return The id of the PoolAddressesProvider or 0 if is not registered
   */
  function getAddressesProviderIdByAddress(address addressesProvider)
    external
    view
    returns (uint256);

  /**
   * @notice Registers an addresses provider
   * @param provider The address of the new PoolAddressesProvider
   * @param id The id for the new PoolAddressesProvider, referring to the market it belongs to
   **/
  function registerAddressesProvider(address provider, uint256 id) external;

  /**
   * @notice Removes a PoolAddressesProvider from the list of registered addresses providers
   * @param provider The PoolAddressesProvider address
   **/
  function unregisterAddressesProvider(address provider) external;
}
