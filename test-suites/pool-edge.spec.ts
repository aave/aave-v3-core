import { expect } from 'chai';
import { makeSuite, TestEnv } from './helpers/make-suite';
import {
  DRE,
  impersonateAccountsHardhat,
} from '../helpers/misc-utils';
import { utils } from 'ethers';
import { ProtocolErrors } from '../helpers/types';
import { ZERO_ADDRESS } from '../helpers/constants';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { deployMintableERC20 } from '../helpers/contracts-deployments';

makeSuite('Pool - edge cases', (testEnv: TestEnv) => {
  const {
    P_NO_MORE_RESERVES_ALLOWED,
    P_CALLER_MUST_BE_AN_ATOKEN,
    P_NOT_CONTRACT,
    P_CALLER_NOT_POOL_CONFIGURATOR,
    RL_RESERVE_ALREADY_INITIALIZED,
  } = ProtocolErrors;

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

    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
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

    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
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
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    expect(await pool.paused()).to.be.eq(false);
    await pool.connect(configSigner).setPause(true);
    expect(await pool.paused()).to.be.eq(true);
  });

  it('ReserveLogic init, aTokenAddress != address(0)', async () => {
    const { pool, poolAdmin, dai, helpersContract, deployer, configurator } = testEnv;

    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    const config = await pool.getReserveData(dai.address);

    await expect(
      pool.connect(configSigner).initReserve(
        dai.address,
        config.aTokenAddress, // just need a non-used reserve token
        config.stableDebtTokenAddress,
        config.variableDebtTokenAddress,
        ZERO_ADDRESS
      )
    ).to.be.revertedWith(RL_RESERVE_ALREADY_INITIALIZED);
  });

  it('_addReserveToList() already added', async () => {
    /**
     * To get into this case, we need to init a reserve with `aTokenAddress = address(0)` twice.
     * `_addReserveToList()` is called from `initReserve`. However, in `initReserve` we run `init` before the `_addReserveToList()`,
     * and in `init` we are checking if `aTokenAddress == address(0)`, so to bypass that we need this odd init.
     */
    const { pool, poolAdmin, dai, helpersContract, deployer, configurator } = testEnv;

    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    const config = await pool.getReserveData(dai.address);

    const poolListBefore = await pool.getReservesList();

    await pool.connect(configSigner).initReserve(
      config.aTokenAddress, // just need a non-used reserve token
      ZERO_ADDRESS,
      config.stableDebtTokenAddress,
      config.variableDebtTokenAddress,
      ZERO_ADDRESS
    );
    const poolListMid = await pool.getReservesList();
    expect(poolListBefore.length + 1).to.be.eq(poolListMid.length);

    // Add it again.
    await pool.connect(configSigner).initReserve(
      config.aTokenAddress, // just need a non-used reserve token
      ZERO_ADDRESS,
      config.stableDebtTokenAddress,
      config.variableDebtTokenAddress,
      ZERO_ADDRESS
    );
    const poolListAfter = await pool.getReservesList();
    expect(poolListAfter.length).to.be.eq(poolListMid.length);
  });

  it('_addReserveToList() reservesCount > _maxNumberOfReserves', async () => {
    // TODO: For the love of god, let is make something more nice here.
    // Really a pain, but practically, we just want to loop until we hit something high?
    const { pool, dai, deployer, configurator } = testEnv;

    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    const config = await pool.getReserveData(dai.address);
    const poolListBefore = await pool.getReservesList();

    for (let i = poolListBefore.length; i < 127; i++) {
      const freshContract = await deployMintableERC20(['MOCK', 'MOCK', '18']);
      await pool.connect(configSigner).initReserve(
        freshContract.address, // just need a non-used reserve token
        ZERO_ADDRESS,
        config.stableDebtTokenAddress,
        config.variableDebtTokenAddress,
        ZERO_ADDRESS
      );
    }

    const freshContract = await deployMintableERC20(['MOCK', 'MOCK', '18']);
    await expect(
      pool.connect(configSigner).initReserve(
        freshContract.address, // just need a non-used reserve token
        ZERO_ADDRESS,
        config.stableDebtTokenAddress,
        config.variableDebtTokenAddress,
        ZERO_ADDRESS
      )
    ).to.be.revertedWith(P_NO_MORE_RESERVES_ALLOWED);
  });
});
