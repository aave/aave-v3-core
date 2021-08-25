import { oneRay, ONE_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';
import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { deployMintableERC20, deployRateOracle } from '../helpers/contracts-deployments';
import {
  MintableERC20,
  RateOracle,
  RateOracleFactory,
  StableAndVariableTokensHelper,
} from '../types';
import { getFirstSigner, getStableAndVariableTokensHelper } from '../helpers/contracts-getters';

makeSuite('StableAndVariableTokenHelper', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  const BORROW_RATE = oneRay.multipliedBy(0.03).toFixed();

  let tokenHelper: StableAndVariableTokensHelper;
  let rateOracle: RateOracle;
  let mockToken: MintableERC20;

  before(async () => {
    tokenHelper = await getStableAndVariableTokensHelper();
    rateOracle = await (await new RateOracleFactory(await getFirstSigner()).deploy()).deployed();
    //rateOracle = await deployRateOracle();
    mockToken = await deployMintableERC20(['MOCK', 'MOCK', '18']);

    // Transfer ownership to tokenHelper
    await rateOracle.transferOwnership(tokenHelper.address);
  });

  it('Owner set new borrow rates for an asset', async () => {
    const { poolAdmin } = testEnv;

    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
    expect(
      await tokenHelper
        .connect(poolAdmin.signer)
        .setOracleBorrowRates([mockToken.address], [BORROW_RATE], rateOracle.address)
    );
    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(BORROW_RATE);
  });

  it('A non-owner user tries to set a new borrow rate and reverts', async () => {
    const { users } = testEnv;

    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
    await expect(
      tokenHelper
        .connect(users[0].signer)
        .setOracleBorrowRates([mockToken.address], [BORROW_RATE], rateOracle.address)
    ).revertedWith('Ownable: caller is not the owner');
    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
  });

  it('Owner tries to set new borrow rates with wrong input and reverts', async () => {
    const { poolAdmin } = testEnv;

    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
    expect(
      tokenHelper
        .connect(poolAdmin.signer)
        .setOracleBorrowRates([mockToken.address], [], rateOracle.address)
    ).revertedWith('Arrays not same length');
    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
  });

  it('Owner transfers ownership to another user', async () => {
    const { poolAdmin, users } = testEnv;

    expect(await rateOracle.owner()).to.be.eq(tokenHelper.address);
    expect(
      await tokenHelper
        .connect(poolAdmin.signer)
        .setOracleOwnership(rateOracle.address, users[1].address)
    )
      .to.emit(rateOracle, 'OwnershipTransferred')
      .withArgs(tokenHelper.address, users[1].address);
    expect(await rateOracle.owner()).to.be.eq(users[1].address);
  });

  it('Owner tries to transfer ownership to ZERO address and reverts', async () => {
    const { poolAdmin } = testEnv;

    expect(await rateOracle.owner()).to.be.eq(tokenHelper.address);
    expect(
      tokenHelper.connect(poolAdmin.signer).setOracleOwnership(rateOracle.address, ZERO_ADDRESS)
    ).revertedWith('owner can not be zero');
    expect(await rateOracle.owner()).to.be.eq(tokenHelper.address);
  });

  it('Owner tries to transfer ownership but helper is not the owner of RateOracle and reverts', async () => {
    const { poolAdmin, users } = testEnv;

    // Transfer ownership of RateOracle to another address
    expect(
      await tokenHelper
        .connect(poolAdmin.signer)
        .setOracleOwnership(rateOracle.address, ONE_ADDRESS)
    )
      .to.emit(rateOracle, 'OwnershipTransferred')
      .withArgs(tokenHelper.address, ONE_ADDRESS);

    expect(await rateOracle.owner()).to.be.not.eq(tokenHelper.address);
    expect(
      tokenHelper.connect(poolAdmin.signer).setOracleOwnership(rateOracle.address, users[1].address)
    ).revertedWith('helper is not owner');
  });
});
