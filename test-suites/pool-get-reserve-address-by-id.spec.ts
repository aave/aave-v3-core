import { expect } from 'chai';
import { utils } from 'ethers';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { evmSnapshot, evmRevert, ONE_ADDRESS } from '@aave/deploy-v3';
import { deployMintableERC20 } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { MintableERC20 } from '../types';

makeSuite('getReserveAddressById', (testEnv: TestEnv) => {
 
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('User tries to rescue tokens from Pool (revert expected)', async () => {
    const {
      pool,
      usdc,
      users: [rescuer],
    } = testEnv;

    const reserveData = await pool.getReserveData(usdc.address);
    
    const reserveAddress = await pool.getReserveAddressById(reserveData.id);
    
    await expect(
    reserveAddress
    ).to.be.eq(usdc.address);
  });

});
