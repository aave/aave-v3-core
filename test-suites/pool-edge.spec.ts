import { expect } from 'chai';
import { utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { ZERO_ADDRESS } from '../helpers/constants';
import { deployMintableERC20 } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { ProtocolErrors } from '../helpers/types';
import { MockPoolInherited__factory } from '../types/factories/MockPoolInherited__factory';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/tx';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { evmRevert, evmSnapshot, Pool__factory } from '@aave/deploy-v3';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool: Edge cases', (testEnv: TestEnv) => {
  const {
    P_NO_MORE_RESERVES_ALLOWED,
    P_CALLER_MUST_BE_AN_ATOKEN,
    P_NOT_CONTRACT,
    P_CALLER_NOT_POOL_CONFIGURATOR,
    RL_RESERVE_ALREADY_INITIALIZED,
    PC_INVALID_CONFIGURATION,
  } = ProtocolErrors;

  const MAX_STABLE_RATE_BORROW_SIZE_PERCENT = '2500';
  const MAX_NUMBER_RESERVES = '128';

  it('Initialize fresh deployment with incorrect addresses provider (revert expected)', async () => {
    const {
      addressesProvider,
      users: [user_deployer],
    } = testEnv;
    const { deployer } = await hre.getNamedAccounts();
    const snap = await evmSnapshot();

    const supplyLibraryArtifact = await hre.deployments.get('SupplyLogic');
    const borrowLibraryArtifact = await hre.deployments.get('BorrowLogic');
    const liquidationLibraryArtifact = await hre.deployments.get('LiquidationLogic');
    const eModeLibraryArtifact = await hre.deployments.get('EModeLogic');
    const bridgeLibraryArtifact = await hre.deployments.get('BridgeLogic');
    const flashLoanLogicArtifact = await hre.deployments.get('FlashLoanLogic');

    const NEW_POOL_IMPL_ARTIFACT = await hre.deployments.deploy('Pool', {
      contract: 'Pool',
      from: deployer,
      args: [addressesProvider.address],
      libraries: {
        SupplyLogic: supplyLibraryArtifact.address,
        BorrowLogic: borrowLibraryArtifact.address,
        LiquidationLogic: liquidationLibraryArtifact.address,
        EModeLogic: eModeLibraryArtifact.address,
        BridgeLogic: bridgeLibraryArtifact.address,
        FlashLoanLogic: flashLoanLogicArtifact.address,
      },
      log: false,
    });

    const freshPool = Pool__factory.connect(NEW_POOL_IMPL_ARTIFACT.address, user_deployer.signer);

    await expect(freshPool.initialize(user_deployer.address)).to.be.revertedWith(
      PC_INVALID_CONFIGURATION
    );

    await evmRevert(snap);
  });

  it('Check initialization', async () => {
    const { pool } = testEnv;

    expect(await pool.MAX_STABLE_RATE_BORROW_SIZE_PERCENT()).to.be.eq(
      MAX_STABLE_RATE_BORROW_SIZE_PERCENT
    );
    expect(await pool.MAX_NUMBER_RESERVES()).to.be.eq(MAX_NUMBER_RESERVES);
  });

  it('Tries to initialize a reserve as non PoolConfigurator (revert expected)', async () => {
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

  it('Call `mintToTreasury()` on a pool with an inactive reserve', async () => {
    const { pool, poolAdmin, dai, users, configurator } = testEnv;

    // Deactivate reserve
    expect(await configurator.connect(poolAdmin.signer).setReserveActive(dai.address, false));

    // MintToTreasury
    expect(await pool.connect(users[0].signer).mintToTreasury([dai.address]));
  });

  it('Tries to call `finalizeTransfer()` by a non-aToken address (revert expected)', async () => {
    const { pool, dai, users } = testEnv;

    await expect(
      pool
        .connect(users[0].signer)
        .finalizeTransfer(dai.address, users[0].address, users[1].address, 0, 0, 0)
    ).to.be.revertedWith(P_CALLER_MUST_BE_AN_ATOKEN);
  });

  it('Tries to call `initReserve()` with an EOA as reserve (revert expected)', async () => {
    const { pool, deployer, users, configurator } = testEnv;

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    await expect(
      pool
        .connect(configSigner)
        .initReserve(users[0].address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)
    ).to.be.revertedWith(P_NOT_CONTRACT);
  });

  it('PoolConfigurator updates the ReserveInterestRateStrategy address', async () => {
    const { pool, deployer, dai, configurator } = testEnv;

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    expect(
      await pool
        .connect(configSigner)
        .setReserveInterestRateStrategyAddress(dai.address, ZERO_ADDRESS)
    );

    const config = await pool.getReserveData(dai.address);
    expect(config.interestRateStrategyAddress).to.be.eq(ZERO_ADDRESS);
  });

  it('Initialize an already initialized reserve. ReserveLogic `init` where aTokenAddress != ZERO_ADDRESS (revert expected)', async () => {
    const { pool, dai, deployer, configurator } = testEnv;

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

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

  it('Init reserve with ZERO_ADDRESS as aToken twice, to enter `_addReserveToList()` already added', async () => {
    /**
     * To get into this case, we need to init a reserve with `aTokenAddress = address(0)` twice.
     * `_addReserveToList()` is called from `initReserve`. However, in `initReserve` we run `init` before the `_addReserveToList()`,
     * and in `init` we are checking if `aTokenAddress == address(0)`, so to bypass that we need this odd init.
     */
    const { pool, dai, deployer, configurator } = testEnv;

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    const config = await pool.getReserveData(dai.address);

    const poolListBefore = await pool.getReservesList();

    expect(
      await pool.connect(configSigner).initReserve(
        config.aTokenAddress, // simulating asset address, just need a non-used reserve token
        ZERO_ADDRESS,
        config.stableDebtTokenAddress,
        config.variableDebtTokenAddress,
        ZERO_ADDRESS
      )
    );
    const poolListMid = await pool.getReservesList();
    expect(poolListBefore.length + 1).to.be.eq(poolListMid.length);

    // Add it again.
    expect(
      await pool.connect(configSigner).initReserve(
        config.aTokenAddress, // simulating asset address, just need a non-used reserve token
        ZERO_ADDRESS,
        config.stableDebtTokenAddress,
        config.variableDebtTokenAddress,
        ZERO_ADDRESS
      )
    );
    const poolListAfter = await pool.getReservesList();
    expect(poolListAfter.length).to.be.eq(poolListMid.length);
  });

  it('Initialize reserves until max, then add one more (revert expected)', async () => {
    // Upgrade the Pool to update the maximum number of reserves
    const { addressesProvider, poolAdmin, pool, dai, deployer, configurator } = testEnv;
    const { deployer: deployerName } = await hre.getNamedAccounts();

    // Impersonate the PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    // Deploy the mock Pool with a setter of `maxNumberOfReserves`
    const NEW_POOL_IMPL_ARTIFACT = await hre.deployments.deploy('MockPoolInherited', {
      contract: 'MockPoolInherited',
      from: deployerName,
      args: [addressesProvider.address],
      libraries: {
        SupplyLogic: (await hre.deployments.get('SupplyLogic')).address,
        BorrowLogic: (await hre.deployments.get('BorrowLogic')).address,
        LiquidationLogic: (await hre.deployments.get('LiquidationLogic')).address,
        EModeLogic: (await hre.deployments.get('EModeLogic')).address,
        BridgeLogic: (await hre.deployments.get('BridgeLogic')).address,
        FlashLoanLogic: (await hre.deployments.get('FlashLoanLogic')).address,
      },
      log: false,
    });

    const mockPoolImpl = MockPoolInherited__factory.connect(
      NEW_POOL_IMPL_ARTIFACT.address,
      deployer.signer
    );
    //const mockPoolImpl = await deployMockPoolInherited();
    // Upgrade the Pool
    expect(await addressesProvider.connect(poolAdmin.signer).setPoolImpl(mockPoolImpl.address))
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(mockPoolImpl.address);

    // Get the Pool instance
    const mockPoolAddress = await addressesProvider.getPool();
    const mockPool = await MockPoolInherited__factory.connect(
      mockPoolAddress,
      await getFirstSigner()
    );

    // Get the current number of reserves
    const numberOfReserves = (await mockPool.getReservesList()).length;

    // Set the limit
    expect(await mockPool.setMaxNumberOfReserves(numberOfReserves));
    expect(await mockPool.MAX_NUMBER_RESERVES()).to.be.eq(numberOfReserves);

    const freshContract = await deployMintableERC20(['MOCK', 'MOCK', '18']);
    const config = await pool.getReserveData(dai.address);
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
