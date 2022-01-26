pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "../../contracts/protocol/lendingpool/LendingPool.sol";

contract LendingPoolHarness is LendingPool {

  function ercBalanceOf(address a) public returns (uint256) {
    return a.balance;
  }

  function init_state() public {}

  function getATokenAddress(address asset) public returns (address) {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    return address(reserve.aTokenAddress);
  }

  function getVariableDebtTokenAddress(address asset) public returns (address) {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    return address(reserve.variableDebtTokenAddress);
  }


  function getStableDebtTokenAddress(address asset) public returns (address) {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    return address(reserve.stableDebtTokenAddress);
  }


  function getBalanceInToken(address token, address account) public returns (uint256)  {
    return IERC20(token).balanceOf(account);
  }

  function getTotalSupply(address token) public returns (uint256)  {
    return IERC20(token).totalSupply();
  }


  function getSystemBalanceInAsset(address asset) public view returns (uint256)  {
    return IERC20(asset).balanceOf(_reserves[asset].aTokenAddress);
  }

  function getReserveliquidityIndex(address asset) external view returns (uint256) {
    return _reserves[asset].getNormalizedIncome();
  }

  function isFreezed(address asset) external view returns (bool) {
    (bool isActive, bool isFreezed, ,) = _reserves[asset].configuration.getFlags();
    return isFreezed;
  }

  function isActive(address asset) external view returns (bool)  {
    (bool isActive, bool isFreezed, ,) = _reserves[asset].configuration.getFlags();
    return isActive;
  }


  function getHealthFactor(address account) external view returns (uint256) {

    uint256 totalCollateralETH;
    uint256 totalBorrowsETH;
    uint256 ltv;
    uint256 currentLiquidationThreshold;
    uint256 healthFactor;
    (
    totalCollateralETH,
    totalBorrowsETH,
    ltv,
    currentLiquidationThreshold,
    healthFactor
    ) = GenericLogic.calculateUserAccountData(
      account,
      _reserves,
      _usersConfig[account],
      _reservesList,
      _reservesCount,
      _addressesProvider.getPriceOracle()
    );

    return healthFactor;
  }

  mapping(uint256 => uint256) private reserveNormalizedIncome;

  function getReserveNormalizedIncome(address asset) external override view returns (uint256) {
    require(reserveNormalizedIncome[block.timestamp] == 1e27);
    return reserveNormalizedIncome[block.timestamp];
  }

}
