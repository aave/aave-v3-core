import { expect } from 'chai';
import { BigNumberish, utils } from 'ethers';
import { DRE, evmRevert, evmSnapshot, impersonateAccountsHardhat } from '../helpers/misc-utils';
import { ZERO_ADDRESS } from '../helpers/constants';
import { deployMintableERC20 } from '../helpers/contracts-deployments';
import { ProtocolErrors } from '../helpers/types';
import {
  ATokenFactory,
  MockPoolInheritedFactory,
  MockReserveInterestRateStrategyFactory,
  StableDebtToken,
  StableDebtTokenFactory,
  VariableDebtTokenFactory,
} from '../types';
import {
  getBorrowLogic,
  getBridgeLogic,
  getSupplyLogic,
  getFirstSigner,
  getLiquidationLogic,
  getEModeLogic,
  getFlashLoanLogic,
} from '../helpers/contracts-getters';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('Pool: Edge cases', (testEnv: TestEnv) => {
  const {
    P_NO_MORE_RESERVES_ALLOWED,
    P_CALLER_MUST_BE_AN_ATOKEN,
    P_NOT_CONTRACT,
    P_CALLER_NOT_POOL_CONFIGURATOR,
    RL_RESERVE_ALREADY_INITIALIZED,
  } = ProtocolErrors;

  const MAX_STABLE_RATE_BORROW_SIZE_PERCENT = '2500';
  const MAX_NUMBER_RESERVES = '128';

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
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
    expect(await configurator.connect(poolAdmin.signer).deactivateReserve(dai.address));

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
    const configSigner = await DRE.ethers.getSigner(configurator.address);

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
    const configSigner = await DRE.ethers.getSigner(configurator.address);

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
    const configSigner = await DRE.ethers.getSigner(configurator.address);

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

    // Impersonate the PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    // Deploy the mock Pool with a setter of `maxNumberOfReserves`
    const libraries = {
      ['__$d5ddd09ae98762b8929dd85e54b218e259$__']: (await getFlashLoanLogic()).address,
      ['__$b06080f092f400a43662c3f835a4d9baa8$__']: (await getBridgeLogic()).address,
      ['__$db79717e66442ee197e8271d032a066e34$__']: (await getSupplyLogic()).address,
      ['__$c3724b8d563dc83a94e797176cddecb3b9$__']: (await getBorrowLogic()).address,
      ['__$f598c634f2d943205ac23f707b80075cbb$__']: (await getLiquidationLogic()).address,
      ['__$e4b9550ff526a295e1233dea02821b9004$__']: (await getEModeLogic()).address,
    };

    const mockPoolImpl = await (
      await new MockPoolInheritedFactory(libraries, await getFirstSigner()).deploy()
    ).deployed();

    // Upgrade the Pool
    expect(await addressesProvider.connect(poolAdmin.signer).setPoolImpl(mockPoolImpl.address))
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(mockPoolImpl.address);

    // Get the Pool instance
    const mockPoolAddress = await addressesProvider.getPool();
    const mockPool = await MockPoolInheritedFactory.connect(
      mockPoolAddress,
      await getFirstSigner()
    );

    // Get the current number of reserves
    let numberOfReserves = (await mockPool.getReservesList()).length;

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

  it('Add asset after multiple drops', async () => {
    /**
     * 1. Init assets (done through setup so get this for free)
     * 2. Drop some reserves
     * 3. Init a new asset.
     * Intended behaviour new asset is inserted into one of the available spots in
     */
    const { configurator, pool, poolAdmin, addressesProvider } = testEnv;

    const reservesListBefore = await pool.connect(configurator.signer).getReservesList();

    // Remove first 2 assets that has no borrows but still has aTokens specified.
    let dropped = 0;
    for (let i = 0; i < reservesListBefore.length; i++) {
      if (dropped == 2) {
        break;
      }
      const reserveAsset = reservesListBefore[i];
      const assetData = await pool.getReserveData(reserveAsset);

      if (
        assetData.currentLiquidityRate.eq(0) &&
        assetData.currentStableBorrowRate.eq(0) &&
        assetData.currentVariableBorrowRate.eq(0)
      ) {
        await configurator.connect(poolAdmin.signer).dropReserve(reserveAsset);
        dropped++;
      }
    }

    const reservesListAfterDrop = await pool.connect(configurator.signer).getReservesList();
    expect(reservesListAfterDrop.length).to.be.eq(reservesListBefore.length - 2);

    // Deploy new token and implementations
    const mockToken = await deployMintableERC20(['MOCK', 'MOCK', '18']);
    const stableDebtTokenImplementation = await new StableDebtTokenFactory(
      await getFirstSigner()
    ).deploy(pool.address);
    const variableDebtTokenImplementation = await new VariableDebtTokenFactory(
      await getFirstSigner()
    ).deploy(pool.address);
    const aTokenImplementation = await new ATokenFactory(await getFirstSigner()).deploy(
      pool.address
    );
    const mockRateStrategy = await new MockReserveInterestRateStrategyFactory(
      await getFirstSigner()
    ).deploy(addressesProvider.address, 0, 0, 0, 0, 0, 0);

    // Init the reserve
    const initInputParams: {
      aTokenImpl: string;
      stableDebtTokenImpl: string;
      variableDebtTokenImpl: string;
      underlyingAssetDecimals: BigNumberish;
      interestRateStrategyAddress: string;
      underlyingAsset: string;
      treasury: string;
      incentivesController: string;
      underlyingAssetName: string;
      aTokenName: string;
      aTokenSymbol: string;
      variableDebtTokenName: string;
      variableDebtTokenSymbol: string;
      stableDebtTokenName: string;
      stableDebtTokenSymbol: string;
      params: string;
    }[] = [
      {
        aTokenImpl: aTokenImplementation.address,
        stableDebtTokenImpl: stableDebtTokenImplementation.address,
        variableDebtTokenImpl: variableDebtTokenImplementation.address,
        underlyingAssetDecimals: 18,
        interestRateStrategyAddress: mockRateStrategy.address,
        underlyingAsset: mockToken.address,
        treasury: ZERO_ADDRESS,
        incentivesController: ZERO_ADDRESS,
        underlyingAssetName: 'MOCK',
        aTokenName: 'AMOCK',
        aTokenSymbol: 'AMOCK',
        variableDebtTokenName: 'VMOCK',
        variableDebtTokenSymbol: 'VMOCK',
        stableDebtTokenName: 'SMOCK',
        stableDebtTokenSymbol: 'SMOCK',
        params: '0x10',
      },
    ];

    expect(await configurator.connect(poolAdmin.signer).initReserves(initInputParams));
    const reservesListAfterInit = await pool.connect(configurator.signer).getReservesList();

    let occurences = reservesListAfterInit.filter((v) => v == mockToken.address).length;
    expect(occurences).to.be.eq(1, 'Asset has multiple occurrences in the reserves list');

    expect(reservesListAfterInit.length).to.be.eq(
      reservesListAfterDrop.length + 1,
      'Reserves list was increased by more than 1'
    );
  });

  it('Initialize reserves until max-1, then (drop one and add a new) x 2, finally add to hit max', async () => {
    /**
     * 1. Update max number of assets to current number og assets
     * 2. Drop some reserves
     * 3. Init a new asset.
     * Intended behaviour: new asset is inserted into one of the available spots in `_reservesList` and `_reservesCount` kept the same
     */

    // Upgrade the Pool to update the maximum number of reserves
    const { addressesProvider, poolAdmin, pool, dai, deployer, configurator } = testEnv;

    // Impersonate the PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await DRE.ethers.getSigner(configurator.address);

    // Deploy the mock Pool with a setter of `maxNumberOfReserves`
    const libraries = {
      ['__$d5ddd09ae98762b8929dd85e54b218e259$__']: (await getFlashLoanLogic()).address,
      ['__$b06080f092f400a43662c3f835a4d9baa8$__']: (await getBridgeLogic()).address,
      ['__$db79717e66442ee197e8271d032a066e34$__']: (await getSupplyLogic()).address,
      ['__$c3724b8d563dc83a94e797176cddecb3b9$__']: (await getBorrowLogic()).address,
      ['__$f598c634f2d943205ac23f707b80075cbb$__']: (await getLiquidationLogic()).address,
      ['__$e4b9550ff526a295e1233dea02821b9004$__']: (await getEModeLogic()).address,
    };

    const mockPoolImpl = await (
      await new MockPoolInheritedFactory(libraries, await getFirstSigner()).deploy()
    ).deployed();

    // Upgrade the Pool
    expect(await addressesProvider.connect(poolAdmin.signer).setPoolImpl(mockPoolImpl.address))
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(mockPoolImpl.address);

    // Get the Pool instance
    const mockPoolAddress = await addressesProvider.getPool();
    const mockPool = await MockPoolInheritedFactory.connect(
      mockPoolAddress,
      await getFirstSigner()
    );

    // Get the current number of reserves
    let numberOfReserves = (await mockPool.getReservesList()).length;

    // Set the limit
    expect(await mockPool.setMaxNumberOfReserves(numberOfReserves + 1));
    expect(await mockPool.MAX_NUMBER_RESERVES()).to.be.eq(numberOfReserves + 1);

    for (let dropped = 0; dropped < 2; dropped++) {
      const reservesListBefore = await pool.connect(configurator.signer).getReservesList();
      for (let i = 0; i < reservesListBefore.length; i++) {
        const reserveAsset = reservesListBefore[i];
        const assetData = await pool.getReserveData(reserveAsset);

        if (assetData.aTokenAddress == ZERO_ADDRESS) {
          continue;
        }

        if (
          assetData.currentLiquidityRate.eq(0) &&
          assetData.currentStableBorrowRate.eq(0) &&
          assetData.currentVariableBorrowRate.eq(0)
        ) {
          await configurator.connect(poolAdmin.signer).dropReserve(reserveAsset);
          break;
        }
      }

      const reservesListLengthAfterDrop = (await pool.getReservesList()).length;
      expect(reservesListLengthAfterDrop).to.be.eq(reservesListBefore.length - 1);
      expect(reservesListLengthAfterDrop).to.be.lt(await mockPool.MAX_NUMBER_RESERVES());

      const freshContract = await deployMintableERC20(['MOCK', 'MOCK', '18']);
      const config = await pool.getReserveData(dai.address);
      expect(
        await pool.connect(configSigner).initReserve(
          freshContract.address, // just need a non-used reserve token
          ZERO_ADDRESS,
          config.stableDebtTokenAddress,
          config.variableDebtTokenAddress,
          ZERO_ADDRESS
        )
      );
    }

    const freshContract = await deployMintableERC20(['MOCK', 'MOCK', '18']);
    const config = await pool.getReserveData(dai.address);
    expect(
      await pool.connect(configSigner).initReserve(
        freshContract.address, // just need a non-used reserve token
        ZERO_ADDRESS,
        config.stableDebtTokenAddress,
        config.variableDebtTokenAddress,
        ZERO_ADDRESS
      )
    );
    expect((await pool.getReservesList()).length).to.be.eq(await pool.MAX_NUMBER_RESERVES());
  });
});
