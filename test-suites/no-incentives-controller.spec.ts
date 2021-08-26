import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { makeSuite } from './helpers/make-suite';
import { RateMode } from '../helpers/types';
import { expect } from 'chai';
import {
  ATokenFactory,
  ERC20,
  ERC20Factory,
  MintableERC20,
  StableDebtTokenFactory,
  VariableDebtTokenFactory,
} from '../types';
import { getFirstSigner } from '../helpers/contracts-getters';
import { deployMintableERC20 } from '../helpers/contracts-deployments';
import { BigNumberish } from '@ethersproject/bignumber';
import { parseUnits } from 'ethers/lib/utils';

makeSuite('Reserve with zero address incentives controller', (testEnv) => {
  let mockToken: MintableERC20;
  let aMockToken: ERC20;
  let mockStableDebt: ERC20;
  let mockVariableDebt: ERC20;

  before(async () => {
    const { pool, poolAdmin, configurator, users, dai, aDai, helpersContract } = testEnv;

    mockToken = await deployMintableERC20(['MOCK', 'MOCK', '18']);
    //const assetPrice = oneEther.multipliedBy('0.001').toFixed();
    //const mockAggregator = await deployMockAggregator(assetPrice);

    let stableDebtTokenImplementation = await new StableDebtTokenFactory(
      await getFirstSigner()
    ).deploy();
    let variableDebtTokenImplementation = await new VariableDebtTokenFactory(
      await getFirstSigner()
    ).deploy();
    const aTokenImplementation = await new ATokenFactory(await getFirstSigner()).deploy();

    const daiData = await pool.getReserveData(dai.address);

    const interestRateStrategyAddress = daiData.interestRateStrategyAddress;

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
        interestRateStrategyAddress: interestRateStrategyAddress,
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
    aMockToken = ERC20Factory.connect(reserveData.aTokenAddress, await getFirstSigner());
    mockStableDebt = ERC20Factory.connect(
      reserveData.stableDebtTokenAddress,
      await getFirstSigner()
    );
    mockVariableDebt = ERC20Factory.connect(
      reserveData.variableDebtTokenAddress,
      await getFirstSigner()
    );
  });

  it('Deposit mock tokens into aave', async () => {
    const { pool, users } = testEnv;
    const user = users[0];

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq('0');

    await mockToken.connect(user.signer).mint(parseUnits('10000', 18));
    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(mockToken.address, parseUnits('1000', 18), user.address, 0);

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
  });

  it('Transfer aMock tokens', async () => {
    const { pool, users } = testEnv;
    const sender = users[0];
    const receiver = users[1];

    expect((await aMockToken.balanceOf(sender.address)).toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
    expect((await aMockToken.balanceOf(receiver.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );

    await aMockToken.connect(sender.signer).transfer(receiver.address, parseUnits('1000', 18));
    expect((await aMockToken.balanceOf(sender.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await aMockToken.balanceOf(receiver.address)).toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
  });

  it('Borrow mock with stable rate', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[2];

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockVariableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockStableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );

    await dai.connect(user.signer).mint(parseUnits('10000', 18));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user.signer).deposit(dai.address, parseUnits('10000', 18), user.address, 0);
    await pool
      .connect(user.signer)
      .borrow(mockToken.address, parseUnits('100', 18), RateMode.Stable, 0, user.address);

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('100', 18).toString()
    );
    expect((await mockVariableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockStableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('100', 18).toString()
    );
  });

  it('Repay mock tokens', async () => {
    const { pool, users, dai } = testEnv;
    const user = users[2];

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('100', 18).toString()
    );
    expect((await mockVariableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockStableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('100', 18).toString()
    );

    await mockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .repay(mockToken.address, parseUnits('100', 18), RateMode.Stable, user.address);

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockVariableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockStableDebt.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
  });

  it('Withdraw aMock tokens', async () => {
    const { pool, users } = testEnv;
    const user = users[1];

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
    expect((await mockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );

    await aMockToken.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .withdraw(mockToken.address, parseUnits('1000', 18), user.address);

    expect((await aMockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('0', 18).toString()
    );
    expect((await mockToken.balanceOf(user.address)).toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
  });
});
