// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Ownable} from '../../dependencies/openzeppelin/contracts/Ownable.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {InitializableImmutableAdminUpgradeabilityProxy} from '../libraries/aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol';
import {BytesLib} from '../libraries/helpers/BytesLib.sol';

/**
 * @title PoolAddressesProvider
 * @author Aave
 * @notice Main registry of addresses part of or connected to the protocol, including permissioned roles
 * @dev Acts as factory of proxies and admin of those, so with right to change its implementations
 * @dev Owned by the Aave Governance
 **/
contract PoolAddressesProvider is Ownable, IPoolAddressesProvider {
  using BytesLib for bytes;

  // Identifier of the Aave Market
  string private _marketId;

  // Mapping of registered addresses (identifiers as keys)
  mapping(bytes32 => address) private _addresses;

  // Main identifiers
  bytes32 private constant POOL = 'POOL';
  bytes32 private constant POOL_CONFIGURATOR = 'POOL_CONFIGURATOR';
  bytes32 private constant PRICE_ORACLE = 'PRICE_ORACLE';
  bytes32 private constant ACL_MANAGER = 'ACL_MANAGER';
  bytes32 private constant ACL_ADMIN = 'ACL_ADMIN';
  bytes32 private constant PRICE_ORACLE_SENTINEL = 'PRICE_ORACLE_SENTINEL';
  bytes32 private constant DATA_PROVIDER = 'DATA_PROVIDER';

  constructor(string memory marketId) {
    _setMarketId(marketId);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getMarketId() external view override returns (string memory) {
    return _marketId;
  }

  /// @inheritdoc IPoolAddressesProvider
  function setMarketId(string memory newMarketId) external override onlyOwner {
    _setMarketId(newMarketId);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getAddress(bytes32 id) public view override returns (address) {
    return _addresses[id];
  }

  /// @inheritdoc IPoolAddressesProvider
  function setAddress(bytes32 id, address newAddress) external override onlyOwner {
    _addresses[id] = newAddress;

    emit AddressSet(id, newAddress, false);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getProxyImplementation(bytes32 id) public view override returns (address) {
    address proxyAddress = _addresses[id];
    if (proxyAddress == address(0)) {
      return address(0);
    } else {
      (bool success, bytes memory result) = proxyAddress.staticcall(
        abi.encodeWithSignature('implementation()')
      );
      return success && result.length == 32 ? result.toAddress() : address(0);
    }
  }

  /// @inheritdoc IPoolAddressesProvider
  function setAddressAsProxy(bytes32 id, address implementationAddress)
    external
    override
    onlyOwner
  {
    _updateImpl(id, implementationAddress);
    emit AddressSet(id, implementationAddress, true);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getPool() external view override returns (address) {
    return getAddress(POOL);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setPoolImpl(address newPoolImpl) external override onlyOwner {
    address oldPoolImpl = getProxyImplementation(POOL);
    _updateImpl(POOL, newPoolImpl);
    emit PoolUpdated(oldPoolImpl, newPoolImpl);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getPoolConfigurator() external view override returns (address) {
    return getAddress(POOL_CONFIGURATOR);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setPoolConfiguratorImpl(address newPoolConfiguratorImpl) external override onlyOwner {
    address oldPoolConfiguratorImpl = getProxyImplementation(POOL_CONFIGURATOR);
    _updateImpl(POOL_CONFIGURATOR, newPoolConfiguratorImpl);
    emit PoolConfiguratorUpdated(oldPoolConfiguratorImpl, newPoolConfiguratorImpl);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getPriceOracle() external view override returns (address) {
    return getAddress(PRICE_ORACLE);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setPriceOracle(address newPriceOracle) external override onlyOwner {
    address oldPriceOracle = _addresses[PRICE_ORACLE];
    _addresses[PRICE_ORACLE] = newPriceOracle;
    emit PriceOracleUpdated(oldPriceOracle, newPriceOracle);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getACLManager() external view override returns (address) {
    return getAddress(ACL_MANAGER);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setACLManager(address newAclManager) external override onlyOwner {
    address oldAclManager = _addresses[ACL_MANAGER];
    _addresses[ACL_MANAGER] = newAclManager;
    emit ACLManagerUpdated(oldAclManager, newAclManager);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getACLAdmin() external view override returns (address) {
    return getAddress(ACL_ADMIN);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setACLAdmin(address newAclAdmin) external override onlyOwner {
    address oldAclAdmin = _addresses[ACL_ADMIN];
    _addresses[ACL_ADMIN] = newAclAdmin;
    emit ACLAdminUpdated(oldAclAdmin, newAclAdmin);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getPriceOracleSentinel() external view override returns (address) {
    return getAddress(PRICE_ORACLE_SENTINEL);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setPriceOracleSentinel(address newPriceOracleSentinel) external override onlyOwner {
    address oldPriceOracleSentinel = _addresses[PRICE_ORACLE_SENTINEL];
    _addresses[PRICE_ORACLE_SENTINEL] = newPriceOracleSentinel;
    emit PriceOracleSentinelUpdated(oldPriceOracleSentinel, newPriceOracleSentinel);
  }

  /// @inheritdoc IPoolAddressesProvider
  function getPoolDataProvider() external view override returns (address) {
    return getAddress(DATA_PROVIDER);
  }

  /// @inheritdoc IPoolAddressesProvider
  function setPoolDataProvider(address newDataProvider) external override onlyOwner {
    address oldDataProvider = _addresses[DATA_PROVIDER];
    _addresses[DATA_PROVIDER] = newDataProvider;
    emit PoolDataProviderUpdated(oldDataProvider, newDataProvider);
  }

  /**
   * @notice Internal function to update the implementation of a specific proxied component of the protocol.
   * @dev If there is no proxy registered with the given identifier, it creates the proxy setting `newAddress`
   *   as implementation and calls the initialize() function on the proxy
   * @dev If there is already a proxy registered, it just updates the implementation to `newAddress` and
   *   calls the initialize() function via upgradeToAndCall() in the proxy
   * @param id The id of the proxy to be updated
   * @param newAddress The address of the new implementation
   **/
  function _updateImpl(bytes32 id, address newAddress) internal {
    address payable payableProxyAddress = payable(_addresses[id]);

    InitializableImmutableAdminUpgradeabilityProxy proxy = InitializableImmutableAdminUpgradeabilityProxy(
        payableProxyAddress
      );
    bytes memory params = abi.encodeWithSignature('initialize(address)', address(this));

    if (payableProxyAddress == address(0)) {
      proxy = new InitializableImmutableAdminUpgradeabilityProxy(address(this));
      address proxyAddress = address(proxy);
      _addresses[id] = proxyAddress;
      proxy.initialize(newAddress, params);

      emit ProxyCreated(id, proxyAddress);
      emit ProxyImplementationSet(proxyAddress, newAddress);
    } else {
      proxy.upgradeToAndCall(newAddress, params);

      emit ProxyImplementationSet(address(payableProxyAddress), newAddress);
    }
  }

  /**
   * @notice Updates the identifier of the Aave market.
   * @param newMarketId The new id of the market
   **/
  function _setMarketId(string memory newMarketId) internal {
    string memory oldMarketId = _marketId;
    _marketId = newMarketId;
    emit MarketIdSet(oldMarketId, newMarketId);
  }
}
