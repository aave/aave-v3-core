import { expect } from 'chai';
import { BigNumberish, BigNumber, utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { makeSuite } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import {
  MintableERC20,
  StableDebtToken,
  MockReserveInterestRateStrategy,
  MintableERC20__factory,
  MockReserveInterestRateStrategy__factory,
  AToken__factory,
  VariableDebtToken__factory,
  StableDebtToken__factory,
  MockFlashLoanReceiver__factory,
} from '../types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { evmSnapshot, evmRevert, increaseTime } from '@aave/deploy-v3';

declare var hre: HardhatRuntimeEnvironment;
makeSuite('Interest Rate and Index Overflow', (testEnv) => {
  const { SAFECAST_UINT128_OVERFLOW } = ProtocolErrors;

  let mockToken: MintableERC20;
  let mockStableDebtToken: StableDebtToken;
  let mockRateStrategy: MockReserveInterestRateStrategy;

  let snap: string;

  before(async () => {
    const { pool, poolAdmin, configurator, dai, helpersContract, addressesProvider } = testEnv;

    mockToken = await new MintableERC20__factory(await getFirstSigner()).deploy(
      'MOCK',
      'MOCK',
      '18'
    );

    let stableDebtTokenImplementation = await new StableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    let variableDebtTokenImplementation = await new VariableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const aTokenImplementation = await new AToken__factory(await getFirstSigner()).deploy(
      pool.address
    );

    mockRateStrategy = await new MockReserveInterestRateStrategy__factory(
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
    await configurator.connect(poolAdmin.signer).setReserveBorrowing(inputParams[i].asset, true);

    await configurator
      .connect(poolAdmin.signer)
      .setSupplyCap(inputParams[i].asset, inputParams[i].supplyCap);
    await configurator
      .connect(poolAdmin.signer)
      .setReserveFactor(inputParams[i].asset, inputParams[i].reserveFactor);

    const reserveData = await pool.getReserveData(mockToken.address);
    mockStableDebtToken = StableDebtToken__factory.connect(
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

  it('ReserveLogic `updateInterestRates` with nextLiquidityRate > type(uint128).max (revert expected)', async () => {
    const {
      pool,
      users: [user],
    } = testEnv;

    await mockToken
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '10000'));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setLiquidityRate(MAX_UINT_AMOUNT);

    await expect(
      pool
        .connect(user.signer)
        .deposit(
          mockToken.address,
          await convertToCurrencyDecimals(mockToken.address, '1000'),
          user.address,
          0
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });

  it('ReserveLogic `updateInterestRates` with nextStableRate > type(uint128).max (revert expected)', async () => {
    const {
      pool,
      users: [user],
    } = testEnv;

    await mockToken
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '10000'));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setStableBorrowRate(MAX_UINT_AMOUNT);

    await expect(
      pool
        .connect(user.signer)
        .deposit(
          mockToken.address,
          await convertToCurrencyDecimals(mockToken.address, '1000'),
          user.address,
          0
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });

  it('ReserveLogic `updateInterestRates` with nextVariableRate > type(uint128).max (revert expected)', async () => {
    const {
      pool,
      users: [user],
    } = testEnv;

    await mockToken
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '10000'));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await mockRateStrategy.setVariableBorrowRate(MAX_UINT_AMOUNT);

    await expect(
      pool
        .connect(user.signer)
        .deposit(
          mockToken.address,
          await convertToCurrencyDecimals(mockToken.address, '1000'),
          user.address,
          0
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });

  it('ReserveLogic `_updateIndexes` with nextLiquidityIndex > type(uint128).max (revert expected)', async () => {
    const {
      pool,
      users: [user],
      dai,
    } = testEnv;

    await dai
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '10000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(mockToken.address, '1000'),
        user.address,
        0
      );

    await mockToken
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '1000'));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(user.signer)
      .deposit(
        mockToken.address,
        await convertToCurrencyDecimals(mockToken.address, '1000'),
        user.address,
        0
      );

    // Set liquidity rate to max
    await mockRateStrategy.setLiquidityRate(BigNumber.from(2).pow(128).sub(1));
    // Borrow funds
    await pool
      .connect(user.signer)
      .borrow(
        mockToken.address,
        await convertToCurrencyDecimals(mockToken.address, '100'),
        RateMode.Variable,
        0,
        user.address
      );

    // set borrow rate to max
    await mockRateStrategy.setVariableBorrowRate(BigNumber.from(2).pow(128).sub(1));

    // Increase time such that the next liquidity index overflow because of interest
    await increaseTime(60 * 60 * 24 * 500);

    await expect(
      pool
        .connect(user.signer)
        .deposit(
          mockToken.address,
          await convertToCurrencyDecimals(mockToken.address, '1000'),
          user.address,
          0
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });

  it('ReserveLogic `_updateIndexes` with nextVariableBorrowIndex > type(uint128).max (revert expected)', async () => {
    const {
      pool,
      users: [user],
      dai,
    } = testEnv;

    await dai
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '10000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(mockToken.address, '10000'),
        user.address,
        0
      );

    await mockToken
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(mockToken.address, '10000'));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool
      .connect(user.signer)
      .deposit(
        mockToken.address,
        await convertToCurrencyDecimals(mockToken.address, '1000'),
        user.address,
        0
      );

    await mockRateStrategy.setLiquidityRate(BigNumber.from(10).pow(27));
    await mockRateStrategy.setVariableBorrowRate(BigNumber.from(2).pow(110).sub(1));
    await pool
      .connect(user.signer)
      .borrow(
        mockToken.address,
        await convertToCurrencyDecimals(mockToken.address, '100'),
        RateMode.Variable,
        0,
        user.address
      );

    await increaseTime(60 * 60 * 24 * 365);

    await expect(
      pool
        .connect(user.signer)
        .deposit(
          mockToken.address,
          await convertToCurrencyDecimals(mockToken.address, '1000'),
          user.address,
          0
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });

  it('ReserveLogic `cumulateToLiquidityIndex` with liquidityIndex > type(uint128).max (revert expected)', async () => {
    const {
      pool,
      users: [user],
      dai,
      aDai,
      addressesProvider,
    } = testEnv;

    const toBorrow = BigNumber.from(2).pow(80);

    await dai.connect(user.signer)['mint(uint256)'](toBorrow.add(1));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(user.signer).deposit(dai.address, 1, user.address, 0);
    await dai.connect(user.signer).transfer(aDai.address, toBorrow);

    const mockFlashLoan = await new MockFlashLoanReceiver__factory(await getFirstSigner()).deploy(
      addressesProvider.address
    );

    await expect(
      pool
        .connect(user.signer)
        .flashLoan(
          mockFlashLoan.address,
          [dai.address],
          [toBorrow],
          [RateMode.None],
          user.address,
          '0x00',
          0
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });

  it('StableDebtToken `mint` with nextStableRate > type(uint128).max (revert expected)', async () => {
    const {
      deployer,
      pool,
      users: [user],
    } = testEnv;

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const rate = BigNumber.from(2).pow(128); // Max + 1

    await expect(
      mockStableDebtToken
        .connect(poolSigner)
        .mint(
          user.address,
          user.address,
          await convertToCurrencyDecimals(mockStableDebtToken.address, '100'),
          rate
        )
    ).to.be.revertedWith(SAFECAST_UINT128_OVERFLOW);
  });
});
