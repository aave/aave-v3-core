import { oneEther, ONE_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { deployMintableERC20, deployMockAggregator } from '../helpers/contracts-deployments';
import { MintableERC20, MockAggregator } from '../types';
import { ProtocolErrors } from '../helpers/types';
import { parseUnits } from 'ethers/lib/utils';

makeSuite('AaveOracle', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  let mockToken: MintableERC20;
  let mockAggregator: MockAggregator;
  let assetPrice: string;

  before(async () => {
    mockToken = await deployMintableERC20(['MOCK', 'MOCK', '18']);
    assetPrice = parseUnits('0.00367714136416', 18).toString();
    mockAggregator = await deployMockAggregator(assetPrice);
  });

  it('Owner set a new asset source', async () => {
    const { poolAdmin, aaveOracle } = testEnv;

    // Asset has no source
    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(ZERO_ADDRESS);
    expect(await aaveOracle.getAssetsPrices([mockToken.address])).to.be.eql([
      ethers.BigNumber.from(0),
    ]);

    // Add asset source
    expect(
      await aaveOracle
        .connect(poolAdmin.signer)
        .setAssetSources([mockToken.address], [mockAggregator.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(mockToken.address, mockAggregator.address);

    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(mockAggregator.address);
    expect(await aaveOracle.getAssetPrice(mockToken.address)).to.be.eq(assetPrice);
    expect(await aaveOracle.getAssetsPrices([mockToken.address])).to.be.eql([
      ethers.BigNumber.from(assetPrice),
    ]);
  });

  it('Owner update an existing asset source', async () => {
    const { poolAdmin, aaveOracle, dai } = testEnv;

    // DAI token has already a source
    const daiSource = await aaveOracle.getSourceOfAsset(dai.address);
    expect(daiSource).to.be.not.eq(ZERO_ADDRESS);

    // Update DAI source
    expect(
      await aaveOracle
        .connect(poolAdmin.signer)
        .setAssetSources([dai.address], [mockAggregator.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(dai.address, mockAggregator.address);

    expect(await aaveOracle.getSourceOfAsset(dai.address)).to.be.eq(mockAggregator.address);
    expect(await aaveOracle.getAssetPrice(dai.address)).to.be.eq(assetPrice);
  });

  it('Owner tries to set a new asset source with wrong input params an reverts', async () => {
    const { poolAdmin, aaveOracle } = testEnv;

    await expect(
      aaveOracle.connect(poolAdmin.signer).setAssetSources([mockToken.address], [])
    ).revertedWith('INCONSISTENT_PARAMS_LENGTH');
  });

  it('Get price of BASE_CURRENCY asset', async () => {
    const { aaveOracle, weth } = testEnv;

    // Check returns the fixed price BASE_CURRENCY_UNIT
    expect(await aaveOracle.getAssetPrice(weth.address)).to.be.eq(
      ethers.constants.WeiPerEther.toString()
    );
  });

  it('A non-owner user tries to set a new asset source an reverts', async () => {
    const { users, aaveOracle } = testEnv;
    const user = users[0];

    const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

    await expect(
      aaveOracle.connect(user.signer).setAssetSources([mockToken.address], [mockAggregator.address])
    ).revertedWith(INVALID_OWNER_REVERT_MSG);
  });

  it('Get price of BASE_CURRENCY asset', async () => {
    const { aaveOracle, weth } = testEnv;

    // Check returns the fixed price BASE_CURRENCY_UNIT
    expect(await aaveOracle.getAssetPrice(weth.address)).to.be.eq(
      ethers.constants.WeiPerEther.toString()
    );
  });

  it('Get price of BASE_CURRENCY asset with registered asset source for its address', async () => {
    const { poolAdmin, aaveOracle, weth } = testEnv;

    // Add asset source for BASE_CURRENCY address
    expect(
      await aaveOracle
        .connect(poolAdmin.signer)
        .setAssetSources([weth.address], [mockAggregator.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(weth.address, mockAggregator.address);

    // Check returns the fixed price BASE_CURRENCY_UNIT
    expect(await aaveOracle.getAssetPrice(weth.address)).to.be.eq(
      ethers.constants.WeiPerEther.toString()
    );
  });

  it('Get price of asset with no asset source', async () => {
    const { poolAdmin, aaveOracle, oracle } = testEnv;
    const fallbackPrice = oneEther;

    // Register price on FallbackOracle
    expect(await oracle.setAssetPrice(mockToken.address, fallbackPrice));

    // Asset has no source
    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(ZERO_ADDRESS);

    // Returns 0 price
    expect(await aaveOracle.getAssetPrice(mockToken.address)).to.be.eq(fallbackPrice);
  });

  it('Get price of asset with 0 price and no fallback price', async () => {
    const { poolAdmin, aaveOracle } = testEnv;
    const zeroPriceMockAgg = await deployMockAggregator('0');

    // Asset has no source
    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(ZERO_ADDRESS);

    // Add asset source
    expect(
      await aaveOracle
        .connect(poolAdmin.signer)
        .setAssetSources([mockToken.address], [zeroPriceMockAgg.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(mockToken.address, zeroPriceMockAgg.address);

    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(zeroPriceMockAgg.address);
    expect(await aaveOracle.getAssetPrice(mockToken.address)).to.be.eq(0);
  });

  it('Get price of asset with 0 price but non-zero fallback price', async () => {
    const { poolAdmin, aaveOracle, oracle } = testEnv;
    const zeroPriceMockAgg = await deployMockAggregator('0');
    const fallbackPrice = oneEther;

    // Register price on FallbackOracle
    expect(await oracle.setAssetPrice(mockToken.address, fallbackPrice));

    // Asset has no source
    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(ZERO_ADDRESS);

    // Add asset source
    expect(
      await aaveOracle
        .connect(poolAdmin.signer)
        .setAssetSources([mockToken.address], [zeroPriceMockAgg.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(mockToken.address, zeroPriceMockAgg.address);

    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(zeroPriceMockAgg.address);
    expect(await aaveOracle.getAssetPrice(mockToken.address)).to.be.eq(fallbackPrice);
  });

  it('Owner update the FallbackOracle', async () => {
    const { poolAdmin, aaveOracle, oracle } = testEnv;

    expect(await aaveOracle.getFallbackOracle()).to.be.eq(oracle.address);

    // Update oracle source
    expect(await aaveOracle.connect(poolAdmin.signer).setFallbackOracle(ONE_ADDRESS))
      .to.emit(aaveOracle, 'FallbackOracleUpdated')
      .withArgs(ONE_ADDRESS);

    expect(await aaveOracle.getFallbackOracle()).to.be.eq(ONE_ADDRESS);
  });
});
