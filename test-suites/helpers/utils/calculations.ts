import { ONE_YEAR, RAY, MAX_UINT_AMOUNT, PERCENTAGE_FACTOR } from '../../../helpers/constants';
import { IReserveParams, iMultiPoolsAssets, RateMode } from '../../../helpers/types';
import './wadraymath';
import { ReserveData, UserReserveData } from './interfaces';
import { BigNumber } from 'ethers';
import { expect } from 'chai';

interface Configuration {
  reservesParams: iMultiPoolsAssets<IReserveParams>;
}

export const configuration: Configuration = <Configuration>{};

export const calcExpectedUserDataAfterDeposit = (
  amountDeposited: string,
  reserveDataBeforeAction: ReserveData,
  reserveDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  expectedUserData.currentStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  expectedUserData.currentVariableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  expectedUserData.principalStableDebt = userDataBeforeAction.principalStableDebt;
  expectedUserData.scaledVariableDebt = userDataBeforeAction.scaledVariableDebt;
  expectedUserData.variableBorrowIndex = userDataBeforeAction.variableBorrowIndex;
  expectedUserData.stableBorrowRate = userDataBeforeAction.stableBorrowRate;
  expectedUserData.stableRateLastUpdated = userDataBeforeAction.stableRateLastUpdated;
  expectedUserData.liquidityRate = reserveDataAfterAction.liquidityRate;

  expectedUserData.scaledATokenBalance = calcExpectedScaledATokenBalance(
    userDataBeforeAction,
    reserveDataAfterAction.liquidityIndex,
    BigNumber.from(amountDeposited),
    BigNumber.from(0)
  );
  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  ).add(amountDeposited);

  if (userDataBeforeAction.currentATokenBalance.eq(0)) {
    expectedUserData.usageAsCollateralEnabled = true;
  } else {
    expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;
  }

  expectedUserData.variableBorrowIndex = userDataBeforeAction.variableBorrowIndex;
  expectedUserData.walletBalance = userDataBeforeAction.walletBalance.sub(amountDeposited);

  expectedUserData.currentStableDebt = expectedUserData.principalStableDebt =
    calcExpectedStableDebtTokenBalance(
      userDataBeforeAction.principalStableDebt,
      userDataBeforeAction.stableBorrowRate,
      userDataBeforeAction.stableRateLastUpdated,
      txTimestamp
    );

  expectedUserData.currentVariableDebt = expectedUserData.principalStableDebt =
    calcExpectedVariableDebtTokenBalance(
      reserveDataBeforeAction,
      userDataBeforeAction,
      txTimestamp
    );

  return expectedUserData;
};

export const calcExpectedUserDataAfterWithdraw = (
  amountWithdrawn: string,
  reserveDataBeforeAction: ReserveData,
  reserveDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  const aTokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  if (amountWithdrawn == MAX_UINT_AMOUNT) {
    amountWithdrawn = aTokenBalance.toString();
  }

  expectedUserData.scaledATokenBalance = calcExpectedScaledATokenBalance(
    userDataBeforeAction,
    reserveDataAfterAction.liquidityIndex,
    BigNumber.from(0),
    BigNumber.from(amountWithdrawn)
  );

  expectedUserData.currentATokenBalance = aTokenBalance.sub(amountWithdrawn);
  expectedUserData.principalStableDebt = userDataBeforeAction.principalStableDebt;
  expectedUserData.scaledVariableDebt = userDataBeforeAction.scaledVariableDebt;
  expectedUserData.currentStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  expectedUserData.currentVariableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  expectedUserData.variableBorrowIndex = userDataBeforeAction.variableBorrowIndex;
  expectedUserData.stableBorrowRate = userDataBeforeAction.stableBorrowRate;
  expectedUserData.stableRateLastUpdated = userDataBeforeAction.stableRateLastUpdated;

  expectedUserData.liquidityRate = reserveDataAfterAction.liquidityRate;

  if (userDataBeforeAction.currentATokenBalance.eq(0)) {
    expectedUserData.usageAsCollateralEnabled = true;
  } else {
    //if the user is withdrawing everything, usageAsCollateralEnabled must be false
    if (expectedUserData.currentATokenBalance.eq(0)) {
      expectedUserData.usageAsCollateralEnabled = false;
    } else {
      expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;
    }
  }

  expectedUserData.walletBalance = userDataBeforeAction.walletBalance.add(amountWithdrawn);

  return expectedUserData;
};

export const calcExpectedReserveDataAfterDeposit = (
  amountDeposited: string,
  reserveDataBeforeAction: ReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked;
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;

  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);
  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    BigNumber.from(amountDeposited),
    BigNumber.from(0)
  );

  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterMintUnbacked = (
  amountMinted: string,
  reserveDataBeforeAction: ReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  const amountMintedBN = BigNumber.from(amountMinted);

  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;

  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);

  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked.add(amountMintedBN);
  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    BigNumber.from(0),
    BigNumber.from(0)
  );

  expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
    reserveDataBeforeAction.averageStableBorrowRate,
    reserveDataBeforeAction.totalStableDebt,
    BigNumber.from(0),
    reserveDataBeforeAction.stableBorrowRate
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterBackUnbacked = (
  scaledATokenSupply: BigNumber,
  amount: string,
  fee: string,
  bridgeProtocolFee: string,
  reserveDataBeforeAction: ReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const cumulateToLiquidityIndex = (
    liquidityIndex: BigNumber,
    totalLiquidity: BigNumber,
    amount: BigNumber
  ) => {
    const amountToLiquidityRatio = amount.wadToRay().rayDiv(totalLiquidity.wadToRay());
    return amountToLiquidityRatio.add(RAY).rayMul(liquidityIndex);
  };
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;
  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);

  const amountBN = BigNumber.from(amount);
  const backingAmount = amountBN.lt(reserveDataBeforeAction.unbacked)
    ? amountBN
    : reserveDataBeforeAction.unbacked;

  const feeBN = BigNumber.from(fee);

  const protocolFeePercentage = BigNumber.from(bridgeProtocolFee);

  const premiumToProtocol = feeBN.percentMul(protocolFeePercentage);
  const premiumToLP = feeBN.sub(premiumToProtocol);

  const totalSupply = scaledATokenSupply.rayMul(expectedReserveData.liquidityIndex);
  // The fee is added directly to total liquidity, the backing will not change this liquidity.
  // We only update the liquidity index at the end, because it will otherwise influence computations midway

  expectedReserveData.liquidityIndex = cumulateToLiquidityIndex(
    expectedReserveData.liquidityIndex,
    totalSupply,
    premiumToLP
  );

  expectedReserveData.accruedToTreasuryScaled = expectedReserveData.accruedToTreasuryScaled.add(
    premiumToProtocol.rayDiv(expectedReserveData.liquidityIndex)
  );

  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked.sub(backingAmount);

  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    backingAmount.add(feeBN),
    BigNumber.from(0)
  );

  expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
    reserveDataBeforeAction.averageStableBorrowRate,
    reserveDataBeforeAction.totalStableDebt,
    BigNumber.from(0),
    reserveDataBeforeAction.stableBorrowRate
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );

  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterWithdraw = (
  amountWithdrawn: string,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked;
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;

  if (amountWithdrawn == MAX_UINT_AMOUNT) {
    amountWithdrawn = calcExpectedATokenBalance(
      reserveDataBeforeAction,
      userDataBeforeAction,
      txTimestamp
    ).toString();
  }

  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);
  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    BigNumber.from(0),
    BigNumber.from(amountWithdrawn)
  );

  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterBorrow = (
  amountBorrowed: string,
  borrowRateMode: string,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked;
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;
  expectedReserveData.lastUpdateTimestamp = txTimestamp;

  const amountBorrowedBN = BigNumber.from(amountBorrowed);

  // Update indexes
  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);
  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    BigNumber.from(0),
    BigNumber.from(amountBorrowed)
  );

  // Now we can perform the borrow THERE MUST BE SOMETHING IN HERE THAN CAN BE SIMPLIFIED
  if (borrowRateMode == RateMode.Stable) {
    const expectedStableDebtUntilTx = calcExpectedTotalStableDebt(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      txTimestamp
    );

    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      expectedStableDebtUntilTx,
      amountBorrowedBN,
      reserveDataBeforeAction.stableBorrowRate
    );

    expectedReserveData.principalStableDebt = expectedStableDebtUntilTx.add(amountBorrowedBN);

    const ratesAfterTx = calcExpectedInterestRates(
      reserveDataBeforeAction.symbol,
      reserveDataBeforeAction.marketStableRate,
      expectedReserveData.principalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.averageStableBorrowRate,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );

    expectedReserveData.liquidityRate = ratesAfterTx[0];
    expectedReserveData.stableBorrowRate = ratesAfterTx[1];
    expectedReserveData.variableBorrowRate = ratesAfterTx[2];

    expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
      expectedReserveData.principalStableDebt,
      expectedReserveData.averageStableBorrowRate,
      txTimestamp,
      currentTimestamp
    );

    expectedReserveData.totalVariableDebt = reserveDataBeforeAction.scaledVariableDebt.rayMul(
      calcExpectedReserveNormalizedDebt(
        expectedReserveData.variableBorrowRate,
        expectedReserveData.variableBorrowIndex,
        txTimestamp,
        currentTimestamp
      )
    );

    [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
      calcExpectedUsageRatios(
        expectedReserveData.totalStableDebt,
        expectedReserveData.totalVariableDebt,
        expectedReserveData.availableLiquidity,
        expectedReserveData.totalLiquidity
      );
  } else {
    expectedReserveData.principalStableDebt = reserveDataBeforeAction.principalStableDebt;

    const totalStableDebtAfterTx = calcExpectedStableDebtTokenBalance(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      txTimestamp
    );

    expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      currentTimestamp
    );

    expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;

    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt.add(
      amountBorrowedBN.rayDiv(expectedReserveData.variableBorrowIndex)
    );

    const totalVariableDebtAfterTx = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );

    [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
      calcExpectedUsageRatios(
        expectedReserveData.totalStableDebt,
        expectedReserveData.totalVariableDebt,
        expectedReserveData.availableLiquidity,
        expectedReserveData.totalLiquidity
      );

    const rates = calcExpectedInterestRates(
      reserveDataBeforeAction.symbol,
      reserveDataBeforeAction.marketStableRate,
      totalStableDebtAfterTx,
      totalVariableDebtAfterTx,
      expectedReserveData.averageStableBorrowRate,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );

    expectedReserveData.liquidityRate = rates[0];
    expectedReserveData.stableBorrowRate = rates[1];
    expectedReserveData.variableBorrowRate = rates[2];

    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      calcExpectedReserveNormalizedDebt(
        expectedReserveData.variableBorrowRate,
        expectedReserveData.variableBorrowIndex,
        txTimestamp,
        currentTimestamp
      )
    );

    [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
      calcExpectedUsageRatios(
        expectedReserveData.totalStableDebt,
        expectedReserveData.totalVariableDebt,
        expectedReserveData.availableLiquidity,
        expectedReserveData.totalLiquidity
      );
  }

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterRepay = (
  amountRepaid: string,
  borrowRateMode: RateMode,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked;
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;

  // TODO: The repay amount here need to be capped to the balance.

  let amountRepaidBN = BigNumber.from(amountRepaid);

  const userStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  const userVariableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  //if amount repaid == MAX_UINT_AMOUNT, user is repaying everything
  if (amountRepaidBN.abs().eq(MAX_UINT_AMOUNT)) {
    if (borrowRateMode == RateMode.Stable) {
      amountRepaidBN = userStableDebt;
    } else {
      amountRepaidBN = userVariableDebt;
    }
  }

  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);
  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    amountRepaidBN,
    BigNumber.from(0)
  );

  if (borrowRateMode == RateMode.Stable) {
    const expectedDebt = calcExpectedTotalStableDebt(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      txTimestamp
    );

    expectedReserveData.principalStableDebt = expectedReserveData.totalStableDebt =
      expectedDebt.sub(amountRepaidBN);

    //due to accumulation errors, the total stable debt might be smaller than the last user debt.
    //in this case we simply set the total supply and avg stable rate to 0.
    if (expectedReserveData.totalStableDebt.lt(0)) {
      expectedReserveData.principalStableDebt =
        expectedReserveData.totalStableDebt =
        expectedReserveData.averageStableBorrowRate =
          BigNumber.from(0);
    } else {
      expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
        reserveDataBeforeAction.averageStableBorrowRate,
        expectedDebt,
        amountRepaidBN.negated(),
        userDataBeforeAction.stableBorrowRate
      );

      //also due to accumulation errors, the final avg stable rate when the last user repays might be negative.
      //if that is the case, it means a small leftover of total stable debt is left, which can be erased.
      if (expectedReserveData.averageStableBorrowRate.lt(0)) {
        expectedReserveData.principalStableDebt =
          expectedReserveData.totalStableDebt =
          expectedReserveData.averageStableBorrowRate =
            BigNumber.from(0);
      }
    }
  } else {
    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt.sub(
      amountRepaidBN.rayDiv(expectedReserveData.variableBorrowIndex)
    );
    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );

    expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  }

  // Update usage ratio because of debt change
  [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
    calcExpectedUsageRatios(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.lastUpdateTimestamp = txTimestamp;

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedUserDataAfterBorrow = (
  amountBorrowed: string,
  interestRateMode: string,
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  const amountBorrowedBN = BigNumber.from(amountBorrowed);

  if (interestRateMode == RateMode.Stable) {
    const stableDebtUntilTx = calcExpectedStableDebtTokenBalance(
      userDataBeforeAction.principalStableDebt,
      userDataBeforeAction.stableBorrowRate,
      userDataBeforeAction.stableRateLastUpdated,
      txTimestamp
    );

    expectedUserData.principalStableDebt = stableDebtUntilTx.add(amountBorrowed);
    expectedUserData.stableRateLastUpdated = txTimestamp;

    expectedUserData.stableBorrowRate = calcExpectedUserStableRate(
      stableDebtUntilTx,
      userDataBeforeAction.stableBorrowRate,
      amountBorrowedBN,
      reserveDataBeforeAction.stableBorrowRate
    );

    expectedUserData.currentStableDebt = calcExpectedStableDebtTokenBalance(
      expectedUserData.principalStableDebt,
      expectedUserData.stableBorrowRate,
      txTimestamp,
      currentTimestamp
    );

    expectedUserData.scaledVariableDebt = userDataBeforeAction.scaledVariableDebt;
  } else {
    expectedUserData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt.add(
      amountBorrowedBN.rayDiv(expectedDataAfterAction.variableBorrowIndex)
    );

    expectedUserData.principalStableDebt = userDataBeforeAction.principalStableDebt;

    expectedUserData.stableBorrowRate = userDataBeforeAction.stableBorrowRate;

    expectedUserData.stableRateLastUpdated = userDataBeforeAction.stableRateLastUpdated;

    expectedUserData.currentStableDebt = calcExpectedStableDebtTokenBalance(
      userDataBeforeAction.principalStableDebt,
      userDataBeforeAction.stableBorrowRate,
      userDataBeforeAction.stableRateLastUpdated,
      currentTimestamp
    );
  }

  expectedUserData.currentVariableDebt = calcExpectedVariableDebtTokenBalance(
    expectedDataAfterAction,
    expectedUserData,
    currentTimestamp
  );

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    expectedDataAfterAction,
    userDataBeforeAction,
    currentTimestamp
  );

  expectedUserData.scaledATokenBalance = userDataBeforeAction.scaledATokenBalance;

  expectedUserData.walletBalance = userDataBeforeAction.walletBalance.add(amountBorrowed);

  return expectedUserData;
};

export const calcExpectedUserDataAfterRepay = (
  totalRepaid: string,
  rateMode: RateMode,
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  user: string,
  onBehalfOf: string,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  const variableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    currentTimestamp
  );

  const stableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    currentTimestamp
  );

  let totalRepaidBN = BigNumber.from(totalRepaid);
  if (totalRepaidBN.abs().eq(MAX_UINT_AMOUNT)) {
    totalRepaidBN = rateMode == RateMode.Stable ? stableDebt : variableDebt;
  }

  if (rateMode == RateMode.Stable) {
    expectedUserData.scaledVariableDebt = userDataBeforeAction.scaledVariableDebt;
    expectedUserData.currentVariableDebt = variableDebt;

    expectedUserData.principalStableDebt = expectedUserData.currentStableDebt =
      stableDebt.sub(totalRepaidBN);

    if (expectedUserData.currentStableDebt.eq('0')) {
      //user repaid everything
      expectedUserData.stableBorrowRate = expectedUserData.stableRateLastUpdated =
        BigNumber.from('0');
    } else {
      expectedUserData.stableBorrowRate = userDataBeforeAction.stableBorrowRate;
      expectedUserData.stableRateLastUpdated = txTimestamp;
    }
  } else {
    expectedUserData.currentStableDebt = userDataBeforeAction.principalStableDebt;
    expectedUserData.principalStableDebt = stableDebt;
    expectedUserData.stableBorrowRate = userDataBeforeAction.stableBorrowRate;
    expectedUserData.stableRateLastUpdated = userDataBeforeAction.stableRateLastUpdated;

    expectedUserData.scaledVariableDebt = userDataBeforeAction.scaledVariableDebt.sub(
      totalRepaidBN.rayDiv(expectedDataAfterAction.variableBorrowIndex)
    );
    expectedUserData.currentVariableDebt = expectedUserData.scaledVariableDebt.rayMul(
      expectedDataAfterAction.variableBorrowIndex
    );
  }

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );
  expectedUserData.scaledATokenBalance = userDataBeforeAction.scaledATokenBalance;

  if (user === onBehalfOf) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.sub(totalRepaidBN);
  } else {
    //wallet balance didn't change
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance;
  }

  return expectedUserData;
};

export const calcExpectedUserDataAfterSetUseAsCollateral = (
  useAsCollateral: boolean,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = { ...userDataBeforeAction };

  expectedUserData.usageAsCollateralEnabled = useAsCollateral;

  return expectedUserData;
};

export const calcExpectedReserveDataAfterSwapRateMode = (
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  rateMode: string,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked;
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;

  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);

  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    BigNumber.from(0),
    BigNumber.from(0)
  );

  const variableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  const stableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  const totalStableDebtUntilTx = expectedReserveData.totalStableDebt;

  if (rateMode === RateMode.Stable) {
    //swap user stable debt to variable
    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt.add(
      stableDebt.rayDiv(expectedReserveData.variableBorrowIndex)
    );

    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );

    expectedReserveData.principalStableDebt = expectedReserveData.totalStableDebt =
      totalStableDebtUntilTx.sub(stableDebt);

    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      expectedReserveData.principalStableDebt.add(stableDebt),
      stableDebt.negated(),
      userDataBeforeAction.stableBorrowRate
    );
  } else {
    //swap variable to stable
    expectedReserveData.principalStableDebt = expectedReserveData.totalStableDebt =
      totalStableDebtUntilTx.add(variableDebt);

    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt.sub(
      variableDebt.rayDiv(expectedReserveData.variableBorrowIndex)
    );

    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );

    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebt,
      variableDebt,
      reserveDataBeforeAction.stableBorrowRate
    );
  }

  [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
    calcExpectedUsageRatios(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedUserDataAfterSwapRateMode = (
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  rateMode: string,
  txCost: BigNumber,
  txTimestamp: BigNumber
): UserReserveData => {
  const expectedUserData = { ...userDataBeforeAction };

  const stableDebtBalance = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  const variableDebtBalance = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  if (rateMode === RateMode.Stable) {
    // swap to variable
    expectedUserData.currentStableDebt = expectedUserData.principalStableDebt = BigNumber.from(0);

    expectedUserData.stableBorrowRate = BigNumber.from(0);

    expectedUserData.scaledVariableDebt = userDataBeforeAction.scaledVariableDebt.add(
      stableDebtBalance.rayDiv(expectedDataAfterAction.variableBorrowIndex)
    );
    expectedUserData.currentVariableDebt = expectedUserData.scaledVariableDebt.rayMul(
      expectedDataAfterAction.variableBorrowIndex
    );

    expectedUserData.stableRateLastUpdated = BigNumber.from(0);
  } else {
    expectedUserData.principalStableDebt = expectedUserData.currentStableDebt =
      userDataBeforeAction.currentStableDebt.add(variableDebtBalance);

    //weighted average of the previous and the current
    expectedUserData.stableBorrowRate = calcExpectedUserStableRate(
      stableDebtBalance,
      userDataBeforeAction.stableBorrowRate,
      variableDebtBalance,
      reserveDataBeforeAction.stableBorrowRate
    );

    expectedUserData.stableRateLastUpdated = txTimestamp;

    expectedUserData.currentVariableDebt = expectedUserData.scaledVariableDebt = BigNumber.from(0);
  }

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  return expectedUserData;
};

export const calcExpectedReserveDataAfterStableRateRebalance = (
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};
  expectedReserveData.unbacked = reserveDataBeforeAction.unbacked;
  expectedReserveData.address = reserveDataBeforeAction.address;
  expectedReserveData.reserveFactor = reserveDataBeforeAction.reserveFactor;

  updateState(reserveDataBeforeAction, expectedReserveData, txTimestamp);
  updateLiquidityAndUsageRatios(
    reserveDataBeforeAction,
    expectedReserveData,
    BigNumber.from(0),
    BigNumber.from(0)
  );

  const userStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  expectedReserveData.principalStableDebt = expectedReserveData.totalStableDebt =
    calcExpectedTotalStableDebt(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      txTimestamp
    );

  //removing the stable liquidity at the old rate

  const avgRateBefore = calcExpectedAverageStableBorrowRateRebalance(
    reserveDataBeforeAction.averageStableBorrowRate,
    expectedReserveData.totalStableDebt,
    userStableDebt.negated(),
    userDataBeforeAction.stableBorrowRate
  );
  // adding it again at the new rate

  expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRateRebalance(
    avgRateBefore,
    expectedReserveData.totalStableDebt.sub(userStableDebt),
    userStableDebt,
    reserveDataBeforeAction.stableBorrowRate
  );

  [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
    calcExpectedUsageRatios(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    expectedReserveData.availableLiquidity,
    expectedReserveData.totalLiquidity
  );

  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  updateTotalLiquidityAndUsageRatio(expectedReserveData);

  return expectedReserveData;
};

export const calcExpectedUserDataAfterStableRateRebalance = (
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txCost: BigNumber,
  txTimestamp: BigNumber
): UserReserveData => {
  const expectedUserData = { ...userDataBeforeAction };

  expectedUserData.principalStableDebt = userDataBeforeAction.principalStableDebt;

  expectedUserData.principalVariableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );
  expectedUserData.currentStableDebt = expectedUserData.principalStableDebt =
    calcExpectedStableDebtTokenBalance(
      userDataBeforeAction.principalStableDebt,
      userDataBeforeAction.stableBorrowRate,
      userDataBeforeAction.stableRateLastUpdated,
      txTimestamp
    );

  expectedUserData.currentVariableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  expectedUserData.stableRateLastUpdated = txTimestamp;

  expectedUserData.principalVariableDebt = userDataBeforeAction.principalVariableDebt;

  // Stable rate after burn
  expectedUserData.stableBorrowRate = expectedDataAfterAction.averageStableBorrowRate;
  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  return expectedUserData;
};

const calcExpectedScaledATokenBalance = (
  userDataBeforeAction: UserReserveData,
  index: BigNumber,
  amountAdded: BigNumber,
  amountTaken: BigNumber
) => {
  return userDataBeforeAction.scaledATokenBalance
    .add(amountAdded.rayDiv(index))
    .sub(amountTaken.rayDiv(index));
};

export const calcExpectedATokenBalance = (
  reserveData: ReserveData,
  userData: UserReserveData,
  currentTimestamp: BigNumber
) => {
  const index = calcExpectedReserveNormalizedIncome(reserveData, currentTimestamp);

  const { scaledATokenBalance: scaledBalanceBeforeAction } = userData;

  return scaledBalanceBeforeAction.rayMul(index);
};

const calcExpectedAverageStableBorrowRate = (
  avgStableRateBefore: BigNumber,
  totalStableDebtBefore: BigNumber,
  amountChanged: string | BigNumber,
  rate: BigNumber
) => {
  const weightedTotalBorrows = avgStableRateBefore.mul(totalStableDebtBefore);
  const weightedAmountBorrowed = rate.mul(amountChanged);
  const totalBorrowedStable = totalStableDebtBefore.add(amountChanged);

  if (totalBorrowedStable.eq(0)) return BigNumber.from('0');

  return weightedTotalBorrows.add(weightedAmountBorrowed).div(totalBorrowedStable);
};

const calcExpectedAverageStableBorrowRateRebalance = (
  avgStableRateBefore: BigNumber,
  totalStableDebtBefore: BigNumber,
  amountChanged: BigNumber,
  rate: BigNumber
) => {
  const weightedTotalBorrows = avgStableRateBefore.rayMul(totalStableDebtBefore);
  const weightedAmountBorrowed = rate.rayMul(amountChanged.wadToRay());
  const totalBorrowedStable = totalStableDebtBefore.add(amountChanged.wadToRay());

  if (totalBorrowedStable.eq(0)) return BigNumber.from('0');

  return weightedTotalBorrows.add(weightedAmountBorrowed).rayDiv(totalBorrowedStable);
};

export const calcExpectedVariableDebtTokenBalance = (
  reserveData: ReserveData,
  userData: UserReserveData,
  currentTimestamp: BigNumber
) => {
  const normalizedDebt = calcExpectedReserveNormalizedDebt(
    reserveData.variableBorrowRate,
    reserveData.variableBorrowIndex,
    reserveData.lastUpdateTimestamp,
    currentTimestamp
  );

  const { scaledVariableDebt } = userData;

  return scaledVariableDebt.rayMul(normalizedDebt);
};

export const calcExpectedStableDebtTokenBalance = (
  principalStableDebt: BigNumber,
  stableBorrowRate: BigNumber,
  stableRateLastUpdated: BigNumber,
  currentTimestamp: BigNumber
) => {
  if (
    stableBorrowRate.eq(0) ||
    currentTimestamp.eq(stableRateLastUpdated) ||
    stableRateLastUpdated.eq(0)
  ) {
    return principalStableDebt;
  }

  const cumulatedInterest = calcCompoundedInterest(
    stableBorrowRate,
    currentTimestamp,
    stableRateLastUpdated
  );

  return principalStableDebt.rayMul(cumulatedInterest);
};

const calcLinearInterest = (
  rate: BigNumber,
  currentTimestamp: BigNumber,
  lastUpdateTimestamp: BigNumber
) => {
  const timeDifference = currentTimestamp.sub(lastUpdateTimestamp);

  const cumulatedInterest = rate.mul(timeDifference).div(BigNumber.from(ONE_YEAR)).add(RAY);

  return cumulatedInterest;
};

export const calcCompoundedInterest = (
  rate: BigNumber,
  currentTimestamp: BigNumber,
  lastUpdateTimestamp: BigNumber
) => {
  const timeDifference = currentTimestamp.sub(lastUpdateTimestamp);
  const SECONDS_PER_YEAR = BigNumber.from(ONE_YEAR);

  if (timeDifference.eq(0)) {
    return BigNumber.from(RAY);
  }

  const expMinusOne = timeDifference.sub(1);
  const expMinusTwo = timeDifference.gt(2) ? timeDifference.sub(2) : 0;

  const basePowerTwo = rate.rayMul(rate).div(SECONDS_PER_YEAR.mul(SECONDS_PER_YEAR));
  const basePowerThree = basePowerTwo.rayMul(rate).div(SECONDS_PER_YEAR);

  const secondTerm = timeDifference.mul(expMinusOne).mul(basePowerTwo).div(2);
  const thirdTerm = timeDifference.mul(expMinusOne).mul(expMinusTwo).mul(basePowerThree).div(6);

  return BigNumber.from(RAY)
    .add(rate.mul(timeDifference).div(SECONDS_PER_YEAR))
    .add(secondTerm)
    .add(thirdTerm);
};

export const calcExpectedInterestRates = (
  reserveSymbol: string,
  marketStableRate: BigNumber,
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  averageStableBorrowRate: BigNumber,
  availableLiquidity: BigNumber,
  totalLiquidity: BigNumber
): BigNumber[] => {
  const { reservesParams } = configuration;
  const reserveIndex = Object.keys(reservesParams).findIndex((value) => value === reserveSymbol);
  const [, reserveConfiguration] = (Object.entries(reservesParams) as [string, IReserveParams][])[
    reserveIndex
  ];

  const [borrowUsageRatio, supplyUsageRatio] = calcExpectedUsageRatios(
    totalStableDebt,
    totalVariableDebt,
    availableLiquidity,
    totalLiquidity
  );

  let stableBorrowRate: BigNumber = marketStableRate;
  let variableBorrowRate: BigNumber = BigNumber.from(
    reserveConfiguration.strategy.baseVariableBorrowRate
  );

  const OPTIMAL_USAGE_RATIO = BigNumber.from(reserveConfiguration.strategy.optimalUsageRatio);
  const MAX_EXCESS_USAGE_RATIO = BigNumber.from(RAY).sub(OPTIMAL_USAGE_RATIO);
  const OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO = BigNumber.from(
    reserveConfiguration.strategy.optimalStableToTotalDebtRatio
  );
  const MAX_EXCESS_STABLE_TO_TOTAL_DEBT_RATIO = BigNumber.from(RAY).sub(
    OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO
  );

  const totalDebt = totalStableDebt.add(totalVariableDebt);

  const stableToTotalDebtRatio = totalStableDebt.gt(0)
    ? totalStableDebt.rayDiv(totalDebt)
    : BigNumber.from(0);

  if (borrowUsageRatio.gt(OPTIMAL_USAGE_RATIO)) {
    const excessBorrowUsageRatio = borrowUsageRatio
      .sub(reserveConfiguration.strategy.optimalUsageRatio)
      .rayDiv(MAX_EXCESS_USAGE_RATIO);

    stableBorrowRate = stableBorrowRate
      .add(reserveConfiguration.strategy.stableRateSlope1)
      .add(
        BigNumber.from(reserveConfiguration.strategy.stableRateSlope2).rayMul(
          excessBorrowUsageRatio
        )
      );

    variableBorrowRate = variableBorrowRate
      .add(reserveConfiguration.strategy.variableRateSlope1)
      .add(
        BigNumber.from(reserveConfiguration.strategy.variableRateSlope2).rayMul(
          excessBorrowUsageRatio
        )
      );
  } else {
    stableBorrowRate = stableBorrowRate.add(
      BigNumber.from(reserveConfiguration.strategy.stableRateSlope1)
        .rayMul(borrowUsageRatio)
        .rayDiv(BigNumber.from(OPTIMAL_USAGE_RATIO))
    );
    variableBorrowRate = variableBorrowRate.add(
      BigNumber.from(reserveConfiguration.strategy.variableRateSlope1)
        .rayMul(borrowUsageRatio)
        .rayDiv(OPTIMAL_USAGE_RATIO)
    );
  }

  if (stableToTotalDebtRatio.gt(OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO)) {
    const excessStableDebtRatio = stableToTotalDebtRatio
      .sub(OPTIMAL_STABLE_TO_TOTAL_DEBT_RATIO)
      .rayDiv(MAX_EXCESS_STABLE_TO_TOTAL_DEBT_RATIO);
    stableBorrowRate = stableBorrowRate.add(
      BigNumber.from(reserveConfiguration.strategy.stableRateExcessOffset).rayMul(
        excessStableDebtRatio
      )
    );
  }

  const expectedOverallRate = calcExpectedOverallBorrowRate(
    totalStableDebt,
    totalVariableDebt,
    variableBorrowRate,
    averageStableBorrowRate
  );
  const liquidityRate = expectedOverallRate
    .rayMul(supplyUsageRatio)
    .percentMul(BigNumber.from(PERCENTAGE_FACTOR).sub(reserveConfiguration.reserveFactor));

  return [liquidityRate, stableBorrowRate, variableBorrowRate];
};

export const calcExpectedOverallBorrowRate = (
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  currentVariableBorrowRate: BigNumber,
  currentAverageStableBorrowRate: BigNumber
): BigNumber => {
  const totalBorrows = totalStableDebt.add(totalVariableDebt);

  if (totalBorrows.eq(0)) return BigNumber.from(0);

  const weightedVariableRate = totalVariableDebt.wadToRay().rayMul(currentVariableBorrowRate);

  const weightedStableRate = totalStableDebt.wadToRay().rayMul(currentAverageStableBorrowRate);

  const overallBorrowRate = weightedVariableRate
    .add(weightedStableRate)
    .rayDiv(totalBorrows.wadToRay());

  return overallBorrowRate;
};

export const calcExpectedUsageRatios = (
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  availableLiquidity: BigNumber,
  totalLiquidity: BigNumber
): BigNumber[] => {
  const totalDebt = totalStableDebt.add(totalVariableDebt);
  const borrowUsageRatio = totalDebt.eq(0)
    ? BigNumber.from(0)
    : totalDebt.rayDiv(availableLiquidity.add(totalDebt));

  let supplyUsageRatio = totalDebt.eq(0)
    ? BigNumber.from(0)
    : totalDebt.rayDiv(totalLiquidity.add(totalDebt));

  expect(supplyUsageRatio).to.be.lte(borrowUsageRatio, 'Supply usage ratio > borrow usage ratio');

  return [borrowUsageRatio, supplyUsageRatio];
};

export const calcExpectedReserveNormalizedIncome = (
  reserveData: ReserveData,
  currentTimestamp: BigNumber
) => {
  const { liquidityRate, liquidityIndex, lastUpdateTimestamp } = reserveData;

  //if usage ratio is 0, nothing to compound
  if (liquidityRate.eq('0')) {
    return liquidityIndex;
  }

  const cumulatedInterest = calcLinearInterest(
    liquidityRate,
    currentTimestamp,
    lastUpdateTimestamp
  );

  const income = cumulatedInterest.rayMul(liquidityIndex);

  return income;
};

export const calcExpectedReserveNormalizedDebt = (
  variableBorrowRate: BigNumber,
  variableBorrowIndex: BigNumber,
  lastUpdateTimestamp: BigNumber,
  currentTimestamp: BigNumber
) => {
  //if usage ratio is 0, nothing to compound
  if (variableBorrowRate.eq('0')) {
    return variableBorrowIndex;
  }

  const cumulatedInterest = calcCompoundedInterest(
    variableBorrowRate,
    currentTimestamp,
    lastUpdateTimestamp
  );

  const debt = cumulatedInterest.rayMul(variableBorrowIndex);

  return debt;
};

const calcExpectedUserStableRate = (
  balanceBefore: BigNumber,
  rateBefore: BigNumber,
  amount: BigNumber,
  rateNew: BigNumber
) => {
  return balanceBefore.mul(rateBefore).add(amount.mul(rateNew)).div(balanceBefore.add(amount));
};

const calcExpectedLiquidityIndex = (reserveData: ReserveData, timestamp: BigNumber) => {
  //if usage ratio is 0, nothing to compound
  if (reserveData.supplyUsageRatio.eq(0)) {
    return reserveData.liquidityIndex;
  }

  const cumulatedInterest = calcLinearInterest(
    reserveData.liquidityRate,
    timestamp,
    reserveData.lastUpdateTimestamp
  );

  return cumulatedInterest.rayMul(reserveData.liquidityIndex);
};

const calcExpectedVariableBorrowIndex = (reserveData: ReserveData, timestamp: BigNumber) => {
  //if totalVariableDebt is 0, nothing to compound
  if (reserveData.totalVariableDebt.eq('0')) {
    return reserveData.variableBorrowIndex;
  }

  const cumulatedInterest = calcCompoundedInterest(
    reserveData.variableBorrowRate,
    timestamp,
    reserveData.lastUpdateTimestamp
  );

  return cumulatedInterest.rayMul(reserveData.variableBorrowIndex);
};

const calcExpectedTotalStableDebt = (
  principalStableDebt: BigNumber,
  averageStableBorrowRate: BigNumber,
  lastUpdateTimestamp: BigNumber,
  currentTimestamp: BigNumber
) => {
  const cumulatedInterest = calcCompoundedInterest(
    averageStableBorrowRate,
    currentTimestamp,
    lastUpdateTimestamp
  );

  return cumulatedInterest.rayMul(principalStableDebt);
};

const calcExpectedTotalVariableDebt = (
  reserveData: ReserveData,
  expectedVariableDebtIndex: BigNumber
) => {
  return reserveData.scaledVariableDebt.rayMul(expectedVariableDebtIndex);
};

const calcExpectedAccrueToTreasury = (reserveData: ReserveData, nextReserveData: ReserveData) => {
  const reserveFactor = reserveData.reserveFactor;
  if (reserveFactor.eq(0)) {
    return reserveData.accruedToTreasuryScaled;
  }

  const prevTotalVariableDebt = reserveData.scaledVariableDebt.rayMul(
    reserveData.variableBorrowIndex
  );

  const currTotalVariableDebt = nextReserveData.scaledVariableDebt.rayMul(
    nextReserveData.variableBorrowIndex
  );

  // Be aware that the ordering in the calcCompoundInterest is NOT the same as the solidity `calculateCompoundedInterest`
  const cumulatedStableInterest = calcCompoundedInterest(
    reserveData.averageStableBorrowRate,
    reserveData.lastUpdateTimestamp,
    reserveData.totalStableDebtLastUpdated
  );

  const prevTotalStableDebt = reserveData.principalStableDebt.rayMul(cumulatedStableInterest);

  const totalDebtAccrued = currTotalVariableDebt
    .add(nextReserveData.totalStableDebt)
    .sub(prevTotalVariableDebt)
    .sub(prevTotalStableDebt);

  const amountToMint = totalDebtAccrued.percentMul(reserveFactor);

  if (amountToMint.gt(0)) {
    return reserveData.accruedToTreasuryScaled.add(
      amountToMint.rayDiv(nextReserveData.liquidityIndex)
    );
  } else {
    return reserveData.accruedToTreasuryScaled;
  }
};

const updateState = (
  reserveDataBeforeAction: ReserveData,
  expectedReserveData: ReserveData,
  txTimestamp: BigNumber
) => {
  // Update indexes
  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  // Update debts
  expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
    reserveDataBeforeAction.principalStableDebt,
    reserveDataBeforeAction.averageStableBorrowRate,
    reserveDataBeforeAction.totalStableDebtLastUpdated,
    txTimestamp
  );
  expectedReserveData.totalVariableDebt = calcExpectedTotalVariableDebt(
    reserveDataBeforeAction,
    expectedReserveData.variableBorrowIndex
  );

  expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt;
  expectedReserveData.principalStableDebt = reserveDataBeforeAction.principalStableDebt;

  // Accrue to treasury
  expectedReserveData.accruedToTreasuryScaled = calcExpectedAccrueToTreasury(
    reserveDataBeforeAction,
    expectedReserveData
  );
};

const updateLiquidityAndUsageRatios = (
  reserveDataBeforeAction: ReserveData,
  expectedReserveData: ReserveData,
  liquidityAdded: BigNumber,
  liquidityTaken: BigNumber
) => {
  expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity
    .add(liquidityAdded)
    .sub(liquidityTaken);

  expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity.add(
    expectedReserveData.unbacked
  );

  [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
    calcExpectedUsageRatios(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );
};

const updateTotalLiquidityAndUsageRatio = (expectedReserveData: ReserveData) => {
  expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity.add(
    expectedReserveData.unbacked
  );

  [expectedReserveData.borrowUsageRatio, expectedReserveData.supplyUsageRatio] =
    calcExpectedUsageRatios(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.availableLiquidity,
      expectedReserveData.totalLiquidity
    );
};
