import { expect } from 'chai';
import { deployMockPool } from '../helpers/contracts-deployments';
import { getMockPool } from '../helpers/contracts-getters';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('AaveProtocolDataProvider: Edge cases', (testEnv: TestEnv) => {
  const MKR_ADDRESS = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  it('getAllReservesTokens() with MKR and ETH as symbols', async () => {
    const { addressesProvider, poolAdmin, helpersContract } = testEnv;

    // Deploy a mock Pool
    const mockPool = await deployMockPool();

    // Update the addressesProvider with a mock pool
    expect(await addressesProvider.connect(poolAdmin.signer).setPoolImpl(mockPool.address))
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(mockPool.address);

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
