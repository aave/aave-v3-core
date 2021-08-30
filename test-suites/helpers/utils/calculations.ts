import { ONE_YEAR, RAY, MAX_UINT_AMOUNT, PERCENTAGE_FACTOR } from '../../../helpers/constants';
import {
  IReserveParams,
  iMultiPoolsAssets,
  iAavePoolAssets,
  RateMode,
} from '../../../helpers/types';
import './wadraymath';
import { ReserveData, UserReserveData } from './interfaces';
import { BigNumber } from 'ethers';

export const strToBN = (amount: string): BigNumber => BigNumber.from(amount);

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

  expectedReserveData.address = reserveDataBeforeAction.address;

  expectedReserveData.totalLiquidity = BigNumber.from(reserveDataBeforeAction.totalLiquidity).add(
    amountDeposited
  );
  expectedReserveData.availableLiquidity = BigNumber.from(
    reserveDataBeforeAction.availableLiquidity
  ).add(amountDeposited);

  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

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

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.totalLiquidity
  );
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterWithdraw = (
  amountWithdrawn: string,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  if (amountWithdrawn == MAX_UINT_AMOUNT) {
    amountWithdrawn = calcExpectedATokenBalance(
      reserveDataBeforeAction,
      userDataBeforeAction,
      txTimestamp
    ).toString();
  }

  expectedReserveData.availableLiquidity = BigNumber.from(
    reserveDataBeforeAction.availableLiquidity
  ).sub(amountWithdrawn);

  expectedReserveData.principalStableDebt = reserveDataBeforeAction.principalStableDebt;
  expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt;

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
    reserveDataBeforeAction.principalStableDebt,
    reserveDataBeforeAction.averageStableBorrowRate,
    reserveDataBeforeAction.totalStableDebtLastUpdated,
    txTimestamp
  );
  expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
    expectedReserveData.variableBorrowIndex
  );

  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;

  expectedReserveData.totalLiquidity = BigNumber.from(reserveDataBeforeAction.availableLiquidity)
    .sub(amountWithdrawn)
    .add(expectedReserveData.totalVariableDebt)
    .add(expectedReserveData.totalStableDebt);

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.totalLiquidity
  );
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

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
  const expectedReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  const amountBorrowedBN = BigNumber.from(amountBorrowed);

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.availableLiquidity =
    reserveDataBeforeAction.availableLiquidity.sub(amountBorrowedBN);

  expectedReserveData.lastUpdateTimestamp = txTimestamp;

  if (borrowRateMode == RateMode.Stable) {
    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt;

    const expectedVariableDebtAfterTx = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );

    const expectedStableDebtUntilTx = calcExpectedTotalStableDebt(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      txTimestamp
    );

    expectedReserveData.principalStableDebt = expectedStableDebtUntilTx.add(amountBorrowedBN);

    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      expectedStableDebtUntilTx,
      amountBorrowedBN,
      reserveDataBeforeAction.stableBorrowRate
    );

    const totalLiquidityAfterTx = expectedReserveData.availableLiquidity
      .add(expectedReserveData.principalStableDebt)
      .add(expectedVariableDebtAfterTx);

    const utilizationRateAfterTx = calcExpectedUtilizationRate(
      expectedReserveData.principalStableDebt, //the expected principal debt is the total debt immediately after the tx
      expectedVariableDebtAfterTx,
      totalLiquidityAfterTx
    );

    const ratesAfterTx = calcExpectedInterestRates(
      reserveDataBeforeAction.symbol,
      reserveDataBeforeAction.marketStableRate,
      utilizationRateAfterTx,
      expectedReserveData.principalStableDebt,
      expectedVariableDebtAfterTx,
      expectedReserveData.averageStableBorrowRate
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

    expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
      .add(expectedReserveData.totalVariableDebt)
      .add(expectedReserveData.totalStableDebt);

    expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
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

    const utilizationRateAfterTx = calcExpectedUtilizationRate(
      totalStableDebtAfterTx,
      totalVariableDebtAfterTx,
      expectedReserveData.availableLiquidity
        .add(totalStableDebtAfterTx)
        .add(totalVariableDebtAfterTx)
    );

    const rates = calcExpectedInterestRates(
      reserveDataBeforeAction.symbol,
      reserveDataBeforeAction.marketStableRate,
      utilizationRateAfterTx,
      totalStableDebtAfterTx,
      totalVariableDebtAfterTx,
      expectedReserveData.averageStableBorrowRate
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

    expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
      .add(expectedReserveData.totalStableDebt)
      .add(expectedReserveData.totalVariableDebt);

    expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
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

  expectedReserveData.address = reserveDataBeforeAction.address;

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

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
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

    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt;

    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );
  } else {
    expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt.sub(
      amountRepaidBN.rayDiv(expectedReserveData.variableBorrowIndex)
    );

    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );

    expectedReserveData.principalStableDebt = reserveDataBeforeAction.principalStableDebt;
    expectedReserveData.totalStableDebt = reserveDataBeforeAction.totalStableDebt;

    expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  }

  expectedReserveData.availableLiquidity =
    reserveDataBeforeAction.availableLiquidity.add(amountRepaidBN);

  expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
    .add(expectedReserveData.totalStableDebt)
    .add(expectedReserveData.totalVariableDebt);

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.lastUpdateTimestamp = txTimestamp;

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

  expectedReserveData.address = reserveDataBeforeAction.address;

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

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity;

  const totalStableDebtUntilTx = calcExpectedTotalStableDebt(
    reserveDataBeforeAction.principalStableDebt,
    reserveDataBeforeAction.averageStableBorrowRate,
    reserveDataBeforeAction.totalStableDebtLastUpdated,
    txTimestamp
  );

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

  expectedReserveData.totalLiquidity = reserveDataBeforeAction.availableLiquidity
    .add(expectedReserveData.totalStableDebt)
    .add(expectedReserveData.totalVariableDebt);

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

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

  expectedReserveData.address = reserveDataBeforeAction.address;

  const userStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBeforeAction.principalStableDebt,
    userDataBeforeAction.stableBorrowRate,
    userDataBeforeAction.stableRateLastUpdated,
    txTimestamp
  );

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedReserveData.scaledVariableDebt = reserveDataBeforeAction.scaledVariableDebt;
  expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
    expectedReserveData.variableBorrowIndex
  );

  expectedReserveData.principalStableDebt = expectedReserveData.totalStableDebt =
    calcExpectedTotalStableDebt(
      reserveDataBeforeAction.principalStableDebt,
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalStableDebtLastUpdated,
      txTimestamp
    );

  expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity;

  expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
    .add(expectedReserveData.totalStableDebt)
    .add(expectedReserveData.totalVariableDebt);

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

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate
  );

  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

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

  if (timeDifference.eq(0)) {
    return BigNumber.from(RAY);
  }

  const expMinusOne = timeDifference.sub(1);
  const expMinusTwo = timeDifference.gt(2) ? timeDifference.sub(2) : 0;

  const ratePerSecond = rate.div(ONE_YEAR);

  const basePowerTwo = ratePerSecond.rayMul(ratePerSecond);
  const basePowerThree = basePowerTwo.rayMul(ratePerSecond);

  const secondTerm = timeDifference.mul(expMinusOne).mul(basePowerTwo).div(2);
  const thirdTerm = timeDifference.mul(expMinusOne).mul(expMinusTwo).mul(basePowerThree).div(6);

  return BigNumber.from(RAY).add(ratePerSecond.mul(timeDifference)).add(secondTerm).add(thirdTerm);
};

export const calcExpectedInterestRates = (
  reserveSymbol: string,
  marketStableRate: BigNumber,
  utilizationRate: BigNumber,
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  averageStableBorrowRate: BigNumber
): BigNumber[] => {
  const { reservesParams } = configuration;

  const reserveIndex = Object.keys(reservesParams).findIndex((value) => value === reserveSymbol);
  const [, reserveConfiguration] = (Object.entries(reservesParams) as [string, IReserveParams][])[
    reserveIndex
  ];

  let stableBorrowRate: BigNumber = marketStableRate;
  let variableBorrowRate: BigNumber = BigNumber.from(
    reserveConfiguration.strategy.baseVariableBorrowRate
  );

  const optimalRate = BigNumber.from(reserveConfiguration.strategy.optimalUtilizationRate);
  const excessRate = BigNumber.from(RAY).sub(optimalRate);
  if (utilizationRate.gt(optimalRate)) {
    const excessUtilizationRateRatio = utilizationRate
      .sub(reserveConfiguration.strategy.optimalUtilizationRate)
      .rayDiv(excessRate);

    stableBorrowRate = stableBorrowRate
      .add(reserveConfiguration.strategy.stableRateSlope1)
      .add(
        BigNumber.from(reserveConfiguration.strategy.stableRateSlope2).rayMul(
          excessUtilizationRateRatio
        )
      );

    variableBorrowRate = variableBorrowRate
      .add(reserveConfiguration.strategy.variableRateSlope1)
      .add(
        BigNumber.from(reserveConfiguration.strategy.variableRateSlope2).rayMul(
          excessUtilizationRateRatio
        )
      );
  } else {
    stableBorrowRate = stableBorrowRate.add(
      BigNumber.from(reserveConfiguration.strategy.stableRateSlope1).rayMul(
        utilizationRate.rayDiv(BigNumber.from(optimalRate))
      )
    );

    variableBorrowRate = variableBorrowRate.add(
      utilizationRate
        .rayDiv(optimalRate)
        .rayMul(BigNumber.from(reserveConfiguration.strategy.variableRateSlope1))
    );
  }

  const expectedOverallRate = calcExpectedOverallBorrowRate(
    totalStableDebt,
    totalVariableDebt,
    variableBorrowRate,
    averageStableBorrowRate
  );
  const liquidityRate = expectedOverallRate
    .rayMul(utilizationRate)
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

  if (totalBorrows.eq(0)) return strToBN('0');

  const weightedVariableRate = totalVariableDebt.wadToRay().rayMul(currentVariableBorrowRate);

  const weightedStableRate = totalStableDebt.wadToRay().rayMul(currentAverageStableBorrowRate);

  const overallBorrowRate = weightedVariableRate
    .add(weightedStableRate)
    .rayDiv(totalBorrows.wadToRay());

  return overallBorrowRate;
};

export const calcExpectedUtilizationRate = (
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  totalLiquidity: BigNumber
): BigNumber => {
  if (totalStableDebt.eq('0') && totalVariableDebt.eq('0')) {
    return strToBN('0');
  }

  const utilization = totalStableDebt.add(totalVariableDebt).rayDiv(totalLiquidity);

  return utilization;
};

const calcExpectedReserveNormalizedIncome = (
  reserveData: ReserveData,
  currentTimestamp: BigNumber
) => {
  const { liquidityRate, liquidityIndex, lastUpdateTimestamp } = reserveData;

  //if utilization rate is 0, nothing to compound
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

const calcExpectedReserveNormalizedDebt = (
  variableBorrowRate: BigNumber,
  variableBorrowIndex: BigNumber,
  lastUpdateTimestamp: BigNumber,
  currentTimestamp: BigNumber
) => {
  //if utilization rate is 0, nothing to compound
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
  //if utilization rate is 0, nothing to compound
  if (reserveData.utilizationRate.eq('0')) {
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
