import { Pool } from '../../../types/Pool';
import { ReserveData, UserReserveData } from './interfaces';
import {
  getMintableERC20,
  getAToken,
  getStableDebtToken,
  getVariableDebtToken,
  getIRStrategy,
} from '@aave/deploy-v3/dist/helpers/contract-getters';
import { tEthereumAddress } from '../../../helpers/types';
import { AaveProtocolDataProvider } from '../../../types/AaveProtocolDataProvider';
import { BigNumber } from 'ethers';
import { AToken } from '../../../types';
import { getContract } from '@aave/deploy-v3';
import { expect } from 'chai';

export const getReserveData = async (
  helper: AaveProtocolDataProvider,
  reserve: tEthereumAddress
): Promise<ReserveData> => {
  const [reserveData, tokenAddresses, irStrategyAddress, reserveConfiguration, token] =
    await Promise.all([
      helper.getReserveData(reserve),
      helper.getReserveTokensAddresses(reserve),
      helper.getInterestRateStrategyAddress(reserve),
      helper.getReserveConfigurationData(reserve),
      getContract('IERC20Detailed', reserve),
    ]);

  const stableDebtToken = await getStableDebtToken(tokenAddresses.stableDebtTokenAddress);
  const variableDebtToken = await getVariableDebtToken(tokenAddresses.variableDebtTokenAddress);
  const irStrategy = await getIRStrategy(irStrategyAddress);

  const baseStableRate = await irStrategy.getBaseStableBorrowRate();

  const { 0: principalStableDebt } = await stableDebtToken.getSupplyData();
  const totalStableDebtLastUpdated = await stableDebtToken.getTotalSupplyLastUpdated();

  const scaledVariableDebt = await variableDebtToken.scaledTotalSupply();

  const symbol = await token.symbol();
  const decimals = BigNumber.from(await token.decimals());

  const accruedToTreasuryScaled = reserveData.accruedToTreasuryScaled;
  const unbacked = reserveData.unbacked;
  const aToken = (await getAToken(tokenAddresses.aTokenAddress)) as AToken;

  // Need the reserve factor
  const reserveFactor = reserveConfiguration.reserveFactor;

  const availableLiquidity = await token.balanceOf(aToken.address);

  const totalLiquidity = availableLiquidity.add(unbacked);

  const totalDebt = reserveData.totalStableDebt.add(reserveData.totalVariableDebt);

  const borrowUsageRatio = totalDebt.eq(0)
    ? BigNumber.from(0)
    : totalDebt.rayDiv(availableLiquidity.add(totalDebt));

  let supplyUsageRatio = totalDebt.eq(0)
    ? BigNumber.from(0)
    : totalDebt.rayDiv(totalLiquidity.add(totalDebt));

  expect(supplyUsageRatio).to.be.lte(borrowUsageRatio, 'Supply usage ratio > borrow usage ratio');

  return {
    reserveFactor,
    unbacked,
    accruedToTreasuryScaled,
    availableLiquidity,
    totalLiquidity,
    borrowUsageRatio,
    supplyUsageRatio,
    totalStableDebt: reserveData.totalStableDebt,
    totalVariableDebt: reserveData.totalVariableDebt,
    liquidityRate: reserveData.liquidityRate,
    variableBorrowRate: reserveData.variableBorrowRate,
    stableBorrowRate: reserveData.stableBorrowRate,
    averageStableBorrowRate: reserveData.averageStableBorrowRate,
    liquidityIndex: reserveData.liquidityIndex,
    variableBorrowIndex: reserveData.variableBorrowIndex,
    lastUpdateTimestamp: BigNumber.from(reserveData.lastUpdateTimestamp),
    totalStableDebtLastUpdated: BigNumber.from(totalStableDebtLastUpdated),
    principalStableDebt: principalStableDebt,
    scaledVariableDebt: scaledVariableDebt,
    address: reserve,
    aTokenAddress: tokenAddresses.aTokenAddress,
    symbol,
    decimals,
    marketStableRate: BigNumber.from(baseStableRate),
  };
};

export const getUserData = async (
  pool: Pool,
  helper: AaveProtocolDataProvider,
  reserve: string,
  user: tEthereumAddress,
  sender?: tEthereumAddress
): Promise<UserReserveData> => {
  const [userData, scaledATokenBalance] = await Promise.all([
    helper.getUserReserveData(reserve, user),
    getATokenUserData(reserve, user, helper),
  ]);

  const token = await getMintableERC20(reserve);
  const walletBalance = await token.balanceOf(sender || user);

  return {
    scaledATokenBalance: BigNumber.from(scaledATokenBalance),
    currentATokenBalance: userData.currentATokenBalance,
    currentStableDebt: userData.currentStableDebt,
    currentVariableDebt: userData.currentVariableDebt,
    principalStableDebt: userData.principalStableDebt,
    scaledVariableDebt: userData.scaledVariableDebt,
    stableBorrowRate: userData.stableBorrowRate,
    liquidityRate: userData.liquidityRate,
    usageAsCollateralEnabled: userData.usageAsCollateralEnabled,
    stableRateLastUpdated: BigNumber.from(userData.stableRateLastUpdated),
    walletBalance,
  };
};

const getATokenUserData = async (
  reserve: string,
  user: string,
  helpersContract: AaveProtocolDataProvider
) => {
  const aTokenAddress: string = (await helpersContract.getReserveTokensAddresses(reserve))
    .aTokenAddress;

  const aToken = await getAToken(aTokenAddress);

  const scaledBalance = await aToken.scaledBalanceOf(user);
  return scaledBalance.toString();
};
