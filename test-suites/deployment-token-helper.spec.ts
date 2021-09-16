import { expect } from 'chai';
import { utils } from 'ethers';
import { ONE_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { deployMintableERC20 } from '../helpers/contracts-deployments';
import { MintableERC20, RateOracle, RateOracleFactory, RateOracleSetupHelper } from '../types';
import { getFirstSigner, getRateOracleSetupHelper } from '../helpers/contracts-getters';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('StableAndVariableTokenHelper', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  const BORROW_RATE = utils.parseUnits('0.03', 27).toString();

  let tokenHelper: RateOracleSetupHelper;
  let rateOracle: RateOracle;
  let mockToken: MintableERC20;

  before(async () => {
    tokenHelper = await getRateOracleSetupHelper();
    rateOracle = await (await new RateOracleFactory(await getFirstSigner()).deploy()).deployed();
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

  it('A non-owner user tries to set a new borrow rate (revert expected)', async () => {
    const { users } = testEnv;

    const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors;

    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
    await expect(
      tokenHelper
        .connect(users[0].signer)
        .setOracleBorrowRates([mockToken.address], [BORROW_RATE], rateOracle.address)
    ).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);
    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
  });

  it('Owner tries to set new borrow rates with wrong input (revert expected)', async () => {
    const { poolAdmin } = testEnv;

    expect(await rateOracle.getMarketBorrowRate(mockToken.address)).to.be.eq(0);
    expect(
      tokenHelper
        .connect(poolAdmin.signer)
        .setOracleBorrowRates([mockToken.address], [], rateOracle.address)
    ).to.be.revertedWith('Arrays not same length');
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

  it('Owner tries to transfer ownership to ZERO address (revert expected)', async () => {
    const { poolAdmin } = testEnv;

    expect(await rateOracle.owner()).to.be.eq(tokenHelper.address);
    expect(
      tokenHelper.connect(poolAdmin.signer).setOracleOwnership(rateOracle.address, ZERO_ADDRESS)
    ).to.be.revertedWith('owner can not be zero');
    expect(await rateOracle.owner()).to.be.eq(tokenHelper.address);
  });

  it('Owner tries to transfer ownership but helper is not the owner of RateOracle (revert expected)', async () => {
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
    ).to.be.revertedWith('helper is not owner');
  });
});
