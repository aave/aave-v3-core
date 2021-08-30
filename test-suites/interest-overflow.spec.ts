import {
  DRE,
  evmRevert,
  evmSnapshot,
  impersonateAccountsHardhat,
  increaseTime,
} from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { makeSuite } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../helpers/types';

const chai = require('chai');
const { expect } = chai;

import {
  ATokenFactory,
  MintableERC20,
  MockFlashLoanReceiverFactory,
  MockReserveInterestRateStrategy,
  MockReserveInterestRateStrategyFactory,
  StableDebtToken,
  StableDebtTokenFactory,
  VariableDebtTokenFactory,
} from '../types';
import { getFirstSigner } from '../helpers/contracts-getters';
import { deployMintableERC20 } from '../helpers/contracts-deployments';
import { BigNumberish, BigNumber } from '@ethersproject/bignumber';
import { utils } from 'ethers';
import { topUpNonPayableWithEther } from './helpers/utils/funds';

makeSuite('Interest rate and index overflow', (testEnv) => {
  const {
    RL_LIQUIDITY_RATE_OVERFLOW,
    RL_STABLE_BORROW_RATE_OVERFLOW,
    RL_VARIABLE_BORROW_RATE_OVERFLOW,
    RL_LIQUIDITY_INDEX_OVERFLOW,
    RL_VARIABLE_BORROW_INDEX_OVERFLOW,
    SDT_STABLE_DEBT_OVERFLOW,
  } = ProtocolErrors;

  let mockToken: MintableERC20;
  let mockStableDebtToken: StableDebtToken;
  let mockRateStrategy: MockReserveInterestRateStrategy;

  let snap: string;

  before(async () => {
    const { pool, poolAdmin, configurator, dai, helpersContract, addressesProvider } = testEnv;

    mockToken = await deployMintableERC20(['MOCK', 'MOCK', '18']);

    let stableDebtTokenImplementation = await new StableDebtTokenFactory(
      await getFirstSigner()
    ).deploy();
    let variableDebtTokenImplementation = await new VariableDebtTokenFactory(
      await getFirstSigner()
    ).deploy();
    const aTokenImplementation = await new ATokenFactory(await getFirstSigner()).deploy();

    mockRateStrategy = await new MockReserveInterestRateStrategyFactory(
      await getFirstSigner()
    ).deploy(addressesProvider.address, 0, 0, 0, 0, 0, 0);

    // Init the reserve
    let initInputParams: {
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

    await configurator.connect(poolAdmin.signer).initReserves(initInputParams);

    // Configuration
    const daiReserveConfigurationData = await helpersContract.getReserveConfigurationData(
      dai.address
    );

    const maxCap = 68719476735;
    const inputParams: {
      asset: string;
      baseLTV: BigNumberish;
      liquidationThreshold: BigNumberish;
      liquidationBonus: BigNumberish;
      reserveFactor: BigNumberish;
      borrowCap: BigNumberish;
      supplyCap: BigNumberish;
      stableBorrowingEnabled: boolean;
      borrowingEnabled: boolean;
    }[] = [
      {
        asset: mockToken.address,
        baseLTV: daiReserveConfigurationData.ltv,
        liquidationThreshold: daiReserveConfigurationData.liquidationThreshold,
        liquidationBonus: daiReserveConfigurationData.liquidationBonus,
        reserveFactor: daiReserveConfigurationData.reserveFactor,
        borrowCap: maxCap,
        supplyCap: maxCap,
        stableBorrowingEnabled: true,
        borrowingEnabled: true,
      },
    ];

    const i = 0;
    await configurator
      .connect(poolAdmin.signer)
      .configureReserveAsCollateral(
        inputParams[i].asset,
        inputParams[i].baseLTV,
        inputParams[i].liquidationThreshold,
        inputParams[i].liquidationBonus
      );
    await configurator
      .connect(poolAdmin.signer)
      .enableBorrowingOnReserve(
        inputParams[i].asset,
        inputParams[i].borrowCap,
        inputParams[i].stableBorrowingEnabled
      );

    await configurator
      .connect(poolAdmin.signer)
      .setSupplyCap(inputParams[i].asset, inputParams[i].supplyCap);
    await configurator
      .connect(poolAdmin.signer)
      .setReserveFactor(inputParams[i].asset, inputParams[i].reserveFactor);

    const reserveData = await pool.getReserveData(mockToken.address);
    mockStableDebtToken = StableDebtTokenFactory.connect(
      reserveData.stableDebtTokenAddress,
      await getFirstSigner()
    );
  });

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('ReserveLogic `updateInterestRates` with newLiquidityRate > type(uint128).max (reverts)', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    await mockToken.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setLiquidityRate(MAX_UINT_AMOUNT);

    await expect(
      pool
        .connect(user.signer)
        .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_LIQUIDITY_RATE_OVERFLOW);
  });

  it('ReserveLogic `updateInterestRates` with newStableRate > type(uint128).max (reverts)', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    await mockToken.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setStableBorrowRate(MAX_UINT_AMOUNT);

    await expect(
      pool
        .connect(user.signer)
        .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_STABLE_BORROW_RATE_OVERFLOW);
  });

  it('ReserveLogic `updateInterestRates` with newVariableRate > type(uint128).max (reverts)', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    await mockToken.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setVariableBorrowRate(MAX_UINT_AMOUNT);

    await expect(
      pool
        .connect(user.signer)
        .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_VARIABLE_BORROW_RATE_OVERFLOW);
  });

  it('ReserveLogic `_updateIndexes` with nextLiquidityIndex > type(uint128).max (reverts)', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(dai.address, utils.parseUnits('10000', 18), user.address, 0);

    await mockToken.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(user.signer)
      .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0);

    // Set liquidity rate to max
    await mockRateStrategy.setLiquidityRate(BigNumber.from(2).pow(128).sub(1));
    // Borrow funds
    await pool
      .connect(user.signer)
      .borrow(mockToken.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address);

    // set borrow rate to max
    await mockRateStrategy.setVariableBorrowRate(BigNumber.from(2).pow(128).sub(1));

    // Increase time such that the next liquidity index overflow because of interest
    await increaseTime(60 * 60 * 24 * 500);

    await expect(
      pool
        .connect(user.signer)
        .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_LIQUIDITY_INDEX_OVERFLOW);
  });

  it('ReserveLogic `_updateIndexes` with nextVariableBorrowIndex > type(uint128).max (reverts)', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(dai.address, utils.parseUnits('10000', 18), user.address, 0);

    await mockToken.connect(user.signer).mint(utils.parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(user.signer)
      .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0);

    await mockRateStrategy.setLiquidityRate(BigNumber.from(10).pow(27));
    await mockRateStrategy.setVariableBorrowRate(BigNumber.from(2).pow(110).sub(1));
    await pool
      .connect(user.signer)
      .borrow(mockToken.address, utils.parseUnits('100', 18), RateMode.Variable, 0, user.address);

    await increaseTime(60 * 60 * 24 * 365);

    await expect(
      pool
        .connect(user.signer)
        .deposit(mockToken.address, utils.parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_VARIABLE_BORROW_INDEX_OVERFLOW);
  });

  it('cumulateToLiquidityIndex with liquidityIndex > type(uint128).max (reverts)', async () => {
    const { pool, users, dai, aDai, addressesProvider } = testEnv;

    const toBorrow = BigNumber.from(2).pow(80);

    await dai.connect(users[0].signer).mint(toBorrow.add(1));
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(users[0].signer).deposit(dai.address, 1, users[0].address, 0);
    await dai.connect(users[0].signer).transfer(aDai.address, toBorrow);

    const mockFlashLoan = await new MockFlashLoanReceiverFactory(await getFirstSigner()).deploy(
      addressesProvider.address
    );

    await expect(
      pool
        .connect(users[0].signer)
        .flashLoan(
          mockFlashLoan.address,
          [dai.address],
          [toBorrow],
          [RateMode.None],
          users[0].address,
          '0x00',
          0
        )
    ).to.be.revertedWith(RL_LIQUIDITY_INDEX_OVERFLOW);
  });

  it('StableDebtToken, `mint` with newStableRate > type(uint128).max (reverts)', async () => {
    const { deployer, pool, users } = testEnv;

    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    const rate = BigNumber.from(2).pow(128); // Max + 1

    await expect(
      mockStableDebtToken
        .connect(poolSigner)
        .mint(users[0].address, users[0].address, utils.parseUnits('100', 18), rate)
    ).to.be.revertedWith(SDT_STABLE_DEBT_OVERFLOW);
  });
});
