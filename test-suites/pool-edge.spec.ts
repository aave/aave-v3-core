import { expect } from 'chai';
import { BigNumber, BigNumberish, utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { deployMintableERC20 } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { ProtocolErrors } from '../helpers/types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { evmSnapshot, evmRevert, getPoolLibraries } from '@aave/deploy-v3';
import {
  MockPoolInherited__factory,
  MockReserveInterestRateStrategy__factory,
  StableDebtToken__factory,
  VariableDebtToken__factory,
  AToken__factory,
  Pool__factory,
  InitializableImmutableAdminUpgradeabilityProxy,
  ERC20__factory,
} from '../types';
import { getProxyImplementation } from '../helpers/contracts-helpers';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('Pool: Edge cases', (testEnv: TestEnv) => {
  const {
    NO_MORE_RESERVES_ALLOWED,
    CALLER_NOT_ATOKEN,
    NOT_CONTRACT,
    CALLER_NOT_POOL_CONFIGURATOR,
    RESERVE_ALREADY_INITIALIZED,
    INVALID_ADDRESSES_PROVIDER,
    RESERVE_ALREADY_ADDED,
    DEBT_CEILING_NOT_ZERO,
    ASSET_NOT_LISTED,
    ZERO_ADDRESS_NOT_VALID,
  } = ProtocolErrors;

  const MAX_STABLE_RATE_BORROW_SIZE_PERCENT = 2500;
  const MAX_NUMBER_RESERVES = 128;

  const POOL_ID = utils.formatBytes32String('POOL');

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('Drop asset while user uses it as collateral, ensure that borrowing power is lowered', async () => {
    const {
      addressesProvider,
      poolAdmin,
      dai,
      users: [user0],
    } = testEnv;
    const { deployer: deployerName } = await hre.getNamedAccounts();

    // Deploy the mock Pool with a `dropReserve` skipping the checks
    const NEW_POOL_IMPL_ARTIFACT = await hre.deployments.deploy('MockPoolInheritedDropper', {
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
        PoolLogic: (await hre.deployments.get('PoolLogic')).address,
      },
      log: false,
    });

    const poolProxyAddress = await addressesProvider.getPool();
    const oldPoolImpl = await getProxyImplementation(addressesProvider.address, poolProxyAddress);

    // Upgrade the Pool
    expect(
      await addressesProvider.connect(poolAdmin.signer).setPoolImpl(NEW_POOL_IMPL_ARTIFACT.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(oldPoolImpl, NEW_POOL_IMPL_ARTIFACT.address);

    // Get the Pool instance
    const mockPoolAddress = await addressesProvider.getPool();
    const mockPool = await MockPoolInherited__factory.connect(
      mockPoolAddress,
      await getFirstSigner()
    );

    const amount = utils.parseUnits('10', 18);
    const amountUSD = amount.div(BigNumber.from(10).pow(10));

    await dai.connect(user0.signer)['mint(uint256)'](amount);
    await dai.connect(user0.signer).approve(mockPool.address, MAX_UINT_AMOUNT);

    expect(await mockPool.connect(user0.signer).supply(dai.address, amount, user0.address, 0));

    const userReserveDataBefore = await mockPool.getUserAccountData(user0.address);

    expect(userReserveDataBefore.totalCollateralBase).to.be.eq(amountUSD);
    expect(userReserveDataBefore.totalDebtBase).to.be.eq(0);
    expect(userReserveDataBefore.availableBorrowsBase).to.be.eq(amountUSD.mul(7500).div(10000));
    expect(userReserveDataBefore.currentLiquidationThreshold).to.be.eq(8000);
    expect(userReserveDataBefore.ltv).to.be.eq(7500);
    expect(userReserveDataBefore.healthFactor).to.be.eq(MAX_UINT_AMOUNT);

    expect(await mockPool.dropReserve(dai.address));

    const userReserveDataAfter = await mockPool.getUserAccountData(user0.address);

    expect(userReserveDataAfter.totalCollateralBase).to.be.eq(0);
    expect(userReserveDataAfter.totalDebtBase).to.be.eq(0);
    expect(userReserveDataAfter.availableBorrowsBase).to.be.eq(0);
    expect(userReserveDataAfter.currentLiquidationThreshold).to.be.eq(0);
    expect(userReserveDataAfter.ltv).to.be.eq(0);
    expect(userReserveDataAfter.healthFactor).to.be.eq(MAX_UINT_AMOUNT);
  });

  it('Initialize fresh deployment with incorrect addresses provider (revert expected)', async () => {
    const {
      addressesProvider,
      users: [deployer],
    } = testEnv;
    const { deployer: deployerName } = await hre.getNamedAccounts();

    const NEW_POOL_IMPL_ARTIFACT = await hre.deployments.deploy('Pool', {
      contract: 'Pool',
      from: deployerName,
      args: [addressesProvider.address],
      libraries: {
        SupplyLogic: (await hre.deployments.get('SupplyLogic')).address,
        BorrowLogic: (await hre.deployments.get('BorrowLogic')).address,
        LiquidationLogic: (await hre.deployments.get('LiquidationLogic')).address,
        EModeLogic: (await hre.deployments.get('EModeLogic')).address,
        BridgeLogic: (await hre.deployments.get('BridgeLogic')).address,
        FlashLoanLogic: (await hre.deployments.get('FlashLoanLogic')).address,
        PoolLogic: (await hre.deployments.get('PoolLogic')).address,
      },
      log: false,
    });

    const freshPool = Pool__factory.connect(NEW_POOL_IMPL_ARTIFACT.address, deployer.signer);

    await expect(freshPool.initialize(deployer.address)).to.be.revertedWith(
      INVALID_ADDRESSES_PROVIDER
    );
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
    ).to.be.revertedWith(CALLER_NOT_POOL_CONFIGURATOR);
  });

  it('Call `setUserUseReserveAsCollateral()` to use an asset as collateral when the asset is already set as collateral', async () => {
    const {
      pool,
      helpersContract,
      dai,
      users: [user0],
    } = testEnv;

    const amount = utils.parseUnits('10', 18);
    await dai.connect(user0.signer)['mint(uint256)'](amount);
    await dai.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT);

    expect(await pool.connect(user0.signer).supply(dai.address, amount, user0.address, 0));

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      dai.address,
      user0.address
    );
    expect(userReserveDataBefore.usageAsCollateralEnabled).to.be.true;

    expect(
      await pool.connect(user0.signer).setUserUseReserveAsCollateral(dai.address, true)
    ).to.not.emit(pool, 'ReserveUsedAsCollateralEnabled');

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      dai.address,
      user0.address
    );
    expect(userReserveDataAfter.usageAsCollateralEnabled).to.be.true;
  });

  it('Call `setUserUseReserveAsCollateral()` to disable an asset as collateral when the asset is already disabled as collateral', async () => {
    const {
      pool,
      helpersContract,
      dai,
      users: [user0],
    } = testEnv;

    const amount = utils.parseUnits('10', 18);
    await dai.connect(user0.signer)['mint(uint256)'](amount);
    await dai.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT);

    expect(await pool.connect(user0.signer).supply(dai.address, amount, user0.address, 0));

    // Disable asset as collateral
    expect(await pool.connect(user0.signer).setUserUseReserveAsCollateral(dai.address, false))
      .to.emit(pool, 'ReserveUsedAsCollateralDisabled')
      .withArgs(dai.address, user0.address);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      dai.address,
      user0.address
    );
    expect(userReserveDataBefore.usageAsCollateralEnabled).to.be.false;

    expect(
      await pool.connect(user0.signer).setUserUseReserveAsCollateral(dai.address, false)
    ).to.not.emit(pool, 'ReserveUsedAsCollateralDisabled');

    const userReserveDataAfter = await helpersContract.getUserReserveData(
      dai.address,
      user0.address
    );
    expect(userReserveDataAfter.usageAsCollateralEnabled).to.be.false;
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
    ).to.be.revertedWith(CALLER_NOT_ATOKEN);
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
    ).to.be.revertedWith(NOT_CONTRACT);
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

  it('PoolConfigurator updates the ReserveInterestRateStrategy address for asset 0', async () => {
    const { pool, deployer, dai, configurator } = testEnv;

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    await expect(
      pool.connect(configSigner).setReserveInterestRateStrategyAddress(ZERO_ADDRESS, ZERO_ADDRESS)
    ).to.be.revertedWith(ZERO_ADDRESS_NOT_VALID);
  });

  it('PoolConfigurator updates the ReserveInterestRateStrategy address for an unlisted asset (revert expected)', async () => {
    const { pool, deployer, dai, configurator, users } = testEnv;

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    await expect(
      pool
        .connect(configSigner)
        .setReserveInterestRateStrategyAddress(users[5].address, ZERO_ADDRESS)
    ).to.be.revertedWith(ASSET_NOT_LISTED);
  });

  it('Activates the zero address reserve for borrowing via pool admin (expect revert)', async () => {
    const { configurator } = testEnv;
    await expect(configurator.setReserveBorrowing(ZERO_ADDRESS, true)).to.be.revertedWith(
      ZERO_ADDRESS_NOT_VALID
    );
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
    ).to.be.revertedWith(RESERVE_ALREADY_INITIALIZED);
  });

  it('Init reserve with ZERO_ADDRESS as aToken twice, to enter `_addReserveToList()` already added (revert expected)', async () => {
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
      await pool
        .connect(configSigner)
        .initReserve(
          config.aTokenAddress,
          ZERO_ADDRESS,
          config.stableDebtTokenAddress,
          config.variableDebtTokenAddress,
          ZERO_ADDRESS
        )
    );
    const poolListMid = await pool.getReservesList();
    expect(poolListBefore.length + 1).to.be.eq(poolListMid.length);

    // Add it again.
    await expect(
      pool
        .connect(configSigner)
        .initReserve(
          config.aTokenAddress,
          ZERO_ADDRESS,
          config.stableDebtTokenAddress,
          config.variableDebtTokenAddress,
          ZERO_ADDRESS
        )
    ).to.be.revertedWith(RESERVE_ALREADY_ADDED);
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
        PoolLogic: (await hre.deployments.get('PoolLogic')).address,
      },
      log: false,
    });

    const poolProxyAddress = await addressesProvider.getPool();
    const oldPoolImpl = await getProxyImplementation(addressesProvider.address, poolProxyAddress);

    // Upgrade the Pool
    expect(
      await addressesProvider.connect(poolAdmin.signer).setPoolImpl(NEW_POOL_IMPL_ARTIFACT.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(oldPoolImpl, NEW_POOL_IMPL_ARTIFACT.address);

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
    ).to.be.revertedWith(NO_MORE_RESERVES_ALLOWED);
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

    // Remove first 2 assets that has no borrows
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
    const stableDebtTokenImplementation = await new StableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const variableDebtTokenImplementation = await new VariableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const aTokenImplementation = await new AToken__factory(await getFirstSigner()).deploy(
      pool.address
    );
    const mockRateStrategy = await new MockReserveInterestRateStrategy__factory(
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
    const { deployer: deployerName } = await hre.getNamedAccounts();

    // Impersonate the PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    // Deploy the mock Pool with a setter of `maxNumberOfReserves`
    const NEW_POOL_IMPL_ARTIFACT = await hre.deployments.deploy('MockPoolInherited2', {
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
        PoolLogic: (await hre.deployments.get('PoolLogic')).address,
      },
      log: false,
    });

    const proxyAddress = await addressesProvider.getAddress(POOL_ID);
    const implementationAddress = await getProxyImplementation(
      addressesProvider.address,
      proxyAddress
    );

    // Upgrade the Pool
    expect(
      await addressesProvider.connect(poolAdmin.signer).setPoolImpl(NEW_POOL_IMPL_ARTIFACT.address)
    )
      .to.emit(addressesProvider, 'PoolUpdated')
      .withArgs(implementationAddress, NEW_POOL_IMPL_ARTIFACT.address);

    // Get the Pool instance
    const mockPoolAddress = await addressesProvider.getPool();
    const mockPool = await MockPoolInherited__factory.connect(
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

  it('Call `resetIsolationModeTotalDebt()` to reset isolationModeTotalDebt of an asset with non-zero debt ceiling', async () => {
    const {
      configurator,
      pool,
      helpersContract,
      dai,
      poolAdmin,
      deployer,
      users: [user0],
    } = testEnv;

    const debtCeiling = utils.parseUnits('10', 2);

    expect(await helpersContract.getDebtCeiling(dai.address)).to.be.eq(0);

    await configurator.connect(poolAdmin.signer).setDebtCeiling(dai.address, debtCeiling);

    expect(await helpersContract.getDebtCeiling(dai.address)).to.be.eq(debtCeiling);

    // Impersonate PoolConfigurator
    await topUpNonPayableWithEther(deployer.signer, [configurator.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([configurator.address]);
    const configSigner = await hre.ethers.getSigner(configurator.address);

    await expect(
      pool.connect(configSigner).resetIsolationModeTotalDebt(dai.address)
    ).to.be.revertedWith(DEBT_CEILING_NOT_ZERO);
  });

  it('Tries to initialize a reserve with an AToken, StableDebtToken, and VariableDebt each deployed with the wrong pool address (revert expected)', async () => {
    const { pool, deployer, configurator, addressesProvider } = testEnv;

    const NEW_POOL_IMPL_ARTIFACT = await hre.deployments.deploy('DummyPool', {
      contract: 'Pool',
      from: deployer.address,
      args: [addressesProvider.address],
      libraries: await getPoolLibraries(),
      log: false,
    });

    const aTokenImp = await new AToken__factory(await getFirstSigner()).deploy(pool.address);
    const stableDebtTokenImp = await new StableDebtToken__factory(deployer.signer).deploy(
      pool.address
    );
    const variableDebtTokenImp = await new VariableDebtToken__factory(deployer.signer).deploy(
      pool.address
    );

    const aTokenWrongPool = await new AToken__factory(await getFirstSigner()).deploy(
      NEW_POOL_IMPL_ARTIFACT.address
    );
    const stableDebtTokenWrongPool = await new StableDebtToken__factory(deployer.signer).deploy(
      NEW_POOL_IMPL_ARTIFACT.address
    );
    const variableDebtTokenWrongPool = await new VariableDebtToken__factory(deployer.signer).deploy(
      NEW_POOL_IMPL_ARTIFACT.address
    );

    const mockErc20 = await new ERC20__factory(deployer.signer).deploy('mock', 'MOCK');
    const mockRateStrategy = await new MockReserveInterestRateStrategy__factory(
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
        aTokenImpl: aTokenImp.address,
        stableDebtTokenImpl: stableDebtTokenImp.address,
        variableDebtTokenImpl: variableDebtTokenImp.address,
        underlyingAssetDecimals: 18,
        interestRateStrategyAddress: mockRateStrategy.address,
        underlyingAsset: mockErc20.address,
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

    initInputParams[0].aTokenImpl = aTokenWrongPool.address;
    await expect(configurator.initReserves(initInputParams)).to.be.reverted;

    initInputParams[0].aTokenImpl = aTokenImp.address;
    initInputParams[0].stableDebtTokenImpl = stableDebtTokenWrongPool.address;
    await expect(configurator.initReserves(initInputParams)).to.be.reverted;

    initInputParams[0].stableDebtTokenImpl = stableDebtTokenImp.address;
    initInputParams[0].variableDebtTokenImpl = variableDebtTokenWrongPool.address;
    await expect(configurator.initReserves(initInputParams)).to.be.reverted;

    initInputParams[0].variableDebtTokenImpl = variableDebtTokenImp.address;
    expect(await configurator.initReserves(initInputParams));
  });
});
