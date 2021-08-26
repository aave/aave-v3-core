import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { getVariableDebtToken } from '../helpers/contracts-getters';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { SelfdestructTransfer, SelfdestructTransferFactory } from '../types';
import BigNumber from 'bignumber.js';
import { DRE, impersonateAccountsHardhat } from '../helpers/misc-utils';

makeSuite('Variable debt token tests', (testEnv: TestEnv) => {
  const { CT_CALLER_MUST_BE_POOL, CT_INVALID_MINT_AMOUNT, CT_INVALID_BURN_AMOUNT } = ProtocolErrors;

  it('Tries to invoke mint not being the Pool', async () => {
    const { deployer, dai, helpersContract } = testEnv;

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.mint(deployer.address, deployer.address, '1', '1')
    ).to.be.revertedWith(CT_CALLER_MUST_BE_POOL);
  });

  it('Tries to invoke burn not being the Pool', async () => {
    const { deployer, dai, helpersContract } = testEnv;

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(variableDebtContract.burn(deployer.address, '1', '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_POOL
    );
  });

  it('check getters', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    expect(await variableDebtContract.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await variableDebtContract.POOL()).to.be.eq(pool.address);
    expect(await variableDebtContract.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    const scaledUserBalanceAndSupplyUser0Before =
      await variableDebtContract.getScaledUserBalanceAndSupply(users[0].address);
    expect(scaledUserBalanceAndSupplyUser0Before[0].toString()).to.be.eq('0');
    expect(scaledUserBalanceAndSupplyUser0Before[1].toString()).to.be.eq('0');

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
      .borrow(dai.address, parseUnits('200', 18), RateMode.Variable, 0, users[1].address);

    const scaledUserBalanceAndSupplyUser0After =
      await variableDebtContract.getScaledUserBalanceAndSupply(users[0].address);
    expect(scaledUserBalanceAndSupplyUser0After[0].toString()).to.be.eq('0');
    expect(
      new BigNumber(scaledUserBalanceAndSupplyUser0After[1].toString()).gt(new BigNumber(0))
    ).to.be.eq(true);

    const scaledUserBalanceAndSupplyUser1After =
      await variableDebtContract.getScaledUserBalanceAndSupply(users[1].address);
    expect(
      new BigNumber(scaledUserBalanceAndSupplyUser1After[1].toString()).gt(new BigNumber(0))
    ).to.be.eq(true);
    expect(
      new BigNumber(scaledUserBalanceAndSupplyUser1After[1].toString()).gt(new BigNumber(0))
    ).to.be.eq(true);

    expect(scaledUserBalanceAndSupplyUser0After[1].toString()).to.be.eq(
      scaledUserBalanceAndSupplyUser1After[1].toString()
    );
  });

  it('mint() amountScaled == 0', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      variableDebtContract
        .connect(poolSigner)
        .mint(users[0].address, users[0].address, 0, parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_MINT_AMOUNT);
  });

  it('burn() amountScaled == 0', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      variableDebtContract.connect(poolSigner).burn(users[0].address, 0, parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_BURN_AMOUNT);
  });

  it('transfer()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).transfer(users[1].address, 500)
    ).to.be.revertedWith('TRANSFER_NOT_SUPPORTED');
  });

  it('approve()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).approve(users[1].address, 500)
    ).to.be.revertedWith('APPROVAL_NOT_SUPPORTED');
    await expect(
      variableDebtContract.allowance(users[0].address, users[1].address)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('increaseAllowance()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).increaseAllowance(users[1].address, 500)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('decreaseAllowance()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).decreaseAllowance(users[1].address, 500)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('transferFrom()', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract
        .connect(users[0].signer)
        .transferFrom(users[0].address, users[1].address, 500)
    ).to.be.revertedWith('TRANSFER_NOT_SUPPORTED');
  });
});
