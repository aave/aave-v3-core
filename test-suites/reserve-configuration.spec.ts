import { oneEther } from '../helpers/constants';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { deployMockReserveConfiguration } from '../helpers/contracts-deployments';
import { MockReserveConfiguration } from '../types';
import { ProtocolErrors } from '../helpers/types';

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

  const MAX_VALID_LTV = BigNumber.from(65535);
  const MAX_VALID_LIQUIDATION_THRESHOLD = BigNumber.from(65535);
  const MAX_VALID_DECIMALS = BigNumber.from(255);

  before(async () => {
    configMock = await deployMockReserveConfiguration();
  });

  it('getLtv()', async () => {
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLtv()).to.be.eq(ZERO);
    expect(await configMock.setLtv(LTV));
    // LTV is the 1st param
    expect(await configMock.getParams()).to.be.eql([LTV, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLtv()).to.be.eq(LTV);
    expect(await configMock.setLtv(0));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLtv()).to.be.eq(ZERO);
  });

  it('getLiquidationBonus()', async () => {
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLiquidationBonus()).to.be.eq(ZERO);
    expect(await configMock.setLiquidationBonus(LB));
    // LB is the 3rd param
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, LB, ZERO, ZERO]);
    expect(await configMock.getLiquidationBonus()).to.be.eq(LB);
    expect(await configMock.setLiquidationBonus(0));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLiquidationBonus()).to.be.eq(ZERO);
  });

  it('getDecimals()', async () => {
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
    expect(await configMock.setDecimals(DECIMALS));
    // decimals is the 4th param
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, DECIMALS, ZERO]);
    expect(await configMock.getDecimals()).to.be.eq(DECIMALS);
    expect(await configMock.setDecimals(0));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
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
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getReserveFactor()).to.be.eq(ZERO);
    expect(await configMock.setReserveFactor(RESERVE_FACTOR));
    // reserve factor is the 5th param
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, RESERVE_FACTOR]);
    expect(await configMock.getReserveFactor()).to.be.eq(RESERVE_FACTOR);
    expect(await configMock.setReserveFactor(ZERO));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getReserveFactor()).to.be.eq(ZERO);
  });

  it('getBorrowCap()', async () => {
    expect(await configMock.getCaps()).to.be.eql([ZERO, ZERO]);
    expect(await configMock.getBorrowCap()).to.be.eq(ZERO);
    expect(await configMock.setBorrowCap(BORROW_CAP));
    // borrow cap is the 1st cap
    expect(await configMock.getCaps()).to.be.eql([BORROW_CAP, ZERO]);
    expect(await configMock.getBorrowCap()).to.be.eq(BORROW_CAP);
    expect(await configMock.setBorrowCap(ZERO));
    expect(await configMock.getCaps()).to.be.eql([ZERO, ZERO]);
    expect(await configMock.getBorrowCap()).to.be.eq(ZERO);
  });

  it('getSupplyCap()', async () => {
    expect(await configMock.getCaps()).to.be.eql([ZERO, ZERO]);
    expect(await configMock.getSupplyCap()).to.be.eq(ZERO);
    expect(await configMock.setSupplyCap(SUPPLY_CAP));
    // supply cap is the 2nd cap
    expect(await configMock.getCaps()).to.be.eql([ZERO, SUPPLY_CAP]);
    expect(await configMock.getSupplyCap()).to.be.eq(SUPPLY_CAP);
    expect(await configMock.setSupplyCap(ZERO));
    expect(await configMock.getCaps()).to.be.eql([ZERO, ZERO]);
    expect(await configMock.getSupplyCap()).to.be.eq(ZERO);
  });

  it('setLtv() with ltv = MAX_VALID_LTV', async () => {
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLtv()).to.be.eq(ZERO);
    expect(await configMock.setLtv(MAX_VALID_LTV));
    // LTV is the 1st param
    expect(await configMock.getParams()).to.be.eql([MAX_VALID_LTV, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLtv()).to.be.eq(MAX_VALID_LTV);
    expect(await configMock.setLtv(0));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLtv()).to.be.eq(ZERO);
  });

  it('setLtv() with ltv > MAX_VALID_LTV and reverts', async () => {
    expect(await configMock.getLtv()).to.be.eq(ZERO);

    const { RC_INVALID_LTV } = ProtocolErrors;

    // setLTV to MAX_VALID_LTV + 1
    await expect(configMock.setLtv(MAX_VALID_LTV.add(1))).revertedWith(RC_INVALID_LTV);
    expect(await configMock.getLtv()).to.be.eq(ZERO);
  });

  it('setLiquidationThreshold() with threshold = MAX_VALID_LIQUIDATION_THRESHOLD', async () => {
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);
    expect(await configMock.setLiquidationThreshold(MAX_VALID_LIQUIDATION_THRESHOLD));
    // LIQ_THRESHOLD is the 2nd param
    expect(await configMock.getParams()).to.be.eql([
      ZERO,
      MAX_VALID_LIQUIDATION_THRESHOLD,
      ZERO,
      ZERO,
      ZERO,
    ]);
    expect(await configMock.getLiquidationThreshold()).to.be.eq(MAX_VALID_LIQUIDATION_THRESHOLD);
    expect(await configMock.setLiquidationThreshold(0));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);
  });

  it('setLiquidationThreshold() with threshold > MAX_VALID_LIQUIDATION_THRESHOLD and reverts', async () => {
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);

    const { RC_INVALID_LIQ_THRESHOLD } = ProtocolErrors;

    // setLiquidationThreshold to MAX_VALID_LIQUIDATION_THRESHOLD + 1
    await expect(
      configMock.setLiquidationThreshold(MAX_VALID_LIQUIDATION_THRESHOLD.add(1))
    ).revertedWith(RC_INVALID_LIQ_THRESHOLD);
    expect(await configMock.getLiquidationThreshold()).to.be.eq(ZERO);
  });

  it('setDecimals() with decimals = MAX_VALID_DECIMALS', async () => {
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
    expect(await configMock.setDecimals(MAX_VALID_DECIMALS));
    // Decimals is the 4th param
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, MAX_VALID_DECIMALS, ZERO]);
    expect(await configMock.getDecimals()).to.be.eq(MAX_VALID_DECIMALS);
    expect(await configMock.setDecimals(0));
    expect(await configMock.getParams()).to.be.eql([ZERO, ZERO, ZERO, ZERO, ZERO]);
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
  });

  it('setDecimals() with decimals > MAX_VALID_DECIMALS and reverts', async () => {
    expect(await configMock.getDecimals()).to.be.eq(ZERO);

    const { RC_INVALID_DECIMALS } = ProtocolErrors;

    // setDecimals to MAX_VALID_DECIMALS + 1
    await expect(configMock.setDecimals(MAX_VALID_DECIMALS.add(1))).revertedWith(
      RC_INVALID_DECIMALS
    );
    expect(await configMock.getDecimals()).to.be.eq(ZERO);
  });
});
