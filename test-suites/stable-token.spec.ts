import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { getStableDebtToken } from '../helpers/contracts-getters';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { parseUnits } from 'ethers/lib/utils';
import BigNumber from 'bignumber.js';

makeSuite('Stable debt token tests', (testEnv: TestEnv) => {
  const { CT_CALLER_MUST_BE_POOL } = ProtocolErrors;

  it('Tries to invoke mint not being the Pool', async () => {
    const { deployer, dai, helpersContract } = testEnv;

    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;

    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    await expect(
      stableDebtContract.mint(deployer.address, deployer.address, '1', '1')
    ).to.be.revertedWith(CT_CALLER_MUST_BE_POOL);
  });

  it('Tries to invoke burn not being the Pool', async () => {
    const { deployer, dai, helpersContract } = testEnv;

    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;

    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    const name = await stableDebtContract.name();

    expect(name).to.be.equal('Aave stable debt bearing DAI');
    await expect(stableDebtContract.burn(deployer.address, '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_POOL
    );
  });

  it('check getters', async () => {
    const { deployer, pool, weth, dai, helpersContract, users } = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    expect(await stableDebtContract.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await stableDebtContract.POOL()).to.be.eq(pool.address);
    expect(await stableDebtContract.getIncentivesController()).to.be.eq(ZERO_ADDRESS);

    const totSupplyAndRateBefore = await stableDebtContract.getTotalSupplyAndAvgRate();
    expect(totSupplyAndRateBefore[0].toString()).to.be.eq('0');
    expect(totSupplyAndRateBefore[1].toString()).to.be.eq('0');

    // Need to create some debt to do this good
    await dai.connect(users[0].signer).mint(parseUnits('1000', 18));
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, parseUnits('1000', 18), users[0].address, 0);
    await weth.connect(users[1].signer).mint(parseUnits('10', 18));
    await weth.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .deposit(weth.address, parseUnits('10', 18), users[1].address, 0);
    await pool
      .connect(users[1].signer)
      .borrow(dai.address, parseUnits('200', 18), RateMode.Stable, 0, users[1].address);

    const totSupplyAndRateAfter = await stableDebtContract.getTotalSupplyAndAvgRate();
    expect(new BigNumber(totSupplyAndRateAfter[0].toString()).gt(new BigNumber(0))).to.be.eq(true);
    expect(new BigNumber(totSupplyAndRateAfter[1].toString()).gt(new BigNumber(0))).to.be.eq(true);
  });

  it('transfer()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    await expect(
      stableDebtContract.connect(users[0].signer).transfer(users[1].address, 500)
    ).to.be.revertedWith('TRANSFER_NOT_SUPPORTED');
  });

  it('approve()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    await expect(
      stableDebtContract.connect(users[0].signer).approve(users[1].address, 500)
    ).to.be.revertedWith('APPROVAL_NOT_SUPPORTED');
    await expect(
      stableDebtContract.allowance(users[0].address, users[1].address)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('increaseAllowance()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    await expect(
      stableDebtContract.connect(users[0].signer).increaseAllowance(users[1].address, 500)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('decreaseAllowance()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    await expect(
      stableDebtContract.connect(users[0].signer).decreaseAllowance(users[1].address, 500)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('transferFrom()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = await getStableDebtToken(daiStableDebtTokenAddress);

    await expect(
      stableDebtContract
        .connect(users[0].signer)
        .transferFrom(users[0].address, users[1].address, 500)
    ).to.be.revertedWith('TRANSFER_NOT_SUPPORTED');
  });
});
