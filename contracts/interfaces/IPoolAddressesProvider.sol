// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
 * @title IPoolAddressesProvider
 * @author Aave
 * @notice Defines the basic interface for a Pool Addresses Provider.
 **/
interface IPoolAddressesProvider {
  /**
   * @notice Emitted when the market identifier is updated.
   * @param oldMarketId The old id of the market
   * @param newMarketId The new id of the market
   */
  event MarketIdSet(string oldMarketId, string newMarketId);

  /**
   * @notice Emitted when the pool is updated.
   * @param oldAddress The old address of the Pool
   * @param newAddress The new address of the Pool
   */
  event PoolUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when the pool configurator is updated.
   * @param oldAddress The old address of the PoolConfigurator
   * @param newAddress The new address of the PoolConfigurator
   */
  event PoolConfiguratorUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when the price oracle is updated.
   * @param oldAddress The old address of the PriceOracle
   * @param newAddress The new address of the PriceOracle
   */
  event PriceOracleUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when the ACL manager is updated.
   * @param oldAddress The old address of the ACLManager
   * @param newAddress The new address of the ACLManager
   */
  event ACLManagerUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when the ACL admin is updated.
   * @param oldAddress The old address of the ACLAdmin
   * @param newAddress The new address of the ACLAdmin
   */
  event ACLAdminUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when the price oracle sentinel is updated.
   * @param oldAddress The old address of the PriceOracleSentinel
   * @param newAddress The new address of the PriceOracleSentinel
   */
  event PriceOracleSentinelUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when the pool data provider is updated.
   * @param oldAddress The old address of the PoolDataProvider
   * @param newAddress The new address of the PoolDataProvider
   */
  event PoolDataProviderUpdated(address indexed oldAddress, address indexed newAddress);

  /**
   * @notice Emitted when a new proxy is created
   * @param id The identifier of the proxy
   * @param proxyAddress The address of the created proxy contract
   */
  event ProxyCreated(bytes32 id, address indexed proxyAddress);

  /**
   * @notice Emitted when a new contract address is registered
   * @param id The identifier of the contract
   * @param implementationAddress The address of the implementation contract
   * @param hasProxy True if the address is registered behind a proxy, false otherwise
   */
  event AddressSet(bytes32 id, address indexed implementationAddress, bool hasProxy);

  /**
   * @notice Emitted when a new proxy implementation address is registered
   * @param proxyAddress The address of the proxy contract
   * @param implementationAddress The address of the implementation contract
   */
  event ProxyImplementationSet(address indexed proxyAddress, address indexed implementationAddress);

  /**
   * @notice Returns the id of the Aave market to which this contract points to
   * @return The market id
   **/
  function getMarketId() external view returns (string memory);

  /**
   * @notice Allows to set the market which this PoolAddressesProvider represents
   * @param newMarketId The market id
   */
  function setMarketId(string calldata newMarketId) external;

  /**
   * @notice Returns an address by id
   * @dev It returns the proxy address if the address is behind a proxy.
   * @return The address of the registered contract
   */
  function getAddress(bytes32 id) external view returns (address);

  /**
   * @notice Returns the implementation address of the proxy contract
   * @return The implementation address of the proxy, or ZERO address if it is not a proxy
   */
  function getProxyImplementation(address proxyAddress) external view returns (address);

  /**
   * @notice Sets an implementation address for a proxy saved in the proxies map
   * @dev IMPORTANT Use this function carefully, as it will do a hard replacement
   * @param proxyAddress The address of the proxy contract
   * @param implementationAddress The address of the implementation contract
   */
  function setProxyImplementation(address proxyAddress, address implementationAddress) external;

  /**
   * @notice General function to update the implementation of a proxy registered with
   * certain `id`. If there is no proxy registered, it will instantiate one and
   * set as implementation the `impl`
   * @dev IMPORTANT Use this function carefully, only for ids that don't have an explicit
   * setter function, in order to avoid unexpected consequences
   * @param id The id
   * @param impl The address of the new implementation
   */
  function setAddressAsProxy(bytes32 id, address impl) external;

  /**
   * @notice Sets an address for an id replacing the address saved in the addresses map
   * @dev IMPORTANT Use this function carefully, as it will do a hard replacement
   * @param id The id
   * @param newAddress The address to set
   */
  function setAddress(bytes32 id, address newAddress) external;

  /**
   * @notice Returns the address of the Pool proxy
   * @return The Pool proxy address
   **/
  function getPool() external view returns (address);

  /**
   * @notice Updates the implementation of the Pool, or creates the proxy
   * setting the new `pool` implementation on the first time calling it
   * @param newPoolImpl The new Pool implementation
   **/
  function setPoolImpl(address newPoolImpl) external;

  /**
   * @notice Returns the address of the PoolConfigurator proxy
   * @return The PoolConfigurator proxy address
   **/
  function getPoolConfigurator() external view returns (address);

  /**
   * @notice Updates the implementation of the PoolConfigurator, or creates the proxy
   * setting the new `configurator` implementation on the first time calling it
   * @param newPoolConfiguratorImpl The new PoolConfigurator implementation
   **/
  function setPoolConfiguratorImpl(address newPoolConfiguratorImpl) external;

  /**
   * @notice Returns the address of the price oracle
   * @return The address of the PriceOracle
   */
  function getPriceOracle() external view returns (address);

  /**
   * @notice Updates the address of the price oracle
   * @param newPriceOracle The address of the new PriceOracle
   */
  function setPriceOracle(address newPriceOracle) external;

  /**
   * @notice Returns the address of the ACL manager proxy
   * @return The ACLManager proxy address
   */
  function getACLManager() external view returns (address);

  /**
   * @notice Updates the address of the ACL manager
   * @param newAclManager The address of the new ACLManager
   **/
  function setACLManager(address newAclManager) external;

  /**
   * @notice Returns the address of the ACL admin
   * @return The address of the ACL admin
   */
  function getACLAdmin() external view returns (address);

  /**
   * @notice Updates the address of the ACL admin
   * @param newAclAdmin The address of the new ACL admin
   */
  function setACLAdmin(address newAclAdmin) external;

  /**
   * @notice Returns the address of the PriceOracleSentinel
   * @return The PriceOracleSentinel address
   */
  function getPriceOracleSentinel() external view returns (address);

  /**
   * @notice Updates the address of the PriceOracleSentinel
   * @param newPriceOracleSentinel The address of the new PriceOracleSentinel
   **/
  function setPriceOracleSentinel(address newPriceOracleSentinel) external;

  /**
   * @notice Returns the address of the DataProvider
   * @return The DataProvider address
   */
  function getPoolDataProvider() external view returns (address);

  /**
   * @notice Updates the address of the DataProvider
   * @param newDataProvider The address of the new DataProvider
   **/
  function setPoolDataProvider(address newDataProvider) external;
}
