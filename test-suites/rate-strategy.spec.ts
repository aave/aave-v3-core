import { expect } from 'chai';
import { BigNumber, BigNumberish, utils } from 'ethers';
import { deployDefaultReserveInterestRateStrategy } from '../helpers/contracts-deployments';
import { PERCENTAGE_FACTOR } from '../helpers/constants';
import { AToken, DefaultReserveInterestRateStrategy, MintableERC20 } from '../types';
import { strategyDAI } from '../market-config/reservesConfigs';
import { rateStrategyStableTwo } from '../market-config/rateStrategies';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { formatUnits } from '@ethersproject/units';

const DEBUG = false;

type CalculateInterestRatesParams = {
  unbacked: BigNumberish;
  liquidityAdded: BigNumberish;
  liquidityTaken: BigNumberish;
  totalStableDebt: BigNumberish;
  totalVariableDebt: BigNumberish;
  averageStableBorrowRate: BigNumberish;
  reserveFactor: BigNumberish;
  reserve: string;
  aToken: string;
};

makeSuite('InterestRateStrategy', (testEnv: TestEnv) => {
  let strategyInstance: DefaultReserveInterestRateStrategy;
  let dai: MintableERC20;
  let aDai: AToken;
  const baseStableRate = BigNumber.from(rateStrategyStableTwo.variableRateSlope1).add(
    rateStrategyStableTwo.baseStableRateOffset
  );

  before(async () => {
    dai = testEnv.dai;
    aDai = testEnv.aDai;

    const { addressesProvider } = testEnv;

    strategyInstance = await deployDefaultReserveInterestRateStrategy([
      addressesProvider.address,
      rateStrategyStableTwo.optimalUtilizationRate,
      rateStrategyStableTwo.baseVariableBorrowRate,
      rateStrategyStableTwo.variableRateSlope1,
      rateStrategyStableTwo.variableRateSlope2,
      rateStrategyStableTwo.stableRateSlope1,
      rateStrategyStableTwo.stableRateSlope2,
      rateStrategyStableTwo.baseStableRateOffset,
      rateStrategyStableTwo.stableRateExcessOffset
    ]);
  });

  it('Checks rates at 0% utilization rate, empty reserve', async () => {
    let params: CalculateInterestRatesParams = {
      unbacked: 0,
      liquidityAdded: 0,
      liquidityTaken: 0,
      totalStableDebt: 0,
      totalVariableDebt: 0,
      averageStableBorrowRate: 0,
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    expect(currentLiquidityRate).to.be.equal(0, 'Invalid liquidity rate');
    expect(currentStableBorrowRate).to.be.equal(baseStableRate, 'Invalid stable rate');
    expect(currentVariableBorrowRate).to.be.equal(
      rateStrategyStableTwo.baseVariableBorrowRate,
      'Invalid variable rate'
    );
  });

  it('Checks rates at 80% utilization rate', async () => {
    let params: CalculateInterestRatesParams = {
      unbacked: 0,
      liquidityAdded: '200000000000000000',
      liquidityTaken: 0,
      totalStableDebt: 0,
      totalVariableDebt: '800000000000000000',
      averageStableBorrowRate: 0,
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    const expectedVariableRate = BigNumber.from(rateStrategyStableTwo.baseVariableBorrowRate).add(
      rateStrategyStableTwo.variableRateSlope1
    );

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate
        .percentMul(8000)
        .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)),
      'Invalid liquidity rate'
    );

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      baseStableRate.add(rateStrategyStableTwo.stableRateSlope1),
      'Invalid stable rate'
    );

    if (DEBUG) {
      console.log(`Current Liquidity Rate: ${formatUnits(currentLiquidityRate, 27)}`);
      console.log(`Current Borrow Rate V : ${formatUnits(currentVariableBorrowRate, 27)}`);
      console.log(`Current Borrow Rate S : ${formatUnits(currentStableBorrowRate, 27)}`);
    }
  });

  it('Checks rates at 100% utilization rate', async () => {
    let params: CalculateInterestRatesParams = {
      unbacked: 0,
      liquidityAdded: '0',
      liquidityTaken: 0,
      totalStableDebt: 0,
      totalVariableDebt: '1000000000000000000',
      averageStableBorrowRate: 0,
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    const expectedVariableRate = BigNumber.from(rateStrategyStableTwo.baseVariableBorrowRate)
      .add(rateStrategyStableTwo.variableRateSlope1)
      .add(rateStrategyStableTwo.variableRateSlope2);

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate.percentMul(
        BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)
      ),
      'Invalid liquidity rate'
    );

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      baseStableRate
        .add(rateStrategyStableTwo.stableRateSlope1)
        .add(rateStrategyStableTwo.stableRateSlope2),
      'Invalid stable rate'
    );

    if (DEBUG) {
      console.log(`Current Liquidity Rate: ${formatUnits(currentLiquidityRate, 27)}`);
      console.log(`Current Borrow Rate V : ${formatUnits(currentVariableBorrowRate, 27)}`);
      console.log(`Current Borrow Rate S : ${formatUnits(currentStableBorrowRate, 27)}`);
    }
  });

  it('Checks rates at 100% utilization rate, 50% stable debt and 50% variable debt, with a 10% avg stable rate', async () => {
    let params: CalculateInterestRatesParams = {
      unbacked: 0,
      liquidityAdded: '0',
      liquidityTaken: 0,
      totalStableDebt: '400000000000000000',
      totalVariableDebt: '400000000000000000',
      averageStableBorrowRate: '100000000000000000000000000',
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    const expectedVariableRate = BigNumber.from(rateStrategyStableTwo.baseVariableBorrowRate)
      .add(rateStrategyStableTwo.variableRateSlope1)
      .add(rateStrategyStableTwo.variableRateSlope2);

    const expectedLiquidityRate = currentVariableBorrowRate
      .add(utils.parseUnits('0.1', 27))
      .div(2)
      .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor));

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');
    expect(currentLiquidityRate).to.be.equal(expectedLiquidityRate, 'Invalid liquidity rate');
    expect(currentStableBorrowRate).to.be.equal(
      baseStableRate
        .add(rateStrategyStableTwo.stableRateSlope1)
        .add(rateStrategyStableTwo.stableRateSlope2),
      'Invalid stable rate'
    );
  });

  it('Checks rates at 80% borrow utilization rate and 50% supply utilization due to minted tokens', async () => {
    let params: CalculateInterestRatesParams = {
      unbacked: '600000000000000000',
      liquidityAdded: '200000000000000000',
      liquidityTaken: 0,
      totalStableDebt: '0',
      totalVariableDebt: '800000000000000000',
      averageStableBorrowRate: '0',
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    const expectedVariableRate = BigNumber.from(rateStrategyStableTwo.baseVariableBorrowRate).add(
      rateStrategyStableTwo.variableRateSlope1
    );

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate
        .percentMul(5000)
        .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)),
      'Invalid liquidity rate'
    );

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      baseStableRate.add(rateStrategyStableTwo.stableRateSlope1),
      'Invalid stable rate'
    );
  });

  it('Checks rates at 80% borrow utilization rate and 0.8% supply utilization due to minted tokens', async () => {
    const availableLiquidity = BigNumber.from('200000000000000000');
    const totalVariableDebt = BigNumber.from('800000000000000000');

    let params: CalculateInterestRatesParams = {
      unbacked: totalVariableDebt.mul('124').sub(availableLiquidity),
      liquidityAdded: availableLiquidity,
      liquidityTaken: 0,
      totalStableDebt: '0',
      totalVariableDebt: totalVariableDebt,
      averageStableBorrowRate: '0',
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    const expectedVariableRate = BigNumber.from(rateStrategyStableTwo.baseVariableBorrowRate).add(
      rateStrategyStableTwo.variableRateSlope1
    );

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate
        .percentMul(80)
        .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)),
      'Invalid liquidity rate'
    );
    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      baseStableRate.add(rateStrategyStableTwo.stableRateSlope1),
      'Invalid stable rate'
    );

    if (DEBUG) {
      console.log(`Current Liquidity Rate: ${formatUnits(currentLiquidityRate, 27)}`);
      console.log(`Current Borrow Rate V : ${formatUnits(currentVariableBorrowRate, 27)}`);
      console.log(`Current Borrow Rate S : ${formatUnits(currentStableBorrowRate, 27)}`);
    }
  });

  it('Checks rates at 0.8% utilization', async () => {
    let params: CalculateInterestRatesParams = {
      unbacked: 0,
      liquidityAdded: '9920000000000000000000',
      liquidityTaken: 0,
      totalStableDebt: '0',
      totalVariableDebt: '80000000000000000000',
      averageStableBorrowRate: '0',
      reserveFactor: strategyDAI.reserveFactor,
      reserve: dai.address,
      aToken: aDai.address,
    };

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance.calculateInterestRates(params);

    const utilRate = BigNumber.from(1).ray().percentMul(80);
    const optimalRate = BigNumber.from(rateStrategyStableTwo.optimalUtilizationRate);

    const expectedVariableRate = BigNumber.from(rateStrategyStableTwo.baseVariableBorrowRate).add(
      BigNumber.from(rateStrategyStableTwo.variableRateSlope1).rayMul(utilRate.rayDiv(optimalRate))
    );

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate
        .percentMul(80)
        .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)),
      'Invalid liquidity rate'
    );

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      baseStableRate.add(
        BigNumber.from(rateStrategyStableTwo.stableRateSlope1).rayMul(utilRate.rayDiv(optimalRate))
      ),
      'Invalid stable rate'
    );

    if (DEBUG) {
      console.log(`Current Liquidity Rate: ${formatUnits(currentLiquidityRate, 27)}`);
      console.log(`Current Borrow Rate V : ${formatUnits(currentVariableBorrowRate, 27)}`);
      console.log(`Current Borrow Rate S : ${formatUnits(currentStableBorrowRate, 27)}`);
    }
  });

  it('Checks getters', async () => {
    expect(await strategyInstance.OPTIMAL_UTILIZATION_RATE()).to.be.eq(
      rateStrategyStableTwo.optimalUtilizationRate
    );
    expect(await strategyInstance.getBaseVariableBorrowRate()).to.be.eq(
      rateStrategyStableTwo.baseVariableBorrowRate
    );
    expect(await strategyInstance.getVariableRateSlope1()).to.be.eq(
      rateStrategyStableTwo.variableRateSlope1
    );
    expect(await strategyInstance.getVariableRateSlope2()).to.be.eq(
      rateStrategyStableTwo.variableRateSlope2
    );
    expect(await strategyInstance.getStableRateSlope1()).to.be.eq(
      rateStrategyStableTwo.stableRateSlope1
    );
    expect(await strategyInstance.getStableRateSlope2()).to.be.eq(
      rateStrategyStableTwo.stableRateSlope2
    );
  });
});
