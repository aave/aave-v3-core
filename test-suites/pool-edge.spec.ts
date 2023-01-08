import { expect } from 'chai';
import { BigNumber, BigNumberish, utils } from 'ethers';
import { impersonateAccountsHardhat, setAutomine } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, MAX_UNBACKED_MINT_CAP, ZERO_ADDRESS } from '../helpers/constants';
import { deployMintableERC20 } from '@aave/deploy-v3/dist/helpers/contract-deployments';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  evmSnapshot,
  evmRevert,
  getPoolLibraries,
  MockFlashLoanReceiver,
  getMockFlashLoanReceiver,
  advanceTimeAndBlock,
  getACLManager,
} from '@aave/deploy-v3';
import {
  MockPoolInherited__factory,
  MockReserveInterestRateStrategy__factory,
  StableDebtToken__factory,
  VariableDebtToken__factory,
  AToken__factory,
  Pool__factory,
  ERC20__factory,
} from '../types';
import { convertToCurrencyDecimals, getProxyImplementation } from '../helpers/contracts-helpers';
import { ethers } from 'hardhat';
import { deposit, getTxCostAndTimestamp } from './helpers/actions';
import AaveConfig from '@aave/deploy-v3/dist/markets/test';
import {
  calcExpectedReserveDataAfterDeposit,
  configuration as calculationsConfiguration,
} from './helpers/utils/calculations';
import { getReserveData } from './helpers/utils/helpers';

declare var hre: HardhatRuntimeEnvironment;

// Setup function to have 1 user with DAI deposits, and another user with WETH collateral
// and DAI borrowings at an indicated borrowing mode
const setupPositions = async (testEnv: TestEnv, borrowingMode: RateMode) => {
  const {
    pool,
    dai,
    weth,
    oracle,
    users: [depositor, borrower],
  } = testEnv;

  // mints DAI to depositor
  await dai
    .connect(depositor.signer)
    ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '20000'));

  // approve protocol to access depositor wallet
  await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

  // user 1 deposits 1000 DAI
  const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '10000');

  await pool
    .connect(depositor.signer)
    .deposit(dai.address, amountDAItoDeposit, depositor.address, '0');
  // user 2 deposits 1 ETH
  const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '1');

  // mints WETH to borrower
  await weth
    .connect(borrower.signer)
    ['mint(uint256)'](await convertToCurrencyDecimals(weth.address, '1000'));

  // approve protocol to access the borrower wallet
  await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

  await pool
    .connect(borrower.signer)
    .deposit(weth.address, amountETHtoDeposit, borrower.address, '0');

  //user 2 borrows

  const userGlobalData = await pool.getUserAccountData(borrower.address);
  const daiPrice = await oracle.getAssetPrice(dai.address);

  const amountDAIToBorrow = await convertToCurrencyDecimals(
    dai.address,
    userGlobalData.availableBorrowsBase.div(daiPrice).mul(5000).div(10000).toString()
  );
  await pool
    .connect(borrower.signer)
    .borrow(dai.address, amountDAIToBorrow, borrowingMode, '0', borrower.address);
};

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
    UNDERLYING_CLAIMABLE_RIGHTS_NOT_ZERO,
    SUPPLY_CAP_EXCEEDED,
    RESERVE_LIQUIDITY_NOT_ZERO,
  } = ProtocolErrors;

  const MAX_STABLE_RATE_BORROW_SIZE_PERCENT = 2500;
  const MAX_NUMBER_RESERVES = 128;
  const TOTAL_PREMIUM = 9;
  const PREMIUM_TO_PROTOCOL = 3000;

  const POOL_ID = utils.formatBytes32String('POOL');

  let snap: string;

  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

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

    let occurrences = reservesListAfterInit.filter((v) => v == mockToken.address).length;
    expect(occurrences).to.be.eq(1, 'Asset has multiple occurrences in the reserves list');

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

  it('dropReserve(). Only allows to drop a reserve if both the aToken supply and accruedToTreasury are 0', async () => {
    const {
      configurator,
      pool,
      weth,
      aWETH,
      dai,
      users: [user0],
    } = testEnv;

    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();

    await configurator.updateFlashloanPremiumTotal(TOTAL_PREMIUM);
    await configurator.updateFlashloanPremiumToProtocol(PREMIUM_TO_PROTOCOL);

    const userAddress = user0.address;
    const amountToDeposit = ethers.utils.parseEther('1');

    await weth['mint(uint256)'](amountToDeposit);

    await weth.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');

    const wethFlashBorrowedAmount = ethers.utils.parseEther('0.8');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [wethFlashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.connect(user0.signer).withdraw(weth.address, MAX_UINT_AMOUNT, userAddress);

    await expect(
      configurator.dropReserve(weth.address),
      'dropReserve() should not be possible as there are funds'
    ).to.be.revertedWith(UNDERLYING_CLAIMABLE_RIGHTS_NOT_ZERO);

    await pool.mintToTreasury([weth.address]);

    // Impersonate Collector
    const collectorAddress = await aWETH.RESERVE_TREASURY_ADDRESS();
    await topUpNonPayableWithEther(user0.signer, [collectorAddress], utils.parseEther('1'));
    await impersonateAccountsHardhat([collectorAddress]);
    const collectorSigner = await hre.ethers.getSigner(collectorAddress);
    await pool.connect(collectorSigner).withdraw(weth.address, MAX_UINT_AMOUNT, collectorAddress);

    await configurator.dropReserve(weth.address);
  });

  it('validateSupply(). Only allows to supply if amount + (scaled aToken supply + accruedToTreasury) <= supplyCap', async () => {
    const {
      configurator,
      pool,
      weth,
      aWETH,
      users: [user0],
    } = testEnv;

    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();

    await configurator.updateFlashloanPremiumTotal(TOTAL_PREMIUM);
    await configurator.updateFlashloanPremiumToProtocol(PREMIUM_TO_PROTOCOL);

    const userAddress = user0.address;
    const amountToDeposit = ethers.utils.parseEther('100000');

    await weth['mint(uint256)'](amountToDeposit.add(ethers.utils.parseEther('30')));

    await weth.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');

    const wethFlashBorrowedAmount = ethers.utils.parseEther('100000');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [wethFlashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    // At this point the totalSupply + accruedToTreasury is ~100090 WETH, with 100063 from supply and ~27 from accruedToTreasury
    // so to properly test the supply cap condition:
    // - Set supply cap above that, at 110 WETH
    // - Try to supply 30 WETH more . Should work if not taken into account accruedToTreasury, but will not
    // - Try to supply 5 WETH more. Should work

    await configurator.setSupplyCap(weth.address, BigNumber.from('100000').add('110'));

    await expect(
      pool.deposit(weth.address, ethers.utils.parseEther('30'), userAddress, '0')
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);

    await pool.deposit(weth.address, ethers.utils.parseEther('5'), userAddress, '0');
  });

  it('_checkNoSuppliers() (PoolConfigurator). Properly disables actions if aToken supply == 0, but accruedToTreasury != 0', async () => {
    const {
      configurator,
      pool,
      weth,
      aWETH,
      users: [user0],
    } = testEnv;

    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();

    await configurator.updateFlashloanPremiumTotal(TOTAL_PREMIUM);
    await configurator.updateFlashloanPremiumToProtocol(PREMIUM_TO_PROTOCOL);

    const userAddress = user0.address;
    const amountToDeposit = ethers.utils.parseEther('100000');

    await weth['mint(uint256)'](amountToDeposit.add(ethers.utils.parseEther('30')));

    await weth.approve(pool.address, MAX_UINT_AMOUNT);

    await pool.deposit(weth.address, amountToDeposit, userAddress, '0');

    const wethFlashBorrowedAmount = ethers.utils.parseEther('100000');

    await pool.flashLoan(
      _mockFlashLoanReceiver.address,
      [weth.address],
      [wethFlashBorrowedAmount],
      [0],
      _mockFlashLoanReceiver.address,
      '0x10',
      '0'
    );

    await pool.connect(user0.signer).withdraw(weth.address, MAX_UINT_AMOUNT, userAddress);

    await expect(configurator.setReserveActive(weth.address, false)).to.be.revertedWith(
      RESERVE_LIQUIDITY_NOT_ZERO
    );

    await pool.mintToTreasury([weth.address]);

    // Impersonate Collector
    const collectorAddress = await aWETH.RESERVE_TREASURY_ADDRESS();
    await topUpNonPayableWithEther(user0.signer, [collectorAddress], utils.parseEther('1'));
    await impersonateAccountsHardhat([collectorAddress]);
    const collectorSigner = await hre.ethers.getSigner(collectorAddress);
    await pool.connect(collectorSigner).withdraw(weth.address, MAX_UINT_AMOUNT, collectorAddress);

    await configurator.setReserveActive(weth.address, false);
  });

  it('LendingPool Reserve Factor 100%. Only variable borrowings. Validates that variable borrow index accrue, liquidity index not, and the Collector receives accruedToTreasury allocation after interest accrues', async () => {
    const {
      configurator,
      pool,
      aDai,
      dai,
      users: [depositor],
    } = testEnv;

    await setupPositions(testEnv, RateMode.Variable);

    // Set the RF to 100%
    await configurator.setReserveFactor(dai.address, '10000');

    const reserveDataBefore = await pool.getReserveData(dai.address);

    await advanceTimeAndBlock(10000);

    // Deposit to "settle" the liquidity index accrual from pre-RF increase to 100%
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '1'),
        depositor.address,
        '0'
      );

    const reserveDataAfter1 = await pool.getReserveData(dai.address);

    expect(reserveDataAfter1.variableBorrowIndex).to.be.gt(reserveDataBefore.variableBorrowIndex);
    expect(reserveDataAfter1.accruedToTreasury).to.be.gt(reserveDataBefore.accruedToTreasury);
    expect(reserveDataAfter1.liquidityIndex).to.be.gt(reserveDataBefore.liquidityIndex);

    await advanceTimeAndBlock(10000);

    // "Clean" update, that should not increase the liquidity index, only variable borrow
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '1'),
        depositor.address,
        '0'
      );

    const reserveDataAfter2 = await pool.getReserveData(dai.address);

    expect(reserveDataAfter2.variableBorrowIndex).to.be.gt(reserveDataAfter1.variableBorrowIndex);
    expect(reserveDataAfter2.accruedToTreasury).to.be.gt(reserveDataAfter1.accruedToTreasury);
    expect(reserveDataAfter2.liquidityIndex).to.be.eq(reserveDataAfter1.liquidityIndex);
  });

  it('LendingPool Reserve Factor 100%. Only stable borrowings. Validates that neither variable borrow index nor liquidity index increase, but the Collector receives accruedToTreasury allocation after interest accrues', async () => {
    const {
      configurator,
      pool,
      aDai,
      dai,
      users: [depositor],
    } = testEnv;

    await setupPositions(testEnv, RateMode.Stable);

    // Set the RF to 100%
    await configurator.setReserveFactor(dai.address, '10000');

    const reserveDataBefore = await pool.getReserveData(dai.address);

    await advanceTimeAndBlock(10000);

    // Deposit to "settle" the liquidity index accrual from pre-RF increase to 100%
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '1'),
        depositor.address,
        '0'
      );

    const reserveDataAfter1 = await pool.getReserveData(dai.address);

    expect(reserveDataAfter1.variableBorrowIndex).to.be.eq(reserveDataBefore.variableBorrowIndex);
    expect(reserveDataAfter1.accruedToTreasury).to.be.gt(reserveDataBefore.accruedToTreasury);
    expect(reserveDataAfter1.liquidityIndex).to.be.gt(reserveDataBefore.liquidityIndex);

    await advanceTimeAndBlock(10000);

    // "Clean" update, that should not increase the liquidity index, only stable borrow
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '1'),
        depositor.address,
        '0'
      );

    const reserveDataAfter2 = await pool.getReserveData(dai.address);

    expect(reserveDataAfter2.variableBorrowIndex).to.be.eq(reserveDataAfter1.variableBorrowIndex);
    expect(reserveDataAfter2.accruedToTreasury).to.be.gt(reserveDataAfter1.accruedToTreasury);
    expect(reserveDataAfter2.liquidityIndex).to.be.eq(reserveDataAfter1.liquidityIndex);
  });

  it('Pool with non-zero unbacked keeps the same liquidity and debt rate, even while setting zero unbackedMintCap', async () => {
    const {
      configurator,
      pool,
      dai,
      helpersContract,
      users: [user1, user2, user3, bridge],
    } = testEnv;

    // Set configuration of reserve params
    calculationsConfiguration.reservesParams = AaveConfig.ReservesConfig;

    // User 3 supplies 1M DAI and borrows 0.25M DAI
    const daiAmount = await convertToCurrencyDecimals(dai.address, '1000000');
    expect(await dai.connect(user3.signer)['mint(uint256)'](daiAmount));
    expect(await dai.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await pool.connect(user3.signer).deposit(dai.address, daiAmount, user3.address, '0'));
    expect(
      await pool
        .connect(user3.signer)
        .borrow(dai.address, daiAmount.div(4), RateMode.Variable, '0', user3.address)
    );

    // Time flies, indexes grow
    await advanceTimeAndBlock(60 * 60 * 24 * 6);

    // Add bridge
    const aclManager = await getACLManager();
    expect(await aclManager.addBridge(bridge.address));

    // Set non-zero unbackedMintCap for DAI
    expect(await configurator.setUnbackedMintCap(dai.address, MAX_UNBACKED_MINT_CAP));

    // Bridge mints 1M unbacked aDAI on behalf of User 1
    expect(
      await pool.connect(bridge.signer).mintUnbacked(dai.address, daiAmount, user1.address, 0)
    );

    const reserveDataBefore = await getReserveData(helpersContract, dai.address);

    expect(await dai.connect(user2.signer)['mint(uint256)'](daiAmount));
    expect(await dai.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT));

    // Next two txs should be mined in the same block
    await setAutomine(false);

    // Set zero unbackedMintCap for DAI
    expect(await configurator.setUnbackedMintCap(dai.address, 0));

    // User 2 supplies 10 DAI
    const amountToDeposit = await convertToCurrencyDecimals(dai.address, '10');
    const tx = await pool
      .connect(user2.signer)
      .deposit(dai.address, amountToDeposit, user2.address, '0');

    // Start mining
    await setAutomine(true);

    const rcpt = await tx.wait();
    const { txTimestamp } = await getTxCostAndTimestamp(rcpt);

    const reserveDataAfter = await getReserveData(helpersContract, dai.address);
    const expectedReserveData = calcExpectedReserveDataAfterDeposit(
      amountToDeposit.toString(),
      reserveDataBefore,
      txTimestamp
    );

    // Unbacked amount should keep constant
    expect(reserveDataAfter.unbacked).to.be.eq(reserveDataBefore.unbacked);

    expect(reserveDataAfter.liquidityRate).to.be.eq(expectedReserveData.liquidityRate);
    expect(reserveDataAfter.variableBorrowRate).to.be.eq(expectedReserveData.variableBorrowRate);
    expect(reserveDataAfter.stableBorrowRate).to.be.eq(expectedReserveData.stableBorrowRate);
  });
});
