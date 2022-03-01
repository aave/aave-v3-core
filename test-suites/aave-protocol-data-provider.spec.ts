import hre from 'hardhat';
import { expect } from 'chai';
import { utils } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { getMockPool, ZERO_ADDRESS } from '@aave/deploy-v3';
import { InitializableImmutableAdminUpgradeabilityProxy } from '../types';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { topUpNonPayableWithEther } from './helpers/utils/funds';

makeSuite('AaveProtocolDataProvider: Edge cases', (testEnv: TestEnv) => {
  const MKR_ADDRESS = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  it('getAllReservesTokens() with MKR and ETH as symbols', async () => {
    const { addressesProvider, poolAdmin, helpersContract } = testEnv;
    const { deployer } = await hre.getNamedAccounts();

    // Deploy a mock Pool
    const mockPool = await hre.deployments.deploy('MockPool', { from: deployer });

    // Impersonate PoolAddressesProvider
    await impersonateAccountsHardhat([addressesProvider.address]);
    const addressesProviderSigner = await hre.ethers.getSigner(addressesProvider.address);

    const poolProxyAddress = await addressesProvider.getPool();
    const poolProxy = (await hre.ethers.getContractAt(
      'InitializableImmutableAdminUpgradeabilityProxy',
      poolProxyAddress,
      addressesProviderSigner
    )) as InitializableImmutableAdminUpgradeabilityProxy;

    const oldPoolImpl = await poolProxy.callStatic.implementation();

    // Update the addressesProvider with a mock pool
    expect(await addressesProvider.connect(poolAdmin.signer).setPoolImpl(mockPool.address))
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(oldPoolImpl, mockPool.address);

    // Add MKR and ETH addresses
    const proxiedMockPoolAddress = await addressesProvider.getPool();
    const proxiedMockPool = await getMockPool(proxiedMockPoolAddress);
    expect(await proxiedMockPool.addReserveToReservesList(MKR_ADDRESS));
    expect(await proxiedMockPool.addReserveToReservesList(ETH_ADDRESS));

    expect(await helpersContract.getAllReservesTokens()).to.be.eql([
      ['MKR', MKR_ADDRESS],
      ['ETH', ETH_ADDRESS],
    ]);
  });
});
