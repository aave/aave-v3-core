// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IERC20Detailed} from '../dependencies/openzeppelin/contracts/IERC20Detailed.sol';
import {IPoolAddressesProvider} from '../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../interfaces/IPool.sol';
import {IStableDebtToken} from '../interfaces/IStableDebtToken.sol';
import {IVariableDebtToken} from '../interfaces/IVariableDebtToken.sol';
import {ReserveConfiguration} from '../protocol/libraries/configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
import {WadRayMath} from '../protocol/libraries/math/WadRayMath.sol';
import {MathUtils} from '../protocol/libraries/math/MathUtils.sol';

contract AaveProtocolDataProvider {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using WadRayMath for uint256;

  address constant MKR = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2;
  address constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

  struct TokenData {
    string symbol;
    address tokenAddress;
  }

  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

  constructor(IPoolAddressesProvider addressesProvider) public {
    ADDRESSES_PROVIDER = addressesProvider;
  }

  function getAllReservesTokens() external view returns (TokenData[] memory) {
    IPool pool = IPool(ADDRESSES_PROVIDER.getPool());
    address[] memory reserves = pool.getReservesList();
    TokenData[] memory reservesTokens = new TokenData[](reserves.length);
    for (uint256 i = 0; i < reserves.length; i++) {
      if (reserves[i] == MKR) {
        reservesTokens[i] = TokenData({symbol: 'MKR', tokenAddress: reserves[i]});
        continue;
      }
      if (reserves[i] == ETH) {
        reservesTokens[i] = TokenData({symbol: 'ETH', tokenAddress: reserves[i]});
        continue;
      }
      reservesTokens[i] = TokenData({
        symbol: IERC20Detailed(reserves[i]).symbol(),
        tokenAddress: reserves[i]
      });
    }
    return reservesTokens;
  }

  function getAllATokens() external view returns (TokenData[] memory) {
    IPool pool = IPool(ADDRESSES_PROVIDER.getPool());
    address[] memory reserves = pool.getReservesList();
    TokenData[] memory aTokens = new TokenData[](reserves.length);
    for (uint256 i = 0; i < reserves.length; i++) {
      DataTypes.ReserveData memory reserveData = pool.getReserveData(reserves[i]);
      aTokens[i] = TokenData({
        symbol: IERC20Detailed(reserveData.aTokenAddress).symbol(),
        tokenAddress: reserveData.aTokenAddress
      });
    }
    return aTokens;
  }

  // not returning borrow and supply caps for compatibility, nor pause flag
  function getReserveConfigurationData(address asset)
    external
    view
    returns (
      uint256 decimals,
      uint256 ltv,
      uint256 liquidationThreshold,
      uint256 liquidationBonus,
      uint256 reserveFactor,
      bool usageAsCollateralEnabled,
      bool borrowingEnabled,
      bool stableBorrowRateEnabled,
      bool isActive,
      bool isFrozen
    )
  {
    DataTypes.ReserveConfigurationMap memory configuration =
      IPool(ADDRESSES_PROVIDER.getPool()).getConfiguration(asset);

    (ltv, liquidationThreshold, liquidationBonus, decimals, reserveFactor) = configuration
      .getParamsMemory();

    (isActive, isFrozen, borrowingEnabled, stableBorrowRateEnabled, ) = configuration
      .getFlagsMemory();

    usageAsCollateralEnabled = liquidationThreshold > 0;
  }

  function getReserveCaps(address asset)
    external
    view
    returns (uint256 borrowCap, uint256 supplyCap)
  {
    (borrowCap, supplyCap) = IPool(ADDRESSES_PROVIDER.getPool())
      .getConfiguration(asset)
      .getCapsMemory();
  }

  function getPaused(address asset) external view returns (bool isPaused) {
    (, , , , isPaused) = IPool(ADDRESSES_PROVIDER.getPool())
      .getConfiguration(asset)
      .getFlagsMemory();
  }

  function getReserveData(address asset)
    external
    view
    returns (
      uint256 availableLiquidity,
      uint256 totalStableDebt,
      uint256 totalVariableDebt,
      uint256 liquidityRate,
      uint256 variableBorrowRate,
      uint256 stableBorrowRate,
      uint256 averageStableBorrowRate,
      uint256 liquidityIndex,
      uint256 variableBorrowIndex,
      uint40 lastUpdateTimestamp
    )
  {
    DataTypes.ReserveData memory reserve =
      IPool(ADDRESSES_PROVIDER.getPool()).getReserveData(asset);

    /*    uint256 cumulatedLiquidityInterest = MathUtils.calculateLinearInterest(
      reserve.currentLiquidityRate,
      reserve.lastUpdateTimestamp
    );
    uint256 nextLiquidityIndex = cumulatedLiquidityInterest.rayMul(reserve.liquidityIndex);*/

    // TODO: We need to update here. The accrued is not computed totally right
    uint256 aLiq = IERC20Detailed(reserve.aTokenAddress).totalSupply();
    aLiq = aLiq + reserve.accruedToTreasury.rayMul(reserve.liquidityIndex);
    aLiq = aLiq - IERC20Detailed(reserve.stableDebtTokenAddress).totalSupply();
    aLiq = aLiq - IERC20Detailed(reserve.variableDebtTokenAddress).totalSupply();

    return (
      aLiq, //IERC20Detailed(asset).balanceOf(reserve.aTokenAddress),
      IERC20Detailed(reserve.stableDebtTokenAddress).totalSupply(),
      IERC20Detailed(reserve.variableDebtTokenAddress).totalSupply(),
      reserve.currentLiquidityRate,
      reserve.currentVariableBorrowRate,
      reserve.currentStableBorrowRate,
      IStableDebtToken(reserve.stableDebtTokenAddress).getAverageStableRate(),
      reserve.liquidityIndex,
      reserve.variableBorrowIndex,
      reserve.lastUpdateTimestamp
    );
  }

  function getUserReserveData(address asset, address user)
    external
    view
    returns (
      uint256 currentATokenBalance,
      uint256 currentStableDebt,
      uint256 currentVariableDebt,
      uint256 principalStableDebt,
      uint256 scaledVariableDebt,
      uint256 stableBorrowRate,
      uint256 liquidityRate,
      uint40 stableRateLastUpdated,
      bool usageAsCollateralEnabled
    )
  {
    DataTypes.ReserveData memory reserve =
      IPool(ADDRESSES_PROVIDER.getPool()).getReserveData(asset);

    DataTypes.UserConfigurationMap memory userConfig =
      IPool(ADDRESSES_PROVIDER.getPool()).getUserConfiguration(user);

    currentATokenBalance = IERC20Detailed(reserve.aTokenAddress).balanceOf(user);
    currentVariableDebt = IERC20Detailed(reserve.variableDebtTokenAddress).balanceOf(user);
    currentStableDebt = IERC20Detailed(reserve.stableDebtTokenAddress).balanceOf(user);
    principalStableDebt = IStableDebtToken(reserve.stableDebtTokenAddress).principalBalanceOf(user);
    scaledVariableDebt = IVariableDebtToken(reserve.variableDebtTokenAddress).scaledBalanceOf(user);
    liquidityRate = reserve.currentLiquidityRate;
    stableBorrowRate = IStableDebtToken(reserve.stableDebtTokenAddress).getUserStableRate(user);
    stableRateLastUpdated = IStableDebtToken(reserve.stableDebtTokenAddress).getUserLastUpdated(
      user
    );
    usageAsCollateralEnabled = userConfig.isUsingAsCollateral(reserve.id);
  }

  function getReserveTokensAddresses(address asset)
    external
    view
    returns (
      address aTokenAddress,
      address stableDebtTokenAddress,
      address variableDebtTokenAddress
    )
  {
    DataTypes.ReserveData memory reserve =
      IPool(ADDRESSES_PROVIDER.getPool()).getReserveData(asset);

    return (
      reserve.aTokenAddress,
      reserve.stableDebtTokenAddress,
      reserve.variableDebtTokenAddress
    );
  }
}
