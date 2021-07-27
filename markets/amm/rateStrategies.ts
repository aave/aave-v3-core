import BigNumber from 'bignumber.js';
import { oneRay } from '../../helpers/constants';
import { IInterestRateStrategyParams } from '../../helpers/types';

// DAIWETH WBTCWETH AAVEWETH BATWETH DAIUSDC CRVWETH LINKWETH MKRWETH RENWETH SNXWETH UNIWETH USDCWETH WBTCUSDC YFIWETH
export const rateStrategyAmmBase: IInterestRateStrategyParams = {
    name: "rateStrategyAmmBase",
    optimalUtilizationRate: new BigNumber(0.45).multipliedBy(oneRay).toFixed(),
    baseVariableBorrowRate: new BigNumber(0.03).multipliedBy(oneRay).toFixed(),
    variableRateSlope1: new BigNumber(0.10).multipliedBy(oneRay).toFixed(),
    variableRateSlope2: new BigNumber(3.00).multipliedBy(oneRay).toFixed(),
    stableRateSlope1: new BigNumber(0.1).multipliedBy(oneRay).toFixed(),
    stableRateSlope2: new BigNumber(3).multipliedBy(oneRay).toFixed(),
}

// WETH WBTC
export const rateStrategyBaseOne: IInterestRateStrategyParams = {
    name: "rateStrategyBaseOne",
    optimalUtilizationRate: new BigNumber(0.65).multipliedBy(oneRay).toFixed(),
    baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
    variableRateSlope1: new BigNumber(0.08).multipliedBy(oneRay).toFixed(),
    variableRateSlope2: new BigNumber(1).multipliedBy(oneRay).toFixed(),
    stableRateSlope1: new BigNumber(0.1).multipliedBy(oneRay).toFixed(),
    stableRateSlope2: new BigNumber(1).multipliedBy(oneRay).toFixed(),
}

// DAI USDC USDT
export const rateStrategyStable: IInterestRateStrategyParams = {
    name: "rateStrategyStable",
    optimalUtilizationRate: new BigNumber(0.8).multipliedBy(oneRay).toFixed(),
    baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
    variableRateSlope1: new BigNumber(0.04).multipliedBy(oneRay).toFixed(),
    variableRateSlope2: new BigNumber(0.75).multipliedBy(oneRay).toFixed(),
    stableRateSlope1: new BigNumber(0.02).multipliedBy(oneRay).toFixed(),
    stableRateSlope2: new BigNumber(0.60).multipliedBy(oneRay).toFixed(),   
}