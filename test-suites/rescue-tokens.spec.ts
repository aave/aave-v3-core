import { expect } from 'chai';
import { utils } from 'ethers';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { evmSnapshot, evmRevert, ONE_ADDRESS } from '@aave/deploy-v3';
import { deployMintableERC20 } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { MintableERC20 } from '../types';

makeSuite('Rescue tokens', (testEnv: TestEnv) => {
  const { CALLER_NOT_POOL_ADMIN, CALLER_MUST_BE_POOL, UNDERLYING_CANNOT_BE_RESCUED } =
    ProtocolErrors;

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it.only('User tries to rescue tokens from Pool (revert expected)', async () => {
    const {
      pool,
      usdc,
      users: [rescuer],
    } = testEnv;

    const amount = 1;
    await expect(
      pool.connect(rescuer.signer).rescueTokens(usdc.address, rescuer.address, amount)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it.only('PoolAdmin rescue tokens from Pool', async () => {
    const {
      poolAdmin,
      pool,
      usdc,
      users: [locker],
    } = testEnv;

    const amountToLock = utils.parseUnits('10', 18);

    // Lock
    await usdc['mint(address,uint256)'](locker.address, amountToLock);
    await usdc.connect(locker.signer).transfer(pool.address, amountToLock);

    const lockerBalanceBefore = await usdc.balanceOf(locker.address);
    const poolBalanceBefore = await usdc.balanceOf(pool.address);

    expect(
      await pool.connect(poolAdmin.signer).rescueTokens(usdc.address, locker.address, amountToLock)
    );

    const poolBalanceAfter = await usdc.balanceOf(pool.address);
    expect(poolBalanceBefore).to.be.eq(poolBalanceAfter.add(amountToLock));
    const lockerBalanceAfter = await usdc.balanceOf(locker.address);
    expect(lockerBalanceBefore).to.be.eq(lockerBalanceAfter.sub(amountToLock));
  });

  it.only('User tries to rescue tokens from AToken (revert expected)', async () => {
    const {
      pool,
      usdc,
      users: [rescuer],
    } = testEnv;

    const amount = 1;
    const mockATokenAddress = ONE_ADDRESS;
    await expect(
      pool
        .connect(rescuer.signer)
        .rescueTokensFromAToken(mockATokenAddress, usdc.address, rescuer.address, amount)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it.only('User tries to rescue tokens from AToken calling directly (revert expected)', async () => {
    const {
      usdc,
      aDai,
      users: [rescuer],
    } = testEnv;

    const amount = 1;
    await expect(
      aDai.connect(rescuer.signer).rescueTokens(usdc.address, rescuer.address, amount)
    ).to.be.revertedWith(CALLER_MUST_BE_POOL);
  });

  it.only('User tries to rescue tokens of underlying from AToken (revert expected)', async () => {
    const {
      poolAdmin,
      pool,
      dai,
      users: [rescuer],
    } = testEnv;

    const amount = 1;
    await expect(
      pool
        .connect(poolAdmin.signer)
        .rescueTokensFromAToken(dai.address, dai.address, rescuer.address, amount)
    ).to.be.revertedWith(UNDERLYING_CANNOT_BE_RESCUED);
  });

  it.only('PoolAdmin rescue tokens from AToken', async () => {
    const {
      poolAdmin,
      pool,
      dai,
      usdc,
      aDai,
      users: [locker],
    } = testEnv;

    const amountToLock = utils.parseUnits('10', 18);

    // Lock
    await usdc['mint(address,uint256)'](locker.address, amountToLock);
    await usdc.connect(locker.signer).transfer(aDai.address, amountToLock);

    const lockerBalanceBefore = await usdc.balanceOf(locker.address);
    const poolBalanceBefore = await usdc.balanceOf(pool.address);
    const aTokenBalanceBefore = await usdc.balanceOf(aDai.address);

    expect(
      await pool
        .connect(poolAdmin.signer)
        .rescueTokensFromAToken(dai.address, usdc.address, locker.address, amountToLock)
    );

    const poolBalanceAfter = await usdc.balanceOf(pool.address);
    expect(poolBalanceBefore).to.be.eq(poolBalanceAfter);
    const aTokenBalanceAfter = await usdc.balanceOf(aDai.address);
    expect(aTokenBalanceBefore).to.be.eq(aTokenBalanceAfter.add(amountToLock));
    const lockerBalanceAfter = await usdc.balanceOf(locker.address);
    expect(lockerBalanceBefore).to.be.eq(lockerBalanceAfter.sub(amountToLock));
  });
});
