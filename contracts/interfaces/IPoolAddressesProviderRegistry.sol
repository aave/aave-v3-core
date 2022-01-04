// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title IPoolAddressesProviderRegistry
 * @author Aave
 * @notice Defines the basic interface for an Aave Pool Addresses Provider Registry.
 **/
interface IPoolAddressesProviderRegistry {
  /**
   * @notice Emitted when a new AddressesProvider is registered.
   * @param addressesProvider The address of the registered PoolAddressesProvider
   * @param id The id of the registered PoolAddressesProvider
   */
  event AddressesProviderRegistered(address indexed addressesProvider, uint256 indexed id);

  /**
   * @notice Emitted when an AddressesProvider is unregistered.
   * @param addressesProvider The address of the unregistered PoolAddressesProvider
   * @param id The id of the unregistered PoolAddressesProvider
   */
  event AddressesProviderUnregistered(address indexed addressesProvider, uint256 indexed id);

  /**
   * @notice Returns the list of registered addresses providers
   * @return The list of addresses providers
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
   * @notice Registers an AddressesProvider
   * @dev The addressesProvider must not be already registered in the registry
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
