import { expect } from 'chai';
import { BigNumber, ethers } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import {
  DRE,
  evmRevert,
  evmSnapshot,
  impersonateAccountsHardhat,
  timeLatest,
} from '../helpers/misc-utils';
import { parseEther, _TypedDataEncoder } from 'ethers/lib/utils';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';
import { config } from 'hardhat';
import { configuration } from './helpers/utils/calculations';
import { SelfdestructTransferFactory, SelfdestructTransfer } from '../types';

makeSuite('Pool - edge cases', (testEnv: TestEnv) => {
  const { P_CALLER_MUST_BE_AN_ATOKEN, P_NOT_CONTRACT, P_CALLER_NOT_POOL_CONFIGURATOR } =
    ProtocolErrors;

  it('_onlyPoolConfigurator called by non PoolConfigurator', async () => {
    // calling initReserve
    const { pool, users, dai, helpersContract } = testEnv;

    const config = await helpersContract.getReserveTokensAddresses(dai.address);

    await expect(
      pool
        .connect(users[0].signer)
        .initReserve(
          dai.address,
          config.aTokenAddress,
          config.stableDebtTokenAddress,
          config.variableDebtTokenAddress,
          ZERO_ADDRESS
        )
    ).to.be.revertedWith(P_CALLER_NOT_POOL_CONFIGURATOR);
  });

  it('mintToTreasury() inactive reserve', async () => {
    const { pool, poolAdmin, dai, users, configurator } = testEnv;
    await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address);
    await pool.connect(users[0].signer).mintToTreasury([dai.address]);
  });

  it('getReservesList() droppedReservesCount == 0', async () => {
    expect(false, 'TODO').to.be.eq(true);
  });

  it('check getters', async () => {
    const { pool } = testEnv;

    const MAX_STABLE_RATE_BORROW_SIZE_PERCENT = await pool.MAX_STABLE_RATE_BORROW_SIZE_PERCENT();
    const MAX_NUMBER_RESERVES = await pool.MAX_NUMBER_RESERVES();

    expect(MAX_STABLE_RATE_BORROW_SIZE_PERCENT.toString()).to.be.eq('2500');
    expect(MAX_NUMBER_RESERVES.toString()).to.be.eq('128');
  });

  it('finalizeTransfer() from non-atoken as sender', async () => {
    const { pool, dai, users } = testEnv;

    await expect(
      pool
        .connect(users[0].signer)
        .finalizeTransfer(dai.address, users[0].address, users[1].address, 0, 0, 0)
    ).to.be.revertedWith(P_CALLER_MUST_BE_AN_ATOKEN);
  });

  it('initReserve() asset is EOA', async () => {
    const { pool, deployer, dai, users, configurator } = testEnv;

    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();
    await sdt.destroyAndTransfer(configurator.address, { value: parseEther('1') });
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    await expect(
      pool
        .connect(configSigner)
        .initReserve(users[0].address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)
    ).to.be.revertedWith(P_NOT_CONTRACT);
  });

  it('setReserveInterestRateStrategyAddress()', async () => {
    const { pool, deployer, dai, configurator } = testEnv;

    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();
    await sdt.destroyAndTransfer(configurator.address, { value: parseEther('1') });
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    await pool
      .connect(configSigner)
      .setReserveInterestRateStrategyAddress(dai.address, ZERO_ADDRESS);

    const config = await pool.getReserveData(dai.address);

    expect(config.interestRateStrategyAddress).to.be.eq(ZERO_ADDRESS);
  });

  it('setPause()', async () => {
    const { pool, deployer, dai, configurator } = testEnv;
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();
    await sdt.destroyAndTransfer(configurator.address, { value: parseEther('1') });
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    expect(await pool.paused()).to.be.eq(false);
    await pool.connect(configSigner).setPause(true);
    expect(await pool.paused()).to.be.eq(true);
  });

  it('_addReserveToList()', async () => {
    expect(false, 'todo').to.be.eq(true);
  });
});
