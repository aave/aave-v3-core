import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { RateMode } from '../helpers/types';
import {
  AToken__factory,
  ERC20,
  ERC20__factory,
  MintableERC20,
  MintableERC20__factory,
  StableDebtToken__factory,
  VariableDebtToken__factory,
} from '../types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { makeSuite } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { setBlocktime, timeLatest } from '../helpers/misc-utils';
import { config } from 'process';

makeSuite('Reserve Without Incentives Controller', (testEnv) => {
  let mockToken: MintableERC20;
  let aMockToken: ERC20;
  let mockStableDebt: ERC20;
  let mockVariableDebt: ERC20;

  before(async () => {
    const { pool, poolAdmin, configurator, dai, helpersContract } = testEnv;

    mockToken = await new MintableERC20__factory(await getFirstSigner()).deploy(
      'MOCK',
      'MOCK',
      '18'
    );

    const stableDebtTokenImplementation = await new StableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const variableDebtTokenImplementation = await new VariableDebtToken__factory(
      await getFirstSigner()
    ).deploy(pool.address);
    const aTokenImplementation = await new AToken__factory(await getFirstSigner()).deploy(
      pool.address
    );

    const daiData = await pool.getReserveData(dai.address);

    const interestRateStrategyAddress = daiData.interestRateStrategyAddress;

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
        interestRateStrategyAddress: interestRateStrategyAddress,
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

    // Add the mock reserve
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
    await configurator.connect(poolAdmin.signer).setReserveBorrowing(inputParams[i].asset, true);

    await configurator.setBorrowCap(inputParams[i].asset, inputParams[i].borrowCap);
    await configurator.setReserveStableRateBorrowing(
      inputParams[i].asset,
      inputParams[i].stableBorrowingEnabled
    );

    await configurator
      .connect(poolAdmin.signer)
      .setSupplyCap(inputParams[i].asset, inputParams[i].supplyCap);
    await configurator
      .connect(poolAdmin.signer)
      .setReserveFactor(inputParams[i].asset, inputParams[i].reserveFactor);

    const reserveData = await pool.getReserveData(mockToken.address);
    aMockToken = ERC20__factory.connect(reserveData.aTokenAddress, await getFirstSigner());
    mockStableDebt = ERC20__factory.connect(
      reserveData.stableDebtTokenAddress,
      await getFirstSigner()
    );
    mockVariableDebt = ERC20__factory.connect(
      reserveData.variableDebtTokenAddress,
      await getFirstSigner()
    );
  });

  it('Deposit mock tokens into aave', async () => {
    const {
      pool,
      users: [user],
    } = testEnv;

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(0);

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

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(
      await convertToCurrencyDecimals(aMockToken.address, '1000')
    );
  });

  it('Transfer aMock tokens', async () => {
    const {
      users: [sender, receiver],
    } = testEnv;

    expect(await aMockToken.balanceOf(sender.address)).to.be.eq(
      await convertToCurrencyDecimals(aMockToken.address, '1000')
    );
    expect(await aMockToken.balanceOf(receiver.address)).to.be.eq(0);

    await aMockToken
      .connect(sender.signer)
      .transfer(receiver.address, await convertToCurrencyDecimals(aMockToken.address, '1000'));
    expect(await aMockToken.balanceOf(sender.address)).to.be.eq(0);
    expect(await aMockToken.balanceOf(receiver.address)).to.be.eq(
      await convertToCurrencyDecimals(aMockToken.address, '1000')
    );
  });

  it('Borrow mock tokens with stable rate', async () => {
    const {
      pool,
      users: [, , user],
      dai,
    } = testEnv;

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(0);
    expect(await mockToken.balanceOf(user.address)).to.be.eq(0);
    expect(await mockVariableDebt.balanceOf(user.address)).to.be.eq(0);
    expect(await mockStableDebt.balanceOf(user.address)).to.be.eq(0);

    await dai
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '10000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(dai.address, await convertToCurrencyDecimals(dai.address, '10000'), user.address, 0);
    await pool
      .connect(user.signer)
      .borrow(
        mockToken.address,
        await convertToCurrencyDecimals(mockToken.address, '100'),
        RateMode.Stable,
        0,
        user.address
      );

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(0);
    expect(await mockToken.balanceOf(user.address)).to.be.eq(
      await convertToCurrencyDecimals(mockToken.address, '100')
    );
    expect(await mockVariableDebt.balanceOf(user.address)).to.be.eq(0);
    expect(await mockStableDebt.balanceOf(user.address)).to.be.eq(
      await convertToCurrencyDecimals(mockStableDebt.address, '100')
    );
  });

  it('Repay mock tokens', async () => {
    const {
      pool,
      users: [, , user],
    } = testEnv;

    const mintAmount = await convertToCurrencyDecimals(mockToken.address, '100');
    await mockToken.connect(user.signer)['mint(uint256)'](mintAmount);

    const expectedMockTokenBalance = mintAmount.add(
      await convertToCurrencyDecimals(mockToken.address, '100')
    );

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(0);
    expect(await mockToken.balanceOf(user.address)).to.be.eq(expectedMockTokenBalance);
    expect(await mockVariableDebt.balanceOf(user.address)).to.be.eq(0);

    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const time = await timeLatest();

    await setBlocktime(time.add(1).toNumber());

    const stableDebtBefore = await mockStableDebt.balanceOf(user.address, { blockTag: 'pending' });

    await pool
      .connect(user.signer)
      .repay(mockToken.address, stableDebtBefore, RateMode.Stable, user.address);

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(0);
    expect(await mockToken.balanceOf(user.address)).to.be.eq(
      expectedMockTokenBalance.sub(stableDebtBefore)
    );
    expect(await mockVariableDebt.balanceOf(user.address)).to.be.eq(0);
    expect(await mockStableDebt.balanceOf(user.address)).to.be.eq(0);
  });

  it('Withdraw aMock tokens', async () => {
    const {
      pool,
      users: [, user],
    } = testEnv;

    expect(await mockToken.balanceOf(user.address)).to.be.eq(0);

    const aMockTokenBalanceBefore = await aMockToken.balanceOf(user.address, {
      blockTag: 'pending',
    });

    await aMockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .withdraw(mockToken.address, aMockTokenBalanceBefore, user.address);

    expect(await aMockToken.balanceOf(user.address)).to.be.eq(0);
    expect(await mockToken.balanceOf(user.address)).to.be.eq(aMockTokenBalanceBefore);
  });
});
