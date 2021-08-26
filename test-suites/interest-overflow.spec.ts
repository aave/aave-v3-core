import BigNumber from 'bignumber.js';

import {
  DRE,
  evmRevert,
  evmSnapshot,
  impersonateAccountsHardhat,
  increaseTime,
} from '../helpers/misc-utils';
import {
  APPROVAL_AMOUNT_POOL,
  MAX_UINT_AMOUNT,
  oneEther,
  ZERO_ADDRESS,
} from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { makeSuite } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { calcExpectedVariableDebtTokenBalance } from './helpers/utils/calculations';
import { getUserData, getReserveData } from './helpers/utils/helpers';

const chai = require('chai');
const { expect } = chai;

import {
  AToken,
  ATokenFactory,
  ERC20,
  ERC20Factory,
  MintableERC20,
  MockIncentivesController,
  MockReserveInterestRateStrategy,
  MockReserveInterestRateStrategyFactory,
  SelfdestructTransfer,
  SelfdestructTransferFactory,
  StableDebtToken,
  StableDebtTokenFactory,
  VariableDebtToken,
  VariableDebtTokenFactory,
} from '../types';
import { getFirstSigner } from '../helpers/contracts-getters';
import { deployMintableERC20 } from '../helpers/contracts-deployments';
import { BigNumberish } from '@ethersproject/bignumber';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { parse } from 'path';

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
  let aMockToken: AToken;
  let mockStableDebt: StableDebtToken;
  let mockVariableDebt: VariableDebtToken;
  let mockRateStrategy: MockReserveInterestRateStrategy;

  let snap: string;

  before(async () => {
    const { pool, poolAdmin, configurator, users, dai, aDai, helpersContract, addressesProvider } =
      testEnv;

    mockToken = await deployMintableERC20(['MOCK', 'MOCK', '18']);

    let stableDebtTokenImplementation = await new StableDebtTokenFactory(
      await getFirstSigner()
    ).deploy();
    let variableDebtTokenImplementation = await new VariableDebtTokenFactory(
      await getFirstSigner()
    ).deploy();
    const aTokenImplementation = await new ATokenFactory(await getFirstSigner()).deploy();

    const daiData = await pool.getReserveData(dai.address);

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
        borrowCap: 68719476735,
        supplyCap: 68719476735,
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
    aMockToken = ATokenFactory.connect(reserveData.aTokenAddress, await getFirstSigner());
    mockStableDebt = StableDebtTokenFactory.connect(
      reserveData.stableDebtTokenAddress,
      await getFirstSigner()
    );
    mockVariableDebt = VariableDebtTokenFactory.connect(
      reserveData.variableDebtTokenAddress,
      await getFirstSigner()
    );
  });

  beforeEach(async () => {
    snap = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snap);
  });

  it('ReserveLogic newLiquidityRate > type(uint128).max', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    await mockToken.connect(user.signer).mint(parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setLiquidityRate(MAX_UINT_AMOUNT);

    await expect(
      pool.connect(user.signer).deposit(mockToken.address, parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_LIQUIDITY_RATE_OVERFLOW);
  });

  it('ReserveLogic newStableRate > type(uint128).max', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    await mockToken.connect(user.signer).mint(parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setStableBorrowRate(MAX_UINT_AMOUNT);

    await expect(
      pool.connect(user.signer).deposit(mockToken.address, parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_STABLE_BORROW_RATE_OVERFLOW);
  });

  it('ReserveLogic newVariableRate > type(uint128).max', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    await mockToken.connect(user.signer).mint(parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setVariableBorrowRate(MAX_UINT_AMOUNT);

    await expect(
      pool.connect(user.signer).deposit(mockToken.address, parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_VARIABLE_BORROW_RATE_OVERFLOW);
  });

  it('ReserveLogic nextLiquidityIndex > type(uint128).max', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(parseUnits('10000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, parseUnits('10000', 18), user.address, 0);

    await mockToken.connect(user.signer).mint(parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(user.signer)
      .deposit(mockToken.address, parseUnits('1000', 18), user.address, 0);

    await mockRateStrategy.setLiquidityRate(new BigNumber(2).pow(128).minus(1).toFixed(0));

    await pool
      .connect(user.signer)
      .borrow(mockToken.address, parseUnits('100', 18), RateMode.Variable, 0, user.address);

    await mockRateStrategy.setVariableBorrowRate(new BigNumber(2).pow(128).minus(1).toFixed(0));

    await increaseTime(60 * 60 * 24 * 500);

    await expect(
      pool.connect(user.signer).deposit(mockToken.address, parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_LIQUIDITY_INDEX_OVERFLOW);
  });

  it('ReserveLogic nextVariableBorrowIndex > type(uint128).max', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[0];

    await dai.connect(user.signer).mint(parseUnits('10000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, parseUnits('10000', 18), user.address, 0);

    await mockToken.connect(user.signer).mint(parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(user.signer)
      .deposit(mockToken.address, parseUnits('1000', 18), user.address, 0);

    await mockRateStrategy.setLiquidityRate(new BigNumber(10).pow(27).toFixed(0));
    await mockRateStrategy.setVariableBorrowRate(new BigNumber(2).pow(110).minus(1).toFixed(0));
    await pool
      .connect(user.signer)
      .borrow(mockToken.address, parseUnits('100', 18), RateMode.Variable, 0, user.address);

    await increaseTime(60 * 60 * 24 * 365);

    await expect(
      pool.connect(user.signer).deposit(mockToken.address, parseUnits('1000', 18), user.address, 0)
    ).to.be.revertedWith(RL_VARIABLE_BORROW_INDEX_OVERFLOW);
  });

  it('mint stableDebt with newStableRate > type(uint128).max', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;

    const sdtFactory = new SelfdestructTransferFactory(deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    const rate = new BigNumber(2).pow(128); // Max + 1

    await expect(
      mockStableDebt
        .connect(poolSigner)
        .mint(users[0].address, users[0].address, parseUnits('100', 18), rate.toFixed(0))
    ).to.be.revertedWith(SDT_STABLE_DEBT_OVERFLOW);
  });
});
