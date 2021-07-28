// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IAaveIncentivesController} from '../../interfaces/IAaveIncentivesController.sol';

interface IUiPoolDataProvider {
  struct AggregatedReserveData {
    address underlyingAsset;
    string name;
    string symbol;
    uint256 decimals;
    uint256 baseLTVasCollateral;
    uint256 reserveLiquidationThreshold;
    uint256 reserveLiquidationBonus;
    uint256 reserveFactor;
    uint256 borrowCap;
    uint256 supplyCap;
    bool usageAsCollateralEnabled;
    bool borrowingEnabled;
    bool stableBorrowRateEnabled;
    bool isActive;
    bool isFrozen;
    bool isPaused;
    // base data
    uint128 liquidityIndex;
    uint128 variableBorrowIndex;
    uint128 liquidityRate;
    uint128 variableBorrowRate;
    uint128 stableBorrowRate;
    uint40 lastUpdateTimestamp;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    //
    uint256 availableLiquidity;
    uint256 totalPrincipalStableDebt;
    uint256 averageStableRate;
    uint256 stableDebtLastUpdateTimestamp;
    uint256 totalScaledVariableDebt;
    uint256 priceInEth;
    uint256 variableRateSlope1;
    uint256 variableRateSlope2;
    uint256 stableRateSlope1;
    uint256 stableRateSlope2;
    // incentives
    uint256 aEmissionPerSecond;
    uint256 vEmissionPerSecond;
    uint256 sEmissionPerSecond;
    uint256 aIncentivesLastUpdateTimestamp;
    uint256 vIncentivesLastUpdateTimestamp;
    uint256 sIncentivesLastUpdateTimestamp;
    uint256 aTokenIncentivesIndex;
    uint256 vTokenIncentivesIndex;
    uint256 sTokenIncentivesIndex;
  }

  struct UserReserveData {
    address underlyingAsset;
    uint256 scaledATokenBalance;
    bool usageAsCollateralEnabledOnUser;
    uint256 stableBorrowRate;
    uint256 scaledVariableDebt;
    uint256 principalStableDebt;
    uint256 stableBorrowLastUpdateTimestamp;
    // incentives
    uint256 aTokenincentivesUserIndex;
    uint256 vTokenincentivesUserIndex;
    uint256 sTokenincentivesUserIndex;
  }

  function getReservesData(IPoolAddressesProvider provider, address user)
    external
    view
    returns (
      AggregatedReserveData[] memory,
      UserReserveData[] memory,
      uint256,
      uint256
    );
}
