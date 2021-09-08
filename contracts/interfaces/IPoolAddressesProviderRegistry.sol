// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

/**
 * @title PoolAddressesProviderRegistry contract
 * @author Aave
 * @notice Main registry of PoolAddressesProvider of multiple Aave protocol's markets
 * - Used for indexing purposes of Aave protocol's markets
 * - The id assigned to a PoolAddressesProvider refers to the market it is connected with,
 *   for example with `0` for the Aave main market and `1` for the next created
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
   * @return The id or 0 if the PoolAddressesProvider is not registered
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
   * @notice Removes a PoolAddressesProvider from the list of registered addresses provider
   * @param provider The PoolAddressesProvider address
   **/
  function unregisterAddressesProvider(address provider) external;
}
