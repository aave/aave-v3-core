import hre from 'hardhat';
import { expect } from 'chai';
import { utils } from 'ethers';
import { ZeroReserveInterestRateStrategy__factory } from '../types';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS, evmRevert, evmSnapshot } from '@aave/deploy-v3';

makeSuite('PoolConfigurator: Set Rate Strategy', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('Update Interest Rate of a reserve', async () => {
    const {
      poolAdmin,
      configurator,
      pool,
      helpersContract,
      weth,
      dai,
      usdc,
      users: [depositor, borrower],
    } = testEnv;

    // Utilize the DAI pool
    const mintedAmount = utils.parseEther('100');
    expect(await dai.connect(depositor.signer)['mint(uint256)'](mintedAmount));
    expect(await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(depositor.signer).deposit(dai.address, mintedAmount, depositor.address, 0)
    );
    expect(
      await weth.connect(borrower.signer)['mint(address,uint256)'](borrower.address, mintedAmount)
    );
    expect(await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(borrower.signer).deposit(weth.address, mintedAmount, borrower.address, 0)
    );
    expect(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 1, 0, borrower.address)
    );

    // PoolAdmin updates IR strategy address
    const strategyUSDC = await helpersContract.getInterestRateStrategyAddress(usdc.address);
    const reserveDataBefore = await pool.getReserveData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .setReserveInterestRateStrategyAddress(dai.address, strategyUSDC)
    )
      .to.emit(configurator, 'ReserveInterestRateStrategyChanged')
      .withArgs(dai.address, reserveDataBefore.interestRateStrategyAddress, strategyUSDC);

    const reserveDataAfter = await pool.getReserveData(dai.address);

    expect(reserveDataAfter.interestRateStrategyAddress).to.be.eq(strategyUSDC);

    // Indexes and rates are the same until a new operation is performed
    expect(reserveDataBefore.liquidityIndex).to.be.eq(reserveDataAfter.liquidityIndex);
    expect(reserveDataBefore.currentLiquidityRate).to.be.eq(reserveDataAfter.currentLiquidityRate);
    expect(reserveDataBefore.variableBorrowIndex).to.be.eq(reserveDataAfter.variableBorrowIndex);
    expect(reserveDataBefore.currentVariableBorrowRate).to.be.eq(
      reserveDataAfter.currentVariableBorrowRate
    );
    expect(reserveDataBefore.currentStableBorrowRate).to.be.eq(
      reserveDataAfter.currentStableBorrowRate
    );
    expect(reserveDataBefore.lastUpdateTimestamp).to.be.eq(reserveDataAfter.lastUpdateTimestamp);

    // Reserve interaction so IR gets applied
    expect(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 1, 0, borrower.address)
    );

    // Rates get updated
    const reserveDataUpdated = await pool.getReserveData(dai.address);
    expect(reserveDataAfter.interestRateStrategyAddress).to.be.eq(
      reserveDataUpdated.interestRateStrategyAddress
    );

    expect(reserveDataAfter.currentLiquidityRate).to.be.not.eq(
      reserveDataUpdated.currentLiquidityRate
    );
    expect(reserveDataAfter.currentVariableBorrowRate).to.be.not.eq(
      reserveDataUpdated.currentVariableBorrowRate
    );
    expect(reserveDataAfter.currentStableBorrowRate).to.be.not.eq(
      reserveDataUpdated.currentStableBorrowRate
    );
    expect(reserveDataAfter.lastUpdateTimestamp).to.be.lt(reserveDataUpdated.lastUpdateTimestamp);
  });

  it('Update Interest Rate of a reserve with ZERO_ADDRESS and bricks the reserve (revert expected)', async () => {
    const {
      poolAdmin,
      configurator,
      pool,
      weth,
      dai,
      users: [depositor, borrower],
    } = testEnv;

    // Utilize the DAI pool
    const mintedAmount = utils.parseEther('100');
    expect(await dai.connect(depositor.signer)['mint(uint256)'](mintedAmount));
    expect(await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(depositor.signer).deposit(dai.address, mintedAmount, depositor.address, 0)
    );
    expect(
      await weth.connect(borrower.signer)['mint(address,uint256)'](borrower.address, mintedAmount)
    );
    expect(await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(borrower.signer).deposit(weth.address, mintedAmount, borrower.address, 0)
    );
    expect(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 1, 0, borrower.address)
    );

    // PoolAdmin updates IR strategy address
    const reserveDataBefore = await pool.getReserveData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .setReserveInterestRateStrategyAddress(dai.address, ZERO_ADDRESS)
    )
      .to.emit(configurator, 'ReserveInterestRateStrategyChanged')
      .withArgs(dai.address, reserveDataBefore.interestRateStrategyAddress, ZERO_ADDRESS);

    // Reserve interaction so IR gets applied
    await expect(
      pool
        .connect(borrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 1, 0, borrower.address)
    ).reverted;
  });

  it('ZeroReserveInterestRateStrategy - Checks all rates are 0', async () => {
    const { deployer, addressesProvider } = testEnv;
    const zeroStrategy = await new ZeroReserveInterestRateStrategy__factory(deployer.signer).deploy(
      addressesProvider.address
    );

    expect(await zeroStrategy.OPTIMAL_USAGE_RATIO()).to.be.eq(0);
    expect(await zeroStrategy.OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO()).to.be.eq(0);
    expect(await zeroStrategy.MAX_EXCESS_USAGE_RATIO()).to.be.eq(0);
    expect(await zeroStrategy.MAX_EXCESS_STABLE_TO_TOTAL_DEBT_RATIO()).to.be.eq(0);
    expect(await zeroStrategy.getVariableRateSlope1()).to.be.eq(0);
    expect(await zeroStrategy.getVariableRateSlope2()).to.be.eq(0);
    expect(await zeroStrategy.getStableRateSlope1()).to.be.eq(0);
    expect(await zeroStrategy.getStableRateSlope2()).to.be.eq(0);
    expect(await zeroStrategy.getStableRateExcessOffset()).to.be.eq(0);
    expect(await zeroStrategy.getBaseStableBorrowRate()).to.be.eq(0);
    expect(await zeroStrategy.getBaseVariableBorrowRate()).to.be.eq(0);
    expect(await zeroStrategy.getMaxVariableBorrowRate()).to.be.eq(0);

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await zeroStrategy.calculateInterestRates({
      unbacked: 0,
      liquidityAdded: 0,
      liquidityTaken: 0,
      totalStableDebt: 0,
      totalVariableDebt: 0,
      averageStableBorrowRate: 0,
      reserveFactor: 0,
      reserve: ZERO_ADDRESS,
      aToken: ZERO_ADDRESS,
    });

    expect(currentLiquidityRate).to.be.eq(0, 'Invalid liquidity rate');
    expect(currentStableBorrowRate).to.be.eq(0, 'Invalid stable rate');
    expect(currentVariableBorrowRate).to.be.eq(0, 'Invalid variable rate');
  });

  it('ZeroReserveInterestRateStrategy - Update a reserve with ZeroInterestRateStrategy to set zero rates', async () => {
    const {
      deployer,
      poolAdmin,
      configurator,
      pool,
      addressesProvider,
      weth,
      dai,
      variableDebtDai,
      stableDebtDai,
      users: [depositor, borrower, stableBorrower],
    } = testEnv;

    const zeroStrategy = await new ZeroReserveInterestRateStrategy__factory(deployer.signer).deploy(
      addressesProvider.address
    );
    // Utilize the DAI pool
    const mintedAmount = utils.parseEther('100');
    expect(await dai.connect(depositor.signer)['mint(uint256)'](mintedAmount));
    expect(await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(depositor.signer).deposit(dai.address, mintedAmount, depositor.address, 0)
    );
    expect(
      await weth.connect(borrower.signer)['mint(address,uint256)'](borrower.address, mintedAmount)
    );
    expect(await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool.connect(borrower.signer).deposit(weth.address, mintedAmount, borrower.address, 0)
    );
    expect(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 2, 0, borrower.address)
    );
    expect(
      await weth
        .connect(stableBorrower.signer)
        ['mint(address,uint256)'](stableBorrower.address, mintedAmount)
    );
    expect(await weth.connect(stableBorrower.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(
      await pool
        .connect(stableBorrower.signer)
        .deposit(weth.address, mintedAmount, stableBorrower.address, 0)
    );
    expect(
      await pool
        .connect(stableBorrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 1, 0, stableBorrower.address)
    );

    // PoolAdmin updates IR strategy address
    const reserveDataBefore = await pool.getReserveData(dai.address);

    await expect(
      configurator
        .connect(poolAdmin.signer)
        .setReserveInterestRateStrategyAddress(dai.address, zeroStrategy.address)
    )
      .to.emit(configurator, 'ReserveInterestRateStrategyChanged')
      .withArgs(dai.address, reserveDataBefore.interestRateStrategyAddress, zeroStrategy.address);

    const reserveDataAfter = await pool.getReserveData(dai.address);
    expect(reserveDataAfter.interestRateStrategyAddress).to.be.eq(zeroStrategy.address);

    // Indexes and rates are the same until a new operation is performed
    expect(reserveDataBefore.liquidityIndex).to.be.eq(reserveDataAfter.liquidityIndex);
    expect(reserveDataBefore.currentLiquidityRate).to.be.eq(reserveDataAfter.currentLiquidityRate);
    expect(reserveDataBefore.variableBorrowIndex).to.be.eq(reserveDataAfter.variableBorrowIndex);
    expect(reserveDataBefore.currentVariableBorrowRate).to.be.eq(
      reserveDataAfter.currentVariableBorrowRate
    );
    expect(reserveDataBefore.currentStableBorrowRate).to.be.eq(
      reserveDataAfter.currentStableBorrowRate
    );
    expect(reserveDataBefore.lastUpdateTimestamp).to.be.eq(reserveDataAfter.lastUpdateTimestamp);

    // Reserve interaction so IR gets applied
    expect(
      await pool
        .connect(borrower.signer)
        .borrow(dai.address, utils.parseEther('1'), 1, 0, borrower.address)
    );

    // Rates get updated
    const reserveDataUpdated = await pool.getReserveData(dai.address);
    expect(reserveDataAfter.interestRateStrategyAddress).to.be.eq(zeroStrategy.address);
    expect(reserveDataAfter.currentLiquidityRate).to.be.not.eq(
      reserveDataUpdated.currentLiquidityRate
    );
    expect(reserveDataAfter.currentVariableBorrowRate).to.be.not.eq(
      reserveDataUpdated.currentVariableBorrowRate
    );
    expect(reserveDataAfter.currentStableBorrowRate).to.be.not.eq(
      reserveDataUpdated.currentStableBorrowRate
    );
    expect(reserveDataAfter.lastUpdateTimestamp).to.be.lt(reserveDataUpdated.lastUpdateTimestamp);

    expect(reserveDataUpdated.currentLiquidityRate).to.be.eq(0);
    expect(reserveDataUpdated.currentVariableBorrowRate).to.be.eq(0);
    expect(reserveDataUpdated.currentStableBorrowRate).to.be.eq(0);

    // Stable borrow gets rebalanced
    await expect(
      pool.connect(depositor.signer).rebalanceStableBorrowRate(dai.address, stableBorrower.address)
    )
      .to.emit(pool, 'RebalanceStableBorrowRate')
      .withArgs(dai.address, stableBorrower.address);

    // Stable borrow can be rebalanced as many times the rebalancer likes
    await expect(
      pool.connect(depositor.signer).rebalanceStableBorrowRate(dai.address, stableBorrower.address)
    )
      .to.emit(pool, 'RebalanceStableBorrowRate')
      .withArgs(dai.address, stableBorrower.address);
  });
});
