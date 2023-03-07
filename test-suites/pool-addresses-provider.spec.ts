import hre from 'hardhat';
import { expect } from 'chai';
import { utils } from 'ethers';
import { createRandomAddress } from '../helpers/misc-utils';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { deployPool, deployMockPool } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import {
  evmSnapshot,
  evmRevert,
  getFirstSigner,
  InitializableAdminUpgradeabilityProxy__factory,
} from '@aave/deploy-v3';
import { MockPeripheryContractV1__factory, MockPeripheryContractV2__factory } from '../types';
import { getProxyAdmin, getProxyImplementation } from '../helpers/contracts-helpers';

makeSuite('PoolAddressesProvider', (testEnv: TestEnv) => {
  const { OWNABLE_ONLY_OWNER } = ProtocolErrors;

  it('Test the onlyOwner accessibility of the PoolAddressesProvider', async () => {
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
  });

  it('Owner adds a new address as proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployPool();
    const proxiedAddressId = utils.formatBytes32String('RANDOM_PROXIED');

    await expect(
      addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(proxiedAddressId, mockPool.address)
    )
      .to.emit(addressesProvider, 'AddressSetAsProxy')
      .to.emit(addressesProvider, 'ProxyCreated');

    const proxyAddress = await addressesProvider.getAddress(proxiedAddressId);
    const implAddress = await getProxyImplementation(addressesProvider.address, proxyAddress);
    expect(implAddress).to.be.eq(mockPool.address);
  });

  it('Owner adds a new address with no proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];
    const mockNonProxiedAddress = createRandomAddress();
    const nonProxiedAddressId = utils.formatBytes32String('RANDOM_NON_PROXIED');

    const oldAddress = await addressesProvider.getAddress(nonProxiedAddressId);
    await expect(
      addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(nonProxiedAddressId, mockNonProxiedAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(nonProxiedAddressId, oldAddress, mockNonProxiedAddress);

    expect((await addressesProvider.getAddress(nonProxiedAddressId)).toLowerCase()).to.be.eq(
      mockNonProxiedAddress.toLowerCase()
    );

    const proxyAddress = await addressesProvider.getAddress(nonProxiedAddressId);
    await expect(getProxyImplementation(addressesProvider.address, proxyAddress)).to.be.reverted;
  });

  it('Owner adds a new address with no proxy and turns it into a proxy', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];
    const mockPool = await deployPool();
    const mockConvertibleAddress = mockPool.address;
    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS');

    expect(await addressesProvider.getAddress(convertibleAddressId)).to.be.eq(ZERO_ADDRESS);

    const oldNonProxiedAddress = await addressesProvider.getAddress(convertibleAddressId);

    // Add address as non proxy
    await expect(
      addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, oldNonProxiedAddress, mockConvertibleAddress);

    let registeredAddress = await addressesProvider.getAddress(convertibleAddressId);
    expect(registeredAddress).to.be.eq(mockConvertibleAddress);
    await expect(getProxyImplementation(addressesProvider.address, registeredAddress)).to.be
      .reverted;

    // Unregister address as non proxy
    await expect(
      addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, mockConvertibleAddress, ZERO_ADDRESS);

    // Add address as proxy
    await expect(
      addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSetAsProxy')
      .to.emit(addressesProvider, 'ProxyCreated');

    const proxyAddress = await addressesProvider.getAddress(convertibleAddressId);
    const implAddress = await getProxyImplementation(addressesProvider.address, proxyAddress);
    expect(implAddress).to.be.eq(mockConvertibleAddress);
  });

  it('Unregister a proxy address', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS');

    const proxyAddress = await addressesProvider.getAddress(convertibleAddressId);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, proxyAddress, ZERO_ADDRESS);

    const proxyAddressAfter = await addressesProvider.getAddress(convertibleAddressId);
    expect(proxyAddressAfter).to.be.eq(ZERO_ADDRESS);
    expect(proxyAddressAfter).to.be.not.eq(proxyAddress);
    await expect(getProxyImplementation(addressesProvider.address, proxyAddressAfter)).to.be
      .reverted;
  });

  it('Owner adds a new address with proxy and turns it into a no proxy', async () => {
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
      .to.emit(addressesProvider, 'AddressSetAsProxy')
      .to.emit(addressesProvider, 'ProxyCreated');

    const proxyAddress = await addressesProvider.getAddress(convertibleAddressId);
    const implAddress = await getProxyImplementation(addressesProvider.address, proxyAddress);
    expect(implAddress).to.be.eq(mockConvertibleAddress);

    // Unregister address as proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, proxyAddress, ZERO_ADDRESS);

    // Add address as non proxy
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, mockConvertibleAddress)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, ZERO_ADDRESS, mockConvertibleAddress);

    const registeredAddressAfter = await addressesProvider.getAddress(convertibleAddressId);
    expect(registeredAddressAfter).to.be.not.eq(proxyAddress);
    expect(registeredAddressAfter).to.be.eq(mockConvertibleAddress);
    await expect(getProxyImplementation(addressesProvider.address, registeredAddressAfter)).to.be
      .reverted;
  });

  it('Unregister a no proxy address', async () => {
    const { addressesProvider, users } = testEnv;

    const currentAddressesProviderOwner = users[1];

    const convertibleAddressId = utils.formatBytes32String('CONVERTIBLE_ADDRESS2');

    const registeredAddress = await addressesProvider.getAddress(convertibleAddressId);
    await expect(getProxyImplementation(addressesProvider.address, registeredAddress)).to.be
      .reverted;

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(convertibleAddressId, ZERO_ADDRESS)
    )
      .to.emit(addressesProvider, 'AddressSet')
      .withArgs(convertibleAddressId, registeredAddress, ZERO_ADDRESS);

    const registeredAddressAfter = await addressesProvider.getAddress(convertibleAddressId);
    expect(registeredAddressAfter).to.be.eq(ZERO_ADDRESS);
    expect(registeredAddressAfter).to.be.not.eq(registeredAddress);
    await expect(getProxyImplementation(addressesProvider.address, registeredAddress)).to.be
      .reverted;
  });

  it('Owner registers an existing contract (with proxy) and upgrade it', async () => {
    const { addressesProvider, users, poolAdmin } = testEnv;
    const proxyAdminOwner = users[0];

    const currentAddressesProviderOwner = users[1];
    const initialManager = users[1];
    const initialProxyAdmin = users[2];

    const newRegisteredContractId = hre.ethers.utils.keccak256(
      hre.ethers.utils.toUtf8Bytes('NEW_REGISTERED_CONTRACT')
    );

    // Deploy the periphery contract that will be registered in the PoolAddressesProvider
    const proxy = await (
      await new InitializableAdminUpgradeabilityProxy__factory(await getFirstSigner()).deploy()
    ).deployed();

    // Implementation
    const impleV1 = await (
      await new MockPeripheryContractV1__factory(await getFirstSigner()).deploy()
    ).deployed();
    await impleV1.initialize(initialManager.address, 123);

    // Initialize proxy
    const incentivesInit = impleV1.interface.encodeFunctionData('initialize', [
      initialManager.address,
      123,
    ]);
    await (
      await proxy['initialize(address,address,bytes)'](
        impleV1.address, // logic
        initialProxyAdmin.address, // admin
        incentivesInit // data
      )
    ).wait();
    expect(await getProxyAdmin(proxy.address)).to.be.eq(initialProxyAdmin.address);

    const contractToRegister = MockPeripheryContractV1__factory.connect(
      proxy.address,
      proxyAdminOwner.signer
    );
    expect(await contractToRegister.getManager()).to.be.eq(initialManager.address);

    // Register the periphery contract into the PoolAddressesProvider
    expect(await proxy.connect(initialProxyAdmin.signer).changeAdmin(addressesProvider.address));
    expect(await getProxyAdmin(proxy.address)).to.be.eq(addressesProvider.address);
    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddress(newRegisteredContractId, proxy.address)
    );
    expect(await addressesProvider.getAddress(newRegisteredContractId)).to.be.eq(proxy.address);

    // Upgrade periphery contract to V2 from PoolAddressesProvider
    // Note the new implementation contract should has a proper `initialize` function signature

    // New implementation
    const impleV2 = await (
      await new MockPeripheryContractV2__factory(await getFirstSigner()).deploy()
    ).deployed();
    await impleV2.initialize(addressesProvider.address);

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setAddressAsProxy(newRegisteredContractId, impleV2.address)
    );

    const upgradedContract = MockPeripheryContractV2__factory.connect(
      proxy.address,
      proxyAdminOwner.signer
    );
    expect(await upgradedContract.getManager()).to.be.eq(initialManager.address);
    expect(await upgradedContract.getAddressesProvider()).to.be.eq(addressesProvider.address);
  });

  it('Owner updates the implementation of a proxy which is already initialized', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const mockPool = await deployMockPool();

    // Pool has already a proxy
    const poolAddress = await addressesProvider.getPool();
    expect(poolAddress).to.be.not.eq(ZERO_ADDRESS);

    const poolAddressId = utils.formatBytes32String('POOL');
    const proxyAddress = await addressesProvider.getAddress(poolAddressId);
    const implementationAddress = await getProxyImplementation(
      addressesProvider.address,
      proxyAddress
    );

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

  it('Owner updates the MarketId', async () => {
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

  it('Owner updates the PoolConfigurator', async () => {
    const snapId = await evmSnapshot();

    const { addressesProvider, configurator, users } = testEnv;
    const currentAddressesProviderOwner = users[1];

    const newPoolConfiguratorImpl = (await deployMockPool()).address;

    expect(await addressesProvider.getPoolConfigurator(), configurator.address);

    const poolConfiguratorAddressId = utils.formatBytes32String('POOL_CONFIGURATOR');
    const proxyAddress = await addressesProvider.getAddress(poolConfiguratorAddressId);
    const implementationAddress = await getProxyImplementation(
      addressesProvider.address,
      proxyAddress
    );

    expect(
      await addressesProvider
        .connect(currentAddressesProviderOwner.signer)
        .setPoolConfiguratorImpl(newPoolConfiguratorImpl)
    )
      .to.emit(addressesProvider, 'PoolConfiguratorUpdated')
      .withArgs(implementationAddress, newPoolConfiguratorImpl);

    expect(await addressesProvider.getPoolConfigurator()).to.be.eq(configurator.address);
    const implementationAddressAfter = await getProxyImplementation(
      addressesProvider.address,
      proxyAddress
    );
    expect(implementationAddressAfter).to.be.not.eq(implementationAddress);
    expect(implementationAddressAfter).to.be.eq(newPoolConfiguratorImpl);

    await evmRevert(snapId);
  });

  it('Owner updates the PriceOracle', async () => {
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

  it('Owner updates the ACLManager', async () => {
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

  it('Owner updates the ACLAdmin', async () => {
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

  it('Owner updates the PriceOracleSentinel', async () => {
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

  it('Owner updates the DataProvider', async () => {
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
