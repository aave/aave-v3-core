import { expect } from 'chai';
import { utils } from 'ethers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { MockFlashLoanReceiver } from '../types/MockFlashLoanReceiver';
import {
  getACLManager,
  getFirstSigner,
  getMockFlashLoanReceiver,
  getMockPool,
  getPoolConfiguratorProxy,
} from '../helpers/contracts-getters';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { deployMockPool } from '../helpers/contracts-deployments';
import {
  ACLManagerFactory,
  ConfiguratorLogicFactory,
  PoolAddressesProviderFactory,
  PoolConfiguratorFactory,
} from '../types';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('PausablePool', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  const {
    VL_RESERVE_PAUSED,
    INVALID_FROM_BALANCE_AFTER_TRANSFER,
    INVALID_TO_BALANCE_AFTER_TRANSFER,
  } = ProtocolErrors;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('User 0 deposits 1000 DAI. Configurator pauses pool. Transfers to user 1 reverts. Configurator unpauses the network and next transfer succeeds', async () => {
    const { users, pool, dai, aDai, configurator } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await dai.connect(users[0].signer).mint(amountDAItoDeposit);

    // user 0 deposits 1000 DAI
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, amountDAItoDeposit, users[0].address, '0');

    const user0Balance = await aDai.balanceOf(users[0].address);
    const user1Balance = await aDai.balanceOf(users[1].address);

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // User 0 tries the transfer to User 1
    await expect(
      aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit)
    ).to.revertedWith(VL_RESERVE_PAUSED);

    const pausedFromBalance = await aDai.balanceOf(users[0].address);
    const pausedToBalance = await aDai.balanceOf(users[1].address);

    expect(pausedFromBalance).to.be.equal(
      user0Balance.toString(),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
    expect(pausedToBalance.toString()).to.be.equal(
      user1Balance.toString(),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setPoolPause(false);

    // User 0 succeeds transfer to User 1
    await aDai.connect(users[0].signer).transfer(users[1].address, amountDAItoDeposit);

    const fromBalance = await aDai.balanceOf(users[0].address);
    const toBalance = await aDai.balanceOf(users[1].address);

    expect(fromBalance.toString()).to.be.equal(
      user0Balance.sub(amountDAItoDeposit),
      INVALID_FROM_BALANCE_AFTER_TRANSFER
    );
    expect(toBalance.toString()).to.be.equal(
      user1Balance.add(amountDAItoDeposit),
      INVALID_TO_BALANCE_AFTER_TRANSFER
    );
  });

  it('Deposit', async () => {
    const { users, pool, dai, aDai, configurator } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await dai.connect(users[0].signer).mint(amountDAItoDeposit);

    // user 0 deposits 1000 DAI
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setPoolPause(true);
    await expect(
      pool.connect(users[0].signer).deposit(dai.address, amountDAItoDeposit, users[0].address, '0')
    ).to.revertedWith(VL_RESERVE_PAUSED);

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Withdraw', async () => {
    const { users, pool, dai, aDai, configurator } = testEnv;

    const amountDAItoDeposit = await convertToCurrencyDecimals(dai.address, '1000');

    await dai.connect(users[0].signer).mint(amountDAItoDeposit);

    // user 0 deposits 1000 DAI
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, amountDAItoDeposit, users[0].address, '0');

    // Configurator pauses the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // user tries to burn
    await expect(
      pool.connect(users[0].signer).withdraw(dai.address, amountDAItoDeposit, users[0].address)
    ).to.revertedWith(VL_RESERVE_PAUSED);

    // Configurator unpauses the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Borrow', async () => {
    const { pool, dai, users, configurator } = testEnv;

    const user = users[1];
    // Pause the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Try to execute liquidation
    await expect(
      pool.connect(user.signer).borrow(dai.address, '1', '1', '0', user.address)
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Repay', async () => {
    const { pool, dai, users, configurator } = testEnv;

    const user = users[1];
    // Pause the pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Try to execute liquidation
    await expect(
      pool.connect(user.signer).repay(dai.address, '1', '1', user.address)
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause the pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Flash loan', async () => {
    const { dai, pool, weth, users, configurator } = testEnv;

    const caller = users[3];

    const flashAmount = utils.parseEther('0.8');

    await _mockFlashLoanReceiver.setFailExecutionTransfer(true);

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    await expect(
      pool
        .connect(caller.signer)
        .flashLoan(
          _mockFlashLoanReceiver.address,
          [weth.address],
          [flashAmount],
          [1],
          caller.address,
          '0x10',
          '0'
        )
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Liquidation call', async () => {
    const { users, pool, usdc, oracle, weth, configurator, helpersContract } = testEnv;
    const depositor = users[3];
    const borrower = users[4];

    //mints USDC to depositor
    await usdc
      .connect(depositor.signer)
      .mint(await convertToCurrencyDecimals(usdc.address, '1000'));

    //approve protocol to access depositor wallet
    await usdc.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);

    //user 3 deposits 1000 USDC
    const amountUSDCtoDeposit = await convertToCurrencyDecimals(usdc.address, '1000');

    await pool
      .connect(depositor.signer)
      .deposit(usdc.address, amountUSDCtoDeposit, depositor.address, '0');

    //user 4 deposits 1 ETH
    const amountETHtoDeposit = await convertToCurrencyDecimals(weth.address, '1');

    //mints WETH to borrower
    await weth.connect(borrower.signer).mint(amountETHtoDeposit);

    //approve protocol to access borrower wallet
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(borrower.signer)
      .deposit(weth.address, amountETHtoDeposit, borrower.address, '0');

    //user 4 borrows
    const userGlobalData = await pool.getUserAccountData(borrower.address);

    const usdcPrice = await oracle.getAssetPrice(usdc.address);

    const amountUSDCToBorrow = await convertToCurrencyDecimals(
      usdc.address,
      userGlobalData.availableBorrowsBase.div(usdcPrice).percentMul(9502).toString()
    );

    await pool
      .connect(borrower.signer)
      .borrow(usdc.address, amountUSDCToBorrow, RateMode.Stable, '0', borrower.address);

    // Drops HF below 1
    await oracle.setAssetPrice(usdc.address, usdcPrice.percentMul(12000));

    //mints dai to the liquidator
    await usdc.mint(await convertToCurrencyDecimals(usdc.address, '1000'));
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);

    const userReserveDataBefore = await helpersContract.getUserReserveData(
      usdc.address,
      borrower.address
    );

    const amountToLiquidate = userReserveDataBefore.currentStableDebt.div(2).toString();

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Do liquidation
    await expect(
      pool.liquidationCall(weth.address, usdc.address, borrower.address, amountToLiquidate, true)
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('SwapBorrowRateMode', async () => {
    const { pool, weth, dai, usdc, users, configurator } = testEnv;
    const user = users[1];
    const amountWETHToDeposit = utils.parseEther('10');
    const amountDAIToDeposit = utils.parseEther('120');
    const amountToBorrow = utils.parseUnits('65', 6);

    await weth.connect(user.signer).mint(amountWETHToDeposit);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(weth.address, amountWETHToDeposit, user.address, '0');

    await dai.connect(user.signer).mint(amountDAIToDeposit);
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, amountDAIToDeposit, user.address, '0');

    await pool.connect(user.signer).borrow(usdc.address, amountToBorrow, 2, 0, user.address);

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    // Try to repay
    await expect(
      pool.connect(user.signer).swapBorrowRateMode(usdc.address, RateMode.Stable)
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('RebalanceStableBorrowRate', async () => {
    const { pool, dai, users, configurator } = testEnv;
    const user = users[1];
    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    await expect(
      pool.connect(user.signer).rebalanceStableBorrowRate(dai.address, user.address)
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('setUserUseReserveAsCollateral', async () => {
    const { pool, weth, users, configurator } = testEnv;
    const user = users[1];

    const amountWETHToDeposit = utils.parseEther('1');
    await weth.connect(user.signer).mint(amountWETHToDeposit);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(weth.address, amountWETHToDeposit, user.address, '0');

    // Pause pool
    await configurator.connect(users[1].signer).setPoolPause(true);

    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(weth.address, false)
    ).to.be.revertedWith(VL_RESERVE_PAUSED);

    // Unpause pool
    await configurator.connect(users[1].signer).setPoolPause(false);
  });

  it('Configurator pauses Pool with a ZERO_ADDRESS reserve', async () => {
    const { poolAdmin, emergencyAdmin } = testEnv;

    const snapId = await evmSnapshot();

    // Deploy a mock Pool
    const mockPool = await deployMockPool();

    // Deploy a new PoolConfigurator
    const configuratorLogic = await (
      await new ConfiguratorLogicFactory(await getFirstSigner()).deploy()
    ).deployed();
    const poolConfigurator = await (
      await new PoolConfiguratorFactory(
        { ['__$3ddc574512022f331a6a4c7e4bbb5c67b6$__']: configuratorLogic.address },
        await getFirstSigner()
      ).deploy()
    ).deployed();

    // Deploy a new PoolAddressesProvider
    const MARKET_ID = '1';
    const poolAddressesProvider = await (
      await new PoolAddressesProviderFactory(await getFirstSigner()).deploy(MARKET_ID)
    ).deployed();

    // Set the ACL admin
    expect(await poolAddressesProvider.setACLAdmin(poolAdmin.address));

    // Update the ACLManager impl
    const aclManagerImpl = await (
      await new ACLManagerFactory(await getFirstSigner()).deploy()
    ).deployed();
    expect(await poolAddressesProvider.setACLManagerImpl(aclManagerImpl.address))
      .to.emit(poolAddressesProvider, 'ACLManagerUpdated')
      .withArgs(aclManagerImpl.address);

    // Get the ACLManager
    const aclManagerProxyAddress = await poolAddressesProvider.getACLManager();
    const aclManager = await getACLManager(aclManagerProxyAddress);

    // Set role of EmergencyAdmin
    const emergencyAdminRole = await aclManager.EMERGENCY_ADMIN_ROLE();
    expect(await aclManager.addEmergencyAdmin(emergencyAdmin.address))
      .to.emit(aclManager, 'RoleGranted')
      .withArgs(emergencyAdminRole, emergencyAdmin.address, poolAdmin.address);

    // Update the Pool impl with a MockPool
    expect(await poolAddressesProvider.setPoolImpl(mockPool.address))
      .to.emit(poolAddressesProvider, 'PoolUpdated')
      .withArgs(mockPool.address);

    // Add ZERO_ADDRESS as a reserve
    const proxiedMockPoolAddress = await poolAddressesProvider.getPool();
    const proxiedMockPool = await getMockPool(proxiedMockPoolAddress);
    expect(await proxiedMockPool.addReserveToReservesList(ZERO_ADDRESS));

    // Update the PoolConfigurator impl with the PoolConfigurator
    expect(await poolAddressesProvider.setPoolConfiguratorImpl(poolConfigurator.address))
      .to.emit(poolAddressesProvider, 'PoolConfiguratorUpdated')
      .withArgs(poolConfigurator.address);

    const proxiedPoolConfiguratorAddress = await poolAddressesProvider.getPoolConfigurator();
    const proxiedPoolConfigurator = await getPoolConfiguratorProxy(proxiedPoolConfiguratorAddress);

    // Pause reserve
    expect(await proxiedPoolConfigurator.connect(emergencyAdmin.signer).setPoolPause(true));

    await evmRevert(snapId);
  });
});
