import { MOCK_CHAINLINK_AGGREGATORS_PRICES } from '@aave/deploy-v3/dist/helpers/constants';
import { expect } from 'chai';
import { oneEther, ONE_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import {
  deployMintableERC20,
  deployMockAggregator,
  evmRevert,
  evmSnapshot,
  MintableERC20,
  MockAggregator,
} from '@aave/deploy-v3';

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
    assetPrice = MOCK_CHAINLINK_AGGREGATORS_PRICES.ETH;
    mockAggregator = await deployMockAggregator(assetPrice);
  });

  it('Owner set a new asset source', async () => {
    const { poolAdmin, aaveOracle } = testEnv;

    // Asset has no source
    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(ZERO_ADDRESS);
    const priorSourcePrice = await aaveOracle.getAssetPrice(mockToken.address);
    const priorSourcesPrices = (await aaveOracle.getAssetsPrices([mockToken.address])).map((x) =>
      x.toString()
    );
    expect(priorSourcePrice).to.equal('0');
    expect(priorSourcesPrices).to.eql(['0']);

    // Add asset source
    await expect(
      aaveOracle
        .connect(poolAdmin.signer)
        .setAssetSources([mockToken.address], [mockAggregator.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(mockToken.address, mockAggregator.address);

    const sourcesPrices = await (
      await aaveOracle.getAssetsPrices([mockToken.address])
    ).map((x) => x.toString());
    expect(await aaveOracle.getSourceOfAsset(mockToken.address)).to.be.eq(mockAggregator.address);
    expect(await aaveOracle.getAssetPrice(mockToken.address)).to.be.eq(assetPrice);
    expect(sourcesPrices).to.eql([assetPrice]);
  });

  it('Owner update an existing asset source', async () => {
    const { poolAdmin, aaveOracle, dai } = testEnv;

    // DAI token has already a source
    const daiSource = await aaveOracle.getSourceOfAsset(dai.address);
    expect(daiSource).to.be.not.eq(ZERO_ADDRESS);

    // Update DAI source
    await expect(
      aaveOracle.connect(poolAdmin.signer).setAssetSources([dai.address], [mockAggregator.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(dai.address, mockAggregator.address);

    expect(await aaveOracle.getSourceOfAsset(dai.address)).to.be.eq(mockAggregator.address);
    expect(await aaveOracle.getAssetPrice(dai.address)).to.be.eq(assetPrice);
  });

  it('Owner tries to set a new asset source with wrong input params (revert expected)', async () => {
    const { poolAdmin, aaveOracle } = testEnv;

    await expect(
      aaveOracle.connect(poolAdmin.signer).setAssetSources([mockToken.address], [])
    ).to.be.revertedWith(ProtocolErrors.INCONSISTENT_PARAMS_LENGTH);
  });

  it('Get price of BASE_CURRENCY asset', async () => {
    const { aaveOracle } = testEnv;

    // Check returns the fixed price BASE_CURRENCY_UNIT
    expect(await aaveOracle.getAssetPrice(await aaveOracle.BASE_CURRENCY())).to.be.eq(
      await aaveOracle.BASE_CURRENCY_UNIT()
    );
  });

  it('A non-owner user tries to set a new asset source (revert expected)', async () => {
    const { users, aaveOracle } = testEnv;
    const user = users[0];

    const { CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN } = ProtocolErrors;

    await expect(
      aaveOracle.connect(user.signer).setAssetSources([mockToken.address], [mockAggregator.address])
    ).to.be.revertedWith(CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN);
  });

  it('Get price of BASE_CURRENCY asset with registered asset source for its address', async () => {
    const { poolAdmin, aaveOracle, weth } = testEnv;

    // Add asset source for BASE_CURRENCY address
    await expect(
      aaveOracle.connect(poolAdmin.signer).setAssetSources([weth.address], [mockAggregator.address])
    )
      .to.emit(aaveOracle, 'AssetSourceUpdated')
      .withArgs(weth.address, mockAggregator.address);

    // Check returns the fixed price BASE_CURRENCY_UNIT
    expect(await aaveOracle.getAssetPrice(weth.address)).to.be.eq(
      MOCK_CHAINLINK_AGGREGATORS_PRICES.WETH
    );
  });

  it('Get price of asset with no asset source', async () => {
    const { aaveOracle, oracle } = testEnv;
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
    await expect(
      aaveOracle
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
    await expect(
      aaveOracle
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
    await expect(aaveOracle.connect(poolAdmin.signer).setFallbackOracle(ONE_ADDRESS))
      .to.emit(aaveOracle, 'FallbackOracleUpdated')
      .withArgs(ONE_ADDRESS);

    expect(await aaveOracle.getFallbackOracle()).to.be.eq(ONE_ADDRESS);
  });
});
