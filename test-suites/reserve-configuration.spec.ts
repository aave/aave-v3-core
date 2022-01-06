import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { deployMockReserveConfiguration } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { ProtocolErrors } from '../helpers/types';
import { evmSnapshot, evmRevert } from '@aave/deploy-v3';
import { MockReserveConfiguration } from '../types';

describe('ReserveConfiguration', async () => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  let configMock: MockReserveConfiguration;

  const ZERO = BigNumber.from(0);
  const LTV = BigNumber.from(8000);
  const LB = BigNumber.from(500);
  const RESERVE_FACTOR = BigNumber.from(1000);
  const DECIMALS = BigNumber.from(18);
  const BORROW_CAP = BigNumber.from(100);
  const SUPPLY_CAP = BigNumber.from(200);
  const UNBACKED_MINT_CAP = BigNumber.from(300);
  const EMODE_CATEGORY = BigNumber.from(1);

  const MAX_VALID_LTV = BigNumber.from(65535);
  const MAX_VALID_LIQUIDATION_THRESHOLD = BigNumber.from(65535);
  const MAX_VALID_DECIMALS = BigNumber.from(255);
  const MAX_VALID_EMODE_CATEGORY = BigNumber.from(255);
  const MAX_VALID_RESERVE_FACTOR = BigNumber.from(65535);
  const MAX_VALID_LIQUIDATION_PROTOCOL_FEE = BigNumber.from(65535);

  before(async () => {
    configMock = await deployMockReserveConfiguration();
  });

  const bigNumbersToArrayString = (arr: BigNumber[]): string[] => arr.map((x) => x.toString());

  it('getLtv()', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLtv()).to.be.eq(ZERO);
    expect(await configMock.setLtv(LTV));
    // LTV is the 1st param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([LTV, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLtv()).to.be.eq(LTV);
    expect(await configMock.setLtv(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLtv()).to.be.eq(ZERO);
  });

  it('getLiquidationBonus()', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLiquidationBonus()).to.be.eq(ZERO);
    expect(await configMock.setLiquidationBonus(LB));
    // LB is the 3rd param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, LB, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLiquidationBonus()).to.be.eq(LB);
    expect(await configMock.setLiquidationBonus(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLiquidationBonus()).to.be.eq(ZERO);
  });

  it('getDecimals()', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
    expect(await configMock.setDecimals(DECIMALS));
    // decimals is the 4th param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, DECIMALS, ZERO, ZERO])
    );
    expect(await configMock.getDecimals()).to.be.eq(DECIMALS);
    expect(await configMock.setDecimals(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
  });

  it('getEModeCategory()', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getEModeCategory()).to.be.eq(ZERO);
    expect(await configMock.setEModeCategory(EMODE_CATEGORY));
    // eMode category is the 6th param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, EMODE_CATEGORY])
    );
    expect(await configMock.getEModeCategory()).to.be.eq(EMODE_CATEGORY);
    expect(await configMock.setEModeCategory(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getEModeCategory()).to.be.eq(ZERO);
  });

  it('getFrozen()', async () => {
    expect(await configMock.getFlags()).to.be.eql([false, false, false, false, false]);
    expect(await configMock.getFrozen()).to.be.false;
    expect(await configMock.setFrozen(true));
    // frozen is the 2nd flag
    expect(await configMock.getFlags()).to.be.eql([false, true, false, false, false]);
    expect(await configMock.getFrozen()).to.be.true;
    expect(await configMock.setFrozen(false));
    expect(await configMock.getFlags()).to.be.eql([false, false, false, false, false]);
    expect(await configMock.getFrozen()).to.be.false;
  });

  it('getBorrowingEnabled()', async () => {
    expect(await configMock.getFlags()).to.be.eql([false, false, false, false, false]);
    expect(await configMock.getBorrowingEnabled()).to.be.false;
    expect(await configMock.setBorrowingEnabled(true));
    // borrowing is the 3rd flag
    expect(await configMock.getFlags()).to.be.eql([false, false, true, false, false]);
    expect(await configMock.getBorrowingEnabled()).to.be.true;
    expect(await configMock.setBorrowingEnabled(false));
    expect(await configMock.getFlags()).to.be.eql([false, false, false, false, false]);
    expect(await configMock.getBorrowingEnabled()).to.be.false;
  });

  it('getStableRateBorrowingEnabled()', async () => {
    expect(await configMock.getFlags()).to.be.eql([false, false, false, false, false]);
    expect(await configMock.getStableRateBorrowingEnabled()).to.be.false;
    expect(await configMock.setStableRateBorrowingEnabled(true));
    // stable borrowing is the 4th flag
    expect(await configMock.getFlags()).to.be.eql([false, false, false, true, false]);
    expect(await configMock.getStableRateBorrowingEnabled()).to.be.true;
    expect(await configMock.setStableRateBorrowingEnabled(false));
    expect(await configMock.getFlags()).to.be.eql([false, false, false, false, false]);
    expect(await configMock.getStableRateBorrowingEnabled()).to.be.false;
  });

  it('getReserveFactor()', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getReserveFactor()).to.be.eq(ZERO);
    expect(await configMock.setReserveFactor(RESERVE_FACTOR));
    // reserve factor is the 5th param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, RESERVE_FACTOR, ZERO])
    );
    expect(await configMock.getReserveFactor()).to.be.eq(RESERVE_FACTOR);
    expect(await configMock.setReserveFactor(ZERO));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getReserveFactor()).to.be.eq(ZERO);
  });

  it('setReserveFactor() with reserveFactor == MAX_VALID_RESERVE_FACTOR', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.setReserveFactor(MAX_VALID_RESERVE_FACTOR));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, MAX_VALID_RESERVE_FACTOR, ZERO])
    );
  });

  it('setReserveFactor() with reserveFactor > MAX_VALID_RESERVE_FACTOR', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    await expect(configMock.setReserveFactor(MAX_VALID_RESERVE_FACTOR.add(1))).to.be.revertedWith(
      ProtocolErrors.INVALID_RESERVE_FACTOR
    );
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
  });

  it('getBorrowCap()', async () => {
    expect(bigNumbersToArrayString(await configMock.getCaps())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO])
    );
    expect(await configMock.getBorrowCap()).to.be.eq(ZERO);
    expect(await configMock.setBorrowCap(BORROW_CAP));
    // borrow cap is the 1st cap
    expect(bigNumbersToArrayString(await configMock.getCaps())).to.be.eql(
      bigNumbersToArrayString([BORROW_CAP, ZERO])
    );
    expect(await configMock.getBorrowCap()).to.be.eq(BORROW_CAP);
    expect(await configMock.setBorrowCap(ZERO));
    expect(bigNumbersToArrayString(await configMock.getCaps())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO])
    );
    expect(await configMock.getBorrowCap()).to.be.eq(ZERO);
  });

  it('getSupplyCap()', async () => {
    expect(bigNumbersToArrayString(await configMock.getCaps())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO])
    );
    expect(await configMock.getSupplyCap()).to.be.eq(ZERO);
    expect(await configMock.setSupplyCap(SUPPLY_CAP));
    // supply cap is the 2nd cap
    expect(bigNumbersToArrayString(await configMock.getCaps())).to.be.eql(
      bigNumbersToArrayString([ZERO, SUPPLY_CAP])
    );
    expect(await configMock.getSupplyCap()).to.be.eq(SUPPLY_CAP);
    expect(await configMock.setSupplyCap(ZERO));
    expect(bigNumbersToArrayString(await configMock.getCaps())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO])
    );
    expect(await configMock.getSupplyCap()).to.be.eq(ZERO);
  });

  it('getUnbackedMintCap()', async () => {
    expect(await configMock.getUnbackedMintCap()).to.be.eq(ZERO);
    expect(await configMock.setUnbackedMintCap(UNBACKED_MINT_CAP));
    expect(await configMock.getUnbackedMintCap()).to.be.eq(UNBACKED_MINT_CAP);
    expect(await configMock.setUnbackedMintCap(ZERO));
    expect(await configMock.getUnbackedMintCap()).to.be.eq(ZERO);
  });

  it('setLtv() with ltv = MAX_VALID_LTV', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLtv()).to.be.eq(ZERO);
    expect(await configMock.setLtv(MAX_VALID_LTV));
    // LTV is the 1st param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([MAX_VALID_LTV, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLtv()).to.be.eq(MAX_VALID_LTV);
    expect(await configMock.setLtv(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLtv()).to.be.eq(ZERO);
  });

  it('setLtv() with ltv > MAX_VALID_LTV (revert expected)', async () => {
    expect(await configMock.getLtv()).to.be.eq(ZERO);

    const { INVALID_LTV } = ProtocolErrors;

    // setLTV to MAX_VALID_LTV + 1
    await expect(configMock.setLtv(MAX_VALID_LTV.add(1))).to.be.revertedWith(INVALID_LTV);
    expect(await configMock.getLtv()).to.be.eq(ZERO);
  });

  it('setLiquidationThreshold() with threshold = MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);
    expect(await configMock.setLiquidationThreshold(MAX_VALID_LIQUIDATION_THRESHOLD));
    // LIQ_THRESHOLD is the 2nd param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, MAX_VALID_LIQUIDATION_THRESHOLD, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLiquidationThreshold()).to.be.eq(MAX_VALID_LIQUIDATION_THRESHOLD);
    expect(await configMock.setLiquidationThreshold(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);
  });

  it('setLiquidationThreshold() with threshold > MAX_VALID_LIQUIDATION_THRESHOLD (revert expected)', async () => {
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);

    const { INVALID_LIQ_THRESHOLD } = ProtocolErrors;

    // setLiquidationThreshold to MAX_VALID_LIQUIDATION_THRESHOLD + 1
    await expect(
      configMock.setLiquidationThreshold(MAX_VALID_LIQUIDATION_THRESHOLD.add(1))
    ).to.be.revertedWith(INVALID_LIQ_THRESHOLD);
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);
  });

  it('setDecimals() with decimals = MAX_VALID_DECIMALS', async () => {
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
    expect(await configMock.setDecimals(MAX_VALID_DECIMALS));
    // Decimals is the 4th param
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, MAX_VALID_DECIMALS, ZERO, ZERO])
    );
    expect(await configMock.getDecimals()).to.be.eq(MAX_VALID_DECIMALS);
    expect(await configMock.setDecimals(0));
    expect(bigNumbersToArrayString(await configMock.getParams())).to.be.eql(
      bigNumbersToArrayString([ZERO, ZERO, ZERO, ZERO, ZERO, ZERO])
    );
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
  });

  it('setDecimals() with decimals > MAX_VALID_DECIMALS (revert expected)', async () => {
    expect(await configMock.getDecimals()).to.be.eq(ZERO);

    const { INVALID_DECIMALS } = ProtocolErrors;

    // setDecimals to MAX_VALID_DECIMALS + 1
    await expect(configMock.setDecimals(MAX_VALID_DECIMALS.add(1))).to.be.revertedWith(
      INVALID_DECIMALS
    );
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
  });

  it('setEModeCategory() with categoryID = MAX_VALID_EMODE_CATEGORY', async () => {
    expect(await configMock.getEModeCategory()).to.be.eq(ZERO);
    expect(await configMock.setEModeCategory(MAX_VALID_EMODE_CATEGORY));
    expect(await configMock.getEModeCategory()).to.be.eq(MAX_VALID_EMODE_CATEGORY);
    expect(await configMock.setEModeCategory(0));
    expect(await configMock.getEModeCategory()).to.be.eq(ZERO);
  });

  it('setEModeCategory() with categoryID > MAX_VALID_EMODE_CATEGORY (revert expected)', async () => {
    expect(await configMock.getEModeCategory()).to.be.eq(ZERO);

    const { INVALID_EMODE_CATEGORY } = ProtocolErrors;

    await expect(configMock.setEModeCategory(MAX_VALID_EMODE_CATEGORY.add(1))).to.be.revertedWith(
      INVALID_EMODE_CATEGORY
    );
    expect(await configMock.getEModeCategory()).to.be.eq(ZERO);
  });

  it('setLiquidationProtocolFee() with liquidationProtocolFee == MAX_VALID_LIQUIDATION_PROTOCOL_FEE', async () => {
    expect(await configMock.getLiquidationProtocolFee()).to.be.eq(ZERO);
    expect(await configMock.setLiquidationProtocolFee(MAX_VALID_LIQUIDATION_PROTOCOL_FEE));
    expect(await configMock.getLiquidationProtocolFee()).to.be.eq(
      MAX_VALID_LIQUIDATION_PROTOCOL_FEE
    );
  });

  it('setLiquidationProtocolFee() with liquidationProtocolFee > MAX_VALID_LIQUIDATION_PROTOCOL_FEE', async () => {
    expect(await configMock.getLiquidationProtocolFee()).to.be.eq(ZERO);
    await expect(
      configMock.setLiquidationProtocolFee(MAX_VALID_LIQUIDATION_PROTOCOL_FEE.add(1))
    ).to.be.revertedWith(ProtocolErrors.INVALID_LIQUIDATION_PROTOCOL_FEE);
    expect(await configMock.getLiquidationProtocolFee()).to.be.eq(ZERO);
  });
});
