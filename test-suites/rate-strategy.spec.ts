import { TestEnv, makeSuite } from './helpers/make-suite';
import { deployDefaultReserveInterestRateStrategy } from '../helpers/contracts-deployments';
import { PERCENTAGE_FACTOR, RAY } from '../helpers/constants';
import { rateStrategyStableOne } from '../market-config/rateStrategies';
import { strategyDAI } from '../market-config/reservesConfigs';
import { AToken, DefaultReserveInterestRateStrategy, MintableERC20 } from '../types';
import './helpers/utils/wadraymath';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';

makeSuite('Interest rate strategy tests', (testEnv: TestEnv) => {
  let strategyInstance: DefaultReserveInterestRateStrategy;
  let dai: MintableERC20;
  let aDai: AToken;

  before(async () => {
    dai = testEnv.dai;
    aDai = testEnv.aDai;

    const { addressesProvider } = testEnv;

    strategyInstance = await deployDefaultReserveInterestRateStrategy([
      addressesProvider.address,
      rateStrategyStableOne.optimalUtilizationRate,
      rateStrategyStableOne.baseVariableBorrowRate,
      rateStrategyStableOne.variableRateSlope1,
      rateStrategyStableOne.variableRateSlope2,
      rateStrategyStableOne.stableRateSlope1,
      rateStrategyStableOne.stableRateSlope2,
    ]);
  });

  it('Checks rates at 0% utilization rate, empty reserve', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](dai.address, aDai.address, 0, 0, 0, 0, 0, strategyDAI.reserveFactor);

    expect(currentLiquidityRate).to.be.equal(0, 'Invalid liquidity rate');
    expect(currentStableBorrowRate).to.be.equal(parseUnits('0.039', 27), 'Invalid stable rate');
    expect(currentVariableBorrowRate).to.be.equal(
      rateStrategyStableOne.baseVariableBorrowRate,
      'Invalid variable rate'
    );
  });

  it('Checks rates at 80% utilization rate', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      aDai.address,
      '200000000000000000',
      '0',
      '0',
      '800000000000000000',
      '0',
      strategyDAI.reserveFactor
    );

    const expectedVariableRate = BigNumber.from(rateStrategyStableOne.baseVariableBorrowRate).add(
      rateStrategyStableOne.variableRateSlope1
    );

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate
        .percentMul(8000)
        .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)),
      'Invalid liquidity rate'
    );

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      parseUnits('0.039', 27).add(rateStrategyStableOne.stableRateSlope1),
      'Invalid stable rate'
    );
  });

  it('Checks rates at 100% utilization rate', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      aDai.address,
      '0',
      '0',
      '0',
      '800000000000000000',
      '0',
      strategyDAI.reserveFactor
    );

    const expectedVariableRate = BigNumber.from(rateStrategyStableOne.baseVariableBorrowRate)
      .add(rateStrategyStableOne.variableRateSlope1)
      .add(rateStrategyStableOne.variableRateSlope2);

    expect(currentLiquidityRate).to.be.equal(
      expectedVariableRate.percentMul(
        BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor)
      ),
      'Invalid liquidity rate'
    );

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');

    expect(currentStableBorrowRate).to.be.equal(
      parseUnits('0.039', 27)
        .add(rateStrategyStableOne.stableRateSlope1)
        .add(rateStrategyStableOne.stableRateSlope2),
      'Invalid stable rate'
    );
  });

  it('Checks rates at 100% utilization rate, 50% stable debt and 50% variable debt, with a 10% avg stable rate', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      aDai.address,
      '0',
      '0',
      '400000000000000000',
      '400000000000000000',
      '100000000000000000000000000',
      strategyDAI.reserveFactor
    );

    const expectedVariableRate = BigNumber.from(rateStrategyStableOne.baseVariableBorrowRate)
      .add(rateStrategyStableOne.variableRateSlope1)
      .add(rateStrategyStableOne.variableRateSlope2);

    const expectedLiquidityRate = currentVariableBorrowRate
      .add(parseUnits('0.1', 27))
      .div(2)
      .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(strategyDAI.reserveFactor));

    expect(currentVariableBorrowRate).to.be.equal(expectedVariableRate, 'Invalid variable rate');
    expect(currentLiquidityRate).to.be.equal(expectedLiquidityRate, 'Invalid liquidity rate');
    expect(currentStableBorrowRate).to.be.equal(
      parseUnits('0.039', 27)
        .add(rateStrategyStableOne.stableRateSlope1)
        .add(rateStrategyStableOne.stableRateSlope2),
      'Invalid stable rate'
    );
  });

  it('Checks getters', async () => {
    expect(await strategyInstance.OPTIMAL_UTILIZATION_RATE()).to.be.eq(
      rateStrategyStableOne.optimalUtilizationRate
    );
    expect(await strategyInstance.baseVariableBorrowRate()).to.be.eq(
      rateStrategyStableOne.baseVariableBorrowRate
    );
    expect(await strategyInstance.variableRateSlope1()).to.be.eq(
      rateStrategyStableOne.variableRateSlope1
    );
    expect(await strategyInstance.variableRateSlope2()).to.be.eq(
      rateStrategyStableOne.variableRateSlope2
    );
    expect(await strategyInstance.stableRateSlope1()).to.be.eq(
      rateStrategyStableOne.stableRateSlope1
    );
    expect(await strategyInstance.stableRateSlope2()).to.be.eq(
      rateStrategyStableOne.stableRateSlope2
    );
  });
});
