import hre from 'hardhat';
import { expect } from 'chai';
import { utils } from 'ethers';
import { createRandomAddress } from '../helpers/misc-utils';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { deployPool, deployMockPool } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { evmSnapshot, evmRevert } from '@aave/deploy-v3';

makeSuite('PoolAddressesProvider', (testEnv: TestEnv) => {
  const { OWNABLE_ONLY_OWNER } = ProtocolErrors;

  it.only('Test the onlyOwner accessibility of the PoolAddressesProvider', async () => {
    const { addressesProvider, users } = testEnv;
    const mockAddress = createRandomAddress();

    // Transfer ownership to user 1
    await addressesProvider.transferOwnership(users[1].address);

    // Test accessibility with user 0
    for (const contractFunction of [
      addressesProvider.setMarketId,
      addressesProvider.setPoolImpl,
      addressesProvider.setPoolConfiguratorImpl,
      addressesProvider.setPriceOracle,
      addressesProvider.setACLAdmin,
      addressesProvider.setPriceOracleSentinel,
      addressesProvider.setPoolDataProvider,
    ]) {
      await expect(contractFunction(mockAddress)).to.be.revertedWith(OWNABLE_ONLY_OWNER);
    }

    await expect(
      addressesProvider.setAddress(utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')), mockAddress)
    ).to.be.revertedWith(OWNABLE_ONLY_OWNER);

    await expect(
      addressesProvider.setAddressAsProxy(
        utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')),
        mockAddress
      )
    ).to.be.revertedWith(OWNABLE_ONLY_OWNER);

    await expect(
      addressesProvider.setProxyImplementation(mockAddress, mockAddress)
    ).to.be.revertedWith(OWNABLE_ONLY_OWNER);
  });

  it.only('Owner adds a new address as proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployPool();
    const proxiedAddressId = utils.formatBytes32String('RANDOM_PROXIED');

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(proxiedAddressId, mockPool.address)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(proxiedAddressId, mockPool.address, true)
      .to.emit(addressesProvider, 'ProxyCreated');

    const proxyAddress = await addressesProvider.getAddress(proxiedAddressId);
    const implAddress = await addressesProvider.getProxyImplementation(proxyAddress);
    expect(implAddress).to.be.eq(mockPool.address);
  });

  it.only('Owner adds a new address with no proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];
    const mockNonProxiedAddress = createRandomAddress();
    const nonProxiedAddressId = utils.formatBytes32String('RANDOM_NON_PROXIED');

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(nonProxiedAddressId, mockNonProxiedAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(nonProxiedAddressId, mockNonProxiedAddress, false);

    expect((await addressesProvider.getAddress(nonProxiedAddressId)).toLowerCase()).to.be.eq(
      mockNonProxiedAddress.toLowerCase()
    );

    const nonProxyAddress = await addressesProvider.getAddress(nonProxiedAddressId);
    expect(await addressesProvider.getProxyImplementation(nonProxyAddress)).to.be.eq(ZERO_ADDRESS);
  });

  it.only('Owner adds a new address with no proxy and turns it into a proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];
    const mockPool = await deployPool();
    const mockConvertibleAddress = mockPool.address;
    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS');

    expect(await addressesProvider.getAddress(convertibleAddressId)).to.be.eq(ZERO_ADDRESS);

    // Add address as non proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, mockConvertibleAddress, false);

    let registeredAddress = await addressesProvider.getAddress(convertibleAddressId);
    expect(registeredAddress).to.be.eq(mockConvertibleAddress);
    expect(await addressesProvider.getProxyImplementation(registeredAddress)).to.be.eq(
      ZERO_ADDRESS
    );

    // Unregister address as non proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, ZERO_ADDRESS, false);

    // Add address as proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, mockConvertibleAddress, true)
      .to.emit(addressesProvider, 'ProxyCreated');

    registeredAddress = await addressesProvider.getAddress(convertibleAddressId);
    expect(await addressesProvider.getProxyImplementation(registeredAddress)).to.be.eq(
      mockConvertibleAddress
    );
  });

  it.only('Unregister a proxy address', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS');

    const proxyAddress = await addressesProvider.getAddress(convertibleAddressId);
    const implementationAddress = await addressesProvider.getProxyImplementation(proxyAddress);
    expect(implementationAddress).to.be.not.eq(ZERO_ADDRESS);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, ZERO_ADDRESS, false);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setProxyImplementation(proxyAddress, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'ProxyImplementationSet')
      .withArgs(proxyAddress, ZERO_ADDRESS);

    const proxyAddressAfter = await addressesProvider.getAddress(convertibleAddressId);
    expect(proxyAddressAfter).to.be.eq(ZERO_ADDRESS);
    expect(proxyAddressAfter).to.be.not.eq(proxyAddress);
    const implementationAddressAfter = await addressesProvider.getProxyImplementation(proxyAddress);
    expect(implementationAddressAfter).to.be.eq(ZERO_ADDRESS);
    expect(implementationAddressAfter).to.be.not.eq(implementationAddress);
  });

  it.only('Owner adds a new address with proxy and turns it into a no proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];
    const mockPool = await deployPool();
    const mockConvertibleAddress = mockPool.address;
    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS2');

    expect(await addressesProvider.getAddress(convertibleAddressId)).to.be.eq(ZERO_ADDRESS);

    // Add address as proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, mockConvertibleAddress, true)
      .to.emit(addressesProvider, 'ProxyCreated');

    const proxyAddress = await addressesProvider.getAddress(convertibleAddressId);
    const implementationAddress = await addressesProvider.getProxyImplementation(proxyAddress);
    expect(implementationAddress).to.be.eq(mockConvertibleAddress);

    // Unregister address as proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, ZERO_ADDRESS, false);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setProxyImplementation(proxyAddress, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'ProxyImplementationSet')
      .withArgs(proxyAddress, ZERO_ADDRESS);

    // Add address as non proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, mockConvertibleAddress, false);

    const registeredAddressAfter = await addressesProvider.getAddress(convertibleAddressId);
    expect(registeredAddressAfter).to.be.not.eq(proxyAddress);
    expect(registeredAddressAfter).to.be.eq(mockConvertibleAddress);
    expect(await addressesProvider.getProxyImplementation(proxyAddress)).to.be.eq(ZERO_ADDRESS);
  });

  it.only('Unregister a no proxy address', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS2');

    const registeredAddress = await addressesProvider.getAddress(convertibleAddressId);
    const implementationAddress = await addressesProvider.getProxyImplementation(registeredAddress);
    expect(implementationAddress).to.be.eq(ZERO_ADDRESS);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, ZERO_ADDRESS, false);

    const registeredAddressAfter = await addressesProvider.getAddress(convertibleAddressId);
    expect(registeredAddressAfter).to.be.eq(ZERO_ADDRESS);
    expect(registeredAddressAfter).to.be.not.eq(registeredAddress);
    const implementationAddressAfter = await addressesProvider.getProxyImplementation(
      registeredAddress
    );
    expect(implementationAddressAfter).to.be.eq(ZERO_ADDRESS);
  });

  it.only('Owner updates the implementation of a proxy which is already initialized', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployMockPool();

    // Pool has already a proxy
    const poolAddress = await addressesProvider.getPool();
    expect(poolAddress).to.be.not.eq(ZERO_ADDRESS);

    const poolAddressId = utils.formatBytes32String('POOL');
    const proxyAddress = await addressesProvider.getAddress(poolAddressId);
    const implementationAddress = await addressesProvider.getProxyImplementation(proxyAddress);
    // Update the Pool proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPoolImpl(mockPool.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(implementationAddress, mockPool.address);

    // Pool address should not change
    expect(await addressesProvider.getPool()).to.be.eq(poolAddress);

    await evmRevert(snapId);
  });

  it.only('Owner updates the MarketId', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const NEW_MARKET_ID = 'NEW_MARKET';

    // Current MarketId
    const oldMarketId = await addressesProvider.getMarketId();

    // Update the MarketId
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setMarketId(NEW_MARKET_ID)
    )
      .to.emit(addressesProvider, 'MarketIdSet')
      .withArgs(oldMarketId, NEW_MARKET_ID);

    expect(await addressesProvider.getMarketId()).to.be.not.eq(oldMarketId);
    expect(await addressesProvider.getMarketId()).to.be.eq(NEW_MARKET_ID);

    await evmRevert(snapId);
  });

  it.only('Owner updates the PoolConfigurator', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, configurator, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const newPoolConfiguratorImpl = (await deployMockPool()).address;

    expect(await addressesProvider.getPoolConfigurator(), configurator.address);

    const poolConfiguratorAddressId = utils.formatBytes32String('POOL_CONFIGURATOR');
    const proxyAddress = await addressesProvider.getAddress(poolConfiguratorAddressId);
    const implementationAddress = await addressesProvider.getProxyImplementation(proxyAddress);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPoolConfiguratorImpl(newPoolConfiguratorImpl)
    )
      .to.emit(addressesProvider, 'PoolConfiguratorUpdated')
      .withArgs(implementationAddress, newPoolConfiguratorImpl);

    expect(await addressesProvider.getPoolConfigurator()).to.be.eq(configurator.address);
    expect(await addressesProvider.getProxyImplementation(configurator.address)).to.be.not.eq(
      implementationAddress
    );
    expect(await addressesProvider.getProxyImplementation(configurator.address)).to.be.eq(
      newPoolConfiguratorImpl
    );

    await evmRevert(snapId);
  });

  it.only('Owner updates the PriceOracle', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, oracle, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const newPriceOracleAddress = createRandomAddress();

    expect(await addressesProvider.getPriceOracle(), oracle.address);

    const priceOracleAddressId = utils.formatBytes32String('PRICE_ORACLE');
    const registeredAddress = await addressesProvider.getAddress(priceOracleAddressId);
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPriceOracle(newPriceOracleAddress)
    )
      .to.emit(addressesProvider, 'PriceOracleUpdated')
      .withArgs(registeredAddress, newPriceOracleAddress);

    expect(await addressesProvider.getPriceOracle()).to.be.not.eq(oracle.address);
    expect(await addressesProvider.getPriceOracle()).to.be.eq(newPriceOracleAddress);

    await evmRevert(snapId);
  });

  it.only('Owner updates the ACLManager', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users, aclManager } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const newACLManagerAddress = createRandomAddress();

    expect(await addressesProvider.getACLManager(), aclManager.address);

    const aclManagerAddressId = utils.formatBytes32String('ACL_MANAGER');
    const registeredAddress = await addressesProvider.getAddress(aclManagerAddressId);
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setACLManager(newACLManagerAddress)
    )
      .to.emit(addressesProvider, 'ACLManagerUpdated')
      .withArgs(registeredAddress, newACLManagerAddress);

    expect(await addressesProvider.getACLManager()).to.be.not.eq(aclManager.address);
    expect(await addressesProvider.getACLManager()).to.be.eq(newACLManagerAddress);

    await evmRevert(snapId);
  });

  it.only('Owner updates the ACLAdmin', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const { aclAdmin: aclAdminAddress } = await hre.getNamedAccounts();
    const currentAddressesProviderOwner = users[1];

    const newACLAdminAddress = createRandomAddress();

    expect(await addressesProvider.getACLAdmin(), aclAdminAddress);

    const aclAdminAddressId = utils.formatBytes32String('ACL_ADMIN');
    const registeredAddress = await addressesProvider.getAddress(aclAdminAddressId);
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setACLAdmin(newACLAdminAddress)
    )
      .to.emit(addressesProvider, 'ACLAdminUpdated')
      .withArgs(registeredAddress, newACLAdminAddress);

    expect(await addressesProvider.getACLAdmin()).to.be.not.eq(aclAdminAddress);
    expect(await addressesProvider.getACLAdmin()).to.be.eq(newACLAdminAddress);

    await evmRevert(snapId);
  });

  it.only('Owner updates the PriceOracleSentinel', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const newPriceOracleSentinelAddress = createRandomAddress();

    const priceOracleSentinelAddressId = utils.formatBytes32String('PRICE_ORACLE_SENTINEL');
    const registeredAddress = await addressesProvider.getAddress(priceOracleSentinelAddressId);
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPriceOracleSentinel(newPriceOracleSentinelAddress)
    )
      .to.emit(addressesProvider, 'PriceOracleSentinelUpdated')
      .withArgs(registeredAddress, newPriceOracleSentinelAddress);

    expect(await addressesProvider.getPriceOracleSentinel()).to.be.not.eq(registeredAddress);
    expect(await addressesProvider.getPriceOracleSentinel()).to.be.eq(
      newPriceOracleSentinelAddress
    );

    await evmRevert(snapId);
  });

  it.only('Owner updates the DataProvider', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, helpersContract, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    expect(await addressesProvider.getPoolDataProvider(), helpersContract.address);

    const newDataProviderAddress = createRandomAddress();

    const dataProviderAddressId = utils.formatBytes32String('DATA_PROVIDER');
    const registeredAddress = await addressesProvider.getAddress(dataProviderAddressId);
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPoolDataProvider(newDataProviderAddress)
    )
      .to.emit(addressesProvider, 'PoolDataProviderUpdated')
      .withArgs(registeredAddress, newDataProviderAddress);

    expect(await addressesProvider.getPoolDataProvider()).to.be.not.eq(helpersContract.address);
    expect(await addressesProvider.getPoolDataProvider()).to.be.eq(newDataProviderAddress);

    await evmRevert(snapId);
  });
});
