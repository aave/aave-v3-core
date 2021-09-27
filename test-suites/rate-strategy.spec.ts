import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { deployDefaultReserveInterestRateStrategy } from '../helpers/contracts-deployments';
import { PERCENTAGE_FACTOR } from '../helpers/constants';
import { AToken, DefaultReserveInterestRateStrategy, MintableERC20 } from '../types';
import { strategyDAI } from '../market-config/reservesConfigs';
import { rateStrategyStableTwo } from '../market-config/rateStrategies';
import { TestEnv, makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';
import { formatUnits } from '@ethersproject/units';

const DEBUG = false;

makeSuite('InterestRateStrategy', (testEnv: TestEnv) => {
  let strategyInstance: DefaultReserveInterestRateStrategy;
  let dai: MintableERC20;
  let aDai: AToken;

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
    ]);
  });

  it('Checks rates at 0% utilization rate, empty reserve', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](dai.address, 0, 0, 0, 0, 0, strategyDAI.reserveFactor);

    expect(currentLiquidityRate).to.be.equal(0, 'Invalid liquidity rate');
    expect(currentStableBorrowRate).to.be.equal(
      utils.parseUnits('0.039', 27),
      'Invalid stable rate'
    );
    expect(currentVariableBorrowRate).to.be.equal(
      rateStrategyStableTwo.baseVariableBorrowRate,
      'Invalid variable rate'
    );
  });

  it('Checks rates at 80% utilization rate', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      '200000000000000000',
      '0',
      '0',
      '800000000000000000',
      '0',
      strategyDAI.reserveFactor
    );

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
      utils.parseUnits('0.039', 27).add(rateStrategyStableTwo.stableRateSlope1),
      'Invalid stable rate'
    );

    if (DEBUG) {
      console.log(`Current Liquidity Rate: ${formatUnits(currentLiquidityRate, 27)}`);
      console.log(`Current Borrow Rate V : ${formatUnits(currentVariableBorrowRate, 27)}`);
      console.log(`Current Borrow Rate S : ${formatUnits(currentStableBorrowRate, 27)}`);
    }
  });

  it('Checks rates at 100% utilization rate', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](dai.address, '0', '0', '0', '1000000000000000000', '0', strategyDAI.reserveFactor);

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
      utils
        .parseUnits('0.039', 27)
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
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      '0',
      '0',
      '400000000000000000',
      '400000000000000000',
      '100000000000000000000000000',
      strategyDAI.reserveFactor
    );

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
      utils
        .parseUnits('0.039', 27)
        .add(rateStrategyStableTwo.stableRateSlope1)
        .add(rateStrategyStableTwo.stableRateSlope2),
      'Invalid stable rate'
    );
  });

  it('Checks rates at 80% borrow utilization rate and 50% supply utilization due to minted tokens', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      '200000000000000000',
      '600000000000000000',
      '0',
      '800000000000000000',
      '0',
      strategyDAI.reserveFactor
    );

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
      utils.parseUnits('0.039', 27).add(rateStrategyStableTwo.stableRateSlope1),
      'Invalid stable rate'
    );
  });

  it('Checks rates at 80% borrow utilization rate and 0.8% supply utilization due to minted tokens', async () => {
    const availableLiquidity = BigNumber.from('200000000000000000');
    const totalVariableDebt = BigNumber.from('800000000000000000');
    // 0.008 = y / (x + y) -> x = 124 y
    const totalLiquidity = totalVariableDebt.mul('124').sub(availableLiquidity);

    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      availableLiquidity,
      totalLiquidity,
      '0',
      totalVariableDebt,
      '0',
      strategyDAI.reserveFactor
    );

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
      utils.parseUnits('0.039', 27).add(rateStrategyStableTwo.stableRateSlope1),
      'Invalid stable rate'
    );

    if (DEBUG) {
      console.log(`Current Liquidity Rate: ${formatUnits(currentLiquidityRate, 27)}`);
      console.log(`Current Borrow Rate V : ${formatUnits(currentVariableBorrowRate, 27)}`);
      console.log(`Current Borrow Rate S : ${formatUnits(currentStableBorrowRate, 27)}`);
    }
  });

  it('Checks rates at 0.8% utilization', async () => {
    const {
      0: currentLiquidityRate,
      1: currentStableBorrowRate,
      2: currentVariableBorrowRate,
    } = await strategyInstance[
      'calculateInterestRates(address,uint256,uint256,uint256,uint256,uint256,uint256)'
    ](
      dai.address,
      '9920000000000000000000',
      '0',
      '0',
      '80000000000000000000',
      '0',
      strategyDAI.reserveFactor
    );

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
      utils
        .parseUnits('0.039', 27)
        .add(
          BigNumber.from(rateStrategyStableTwo.stableRateSlope1).rayMul(
            utilRate.rayDiv(optimalRate)
          )
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
    expect(await strategyInstance.baseVariableBorrowRate()).to.be.eq(
      rateStrategyStableTwo.baseVariableBorrowRate
    );
    expect(await strategyInstance.variableRateSlope1()).to.be.eq(
      rateStrategyStableTwo.variableRateSlope1
    );
    expect(await strategyInstance.variableRateSlope2()).to.be.eq(
      rateStrategyStableTwo.variableRateSlope2
    );
    expect(await strategyInstance.stableRateSlope1()).to.be.eq(
      rateStrategyStableTwo.stableRateSlope1
    );
    expect(await strategyInstance.stableRateSlope2()).to.be.eq(
      rateStrategyStableTwo.stableRateSlope2
    );
  });
});
