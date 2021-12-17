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
   * @param newMarketId The new id of the market
   */
  event MarketIdSet(string newMarketId);

  /**
   * @notice Emitted when the pool is updated.
   * @param newAddress The new address of the Pool
   */
  event PoolUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the pool configurator is updated.
   * @param newAddress The new address of the PoolConfigurator
   */
  event PoolConfiguratorUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the price oracle is updated.
   * @param newAddress The new address of the PriceOracle
   */
  event PriceOracleUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the ACL manager is updated.
   * @param newAddress The new address of the ACLManager
   */
  event ACLManagerUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the ACL admin is updated.
   * @param newAddress The new address of the ACLAdmin
   */
  event ACLAdminUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the price oracle sentinel is updated.
   * @param newAddress The new address of the PriceOracleSentinel
   */
  event PriceOracleSentinelUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the pool data provider is updated.
   * @param newAddress The new address of the PoolDataProvider
   */
  event PoolDataProviderUpdated(address indexed newAddress);

  /**
   * @notice Emitted when the bridge access control is updated.
   * @param newAddress The new address of the BridgeAccessControl
   */
  event BridgeAccessControlUpdated(address indexed newAddress);

  /**
   * @notice Emitted when a new proxy is created
   * @param id The identifier of the proxy
   * @param proxyAddress The address of the created proxy contract
   */
  event ProxyCreated(bytes32 id, address indexed proxyAddress);

  /**
   * @notice Emitted when a new contract address if registered
   * @param id The identifier of the contract
   * @param implementationAddress The address of the implementation contract
   * @param hasProxy True if the address is registered behind a proxy, false otherwise
   */
  event AddressSet(bytes32 id, address indexed implementationAddress, bool hasProxy);

  /**
   * @notice Returns the id of the Aave market to which this contract points to
   * @return The market id
   **/
  function getMarketId() external view returns (string memory);

  /**
   * @notice Allows to set the market which this PoolAddressesProvider represents
   * @param marketId The market id
   */
  function setMarketId(string calldata marketId) external;

  /**
   * @notice Sets an address for an id replacing the address saved in the addresses map
   * @dev IMPORTANT Use this function carefully, as it will do a hard replacement
   * @param id The id
   * @param newAddress The address to set
   */
  function setAddress(bytes32 id, address newAddress) external;

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
   * @notice Returns an address by id
   * @return The address
   */
  function getAddress(bytes32 id) external view returns (address);

  /**
   * @notice Returns the address of the Pool proxy
   * @return The Pool proxy address
   **/
  function getPool() external view returns (address);

  /**
   * @notice Updates the implementation of the Pool, or creates the proxy
   * setting the new `pool` implementation on the first time calling it
   * @param pool The new Pool implementation
   **/
  function setPoolImpl(address pool) external;

  /**
   * @notice Returns the address of the PoolConfigurator proxy
   * @return The PoolConfigurator proxy address
   **/
  function getPoolConfigurator() external view returns (address);

  /**
   * @notice Updates the implementation of the PoolConfigurator, or creates the proxy
   * setting the new `configurator` implementation on the first time calling it
   * @param configurator The new PoolConfigurator implementation
   **/
  function setPoolConfiguratorImpl(address configurator) external;

  /**
   * @notice Returns the address of the price oracle
   * @return The address of the PriceOracle
   */
  function getPriceOracle() external view returns (address);

  /**
   * @notice Updates the address of the price oracle
   * @param priceOracle The address of the new PriceOracle
   */
  function setPriceOracle(address priceOracle) external;

  /**
   * @notice Returns the address of the ACL manager proxy
   * @return The ACLManager proxy address
   */
  function getACLManager() external view returns (address);

  /**
   * @notice Updates the address of the ACL manager
   * @param aclManager The address of the new ACLManager
   **/
  function setACLManager(address aclManager) external;

  /**
   * @notice Returns the address of the ACL admin
   * @return The address of the ACL admin
   */
  function getACLAdmin() external view returns (address);

  /**
   * @notice Updates the address of the ACL admin
   * @param aclAdmin The address of the new ACL admin
   */
  function setACLAdmin(address aclAdmin) external;

  /**
   * @notice Returns the address of the PriceOracleSentinel
   * @return The PriceOracleSentinel address
   */
  function getPriceOracleSentinel() external view returns (address);

  /**
   * @notice Updates the address of the PriceOracleSentinel
   * @param oracleSentinel The address of the new PriceOracleSentinel
   **/
  function setPriceOracleSentinel(address oracleSentinel) external;

  /**
   * @notice Updates the address of the DataProvider
   * @param dataProvider The address of the new DataProvider
   **/
  function setPoolDataProvider(address dataProvider) external;

  /**
   * @notice Returns the address of the DataProvider
   * @return The DataProvider address
   */
  function getPoolDataProvider() external view returns (address);
}
