import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { evmSnapshot, evmRevert, ZERO_ADDRESS } from '@aave/deploy-v3';

makeSuite('Pool: getReserveAddressById', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('User gets address of reserve by id', async () => {
    const { pool, usdc } = testEnv;

    const reserveData = await pool.getReserveData(usdc.address);

    const reserveAddress = await pool.getReserveAddressById(reserveData.id);

    await expect(reserveAddress).to.be.eq(usdc.address);
  });

  it('User calls `getReserveAddressById` with a wrong id (id > reservesCount)', async () => {
    const { pool } = testEnv;

    // MAX_NUMBER_RESERVES is always greater than reservesCount
    const maxNumberOfReserves = await pool.MAX_NUMBER_RESERVES();
    const reserveAddress = await pool.getReserveAddressById(maxNumberOfReserves.add(1));

    await expect(reserveAddress).to.be.eq(ZERO_ADDRESS);
  });
});
