import { Pool } from '../../../types/Pool';
import { ReserveData, UserReserveData } from './interfaces';
import {
  getIErc20Detailed,
  getMintableERC20,
  getAToken,
  getStableDebtToken,
  getVariableDebtToken,
  getIRStrategy,
} from '../../../helpers/contracts-getters';
import { tEthereumAddress } from '../../../helpers/types';
import { getDb, DRE } from '../../../helpers/misc-utils';
import { AaveProtocolDataProvider } from '../../../types/AaveProtocolDataProvider';
import { BigNumber } from 'ethers';
import { AToken } from '../../../types';

export const getReserveData = async (
  helper: AaveProtocolDataProvider,
  reserve: tEthereumAddress
): Promise<ReserveData> => {
  const [reserveData, tokenAddresses, irStrategyAddress, reserveConfiguration, token] = await Promise.all([
    helper.getReserveData(reserve),
    helper.getReserveTokensAddresses(reserve),
    helper.getInterestRateStrategyAddress(reserve),
    helper.getReserveConfigurationData(reserve),
    getIErc20Detailed(reserve),
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

  const borrowUtilizationRate = totalDebt.eq(0)
    ? BigNumber.from(0)
    : totalDebt.rayDiv(availableLiquidity.add(totalDebt));

  let supplyUtilizationRate = totalDebt.eq(0)
    ? BigNumber.from(0)
    : totalDebt.rayDiv(totalLiquidity.add(totalDebt));

  supplyUtilizationRate =
    supplyUtilizationRate > borrowUtilizationRate ? borrowUtilizationRate : supplyUtilizationRate;

  return {
    reserveFactor,
    unbacked,
    accruedToTreasuryScaled,
    availableLiquidity,
    totalLiquidity,
    borrowUtilizationRate,
    supplyUtilizationRate,
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

export const getReserveAddressFromSymbol = async (symbol: string) => {
  const token = await getMintableERC20(
    (
      await getDb().get(`${symbol}.${DRE.network.name}`).value()
    ).address
  );

  if (!token) {
    throw `Could not find instance for contract ${symbol}`;
  }
  return token.address;
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
