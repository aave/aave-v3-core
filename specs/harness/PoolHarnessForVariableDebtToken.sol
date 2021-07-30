pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IPool} from '../../contracts/interfaces/IPool.sol';
import {Pool} from '../../contracts/protocol/pool/Pool.sol';
import {
  IPoolAddressesProvider
} from '../../contracts/interfaces/IPoolAddressesProvider.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';

/*
Certora: Harness that delegates calls to the original Pool.
Used for the verification of the VariableDebtToken contract.
*/
contract PoolHarnessForVariableDebtToken is IPool {
  Pool private originalPool;

  function deposit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override {
    originalPool.deposit(asset, amount, onBehalfOf, referralCode);
  }

  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external override returns (uint256) {
    return originalPool.withdraw(asset, amount, to);
  }

  function borrow(
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    uint16 referralCode,
    address onBehalfOf
  ) external override {
    originalPool.borrow(asset, amount, interestRateMode, referralCode, onBehalfOf);
  }

  function repay(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) external override returns (uint256) {
    return originalPool.repay(asset, amount, rateMode, onBehalfOf);
  }

  function swapBorrowRateMode(address asset, uint256 rateMode) external override {
    originalPool.swapBorrowRateMode(asset, rateMode);
  }

  function rebalanceStableBorrowRate(address asset, address user) external override {
    originalPool.rebalanceStableBorrowRate(asset, user);
  }

  function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external override {
    originalPool.setUserUseReserveAsCollateral(asset, useAsCollateral);
  }

  function liquidationCall(
    address collateral,
    address asset,
    address user,
    uint256 debtToCover,
    bool receiveAToken
  ) external override {
    originalPool.liquidationCall(collateral, asset, user, debtToCover, receiveAToken);
  }

  function getReservesList() external view override returns (address[] memory) {
    return originalPool.getReservesList();
  }

  function getReserveData(address asset)
    external
    view
    override
    returns (DataTypes.ReserveData memory)
  {
    return originalPool.getReserveData(asset);
  }

  function getUserConfiguration(address user)
    external
    view
    override
    returns (DataTypes.UserConfigurationMap memory)
  {
    return originalPool.getUserConfiguration(user);
  }

  function getUserAccountData(address user)
    external
    view
    override
    returns (
      uint256 totalCollateralBase,
      uint256 totalDebtBase,
      uint256 availableBorrowsBase,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor
    )
  {
    return originalPool.getUserAccountData(user);
  }

  function initReserve(
    address asset,
    address aTokenAddress,
    address stableDebtAddress,
    address variableDebtAddress,
    address interestRateStrategyAddress
  ) external override {
    originalPool.initReserve(
      asset,
      aTokenAddress,
      stableDebtAddress,
      variableDebtAddress,
      interestRateStrategyAddress
    );
  }

  function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
    external
    override
  {
    originalPool.setReserveInterestRateStrategyAddress(asset, rateStrategyAddress);
  }

  function setConfiguration(address asset, uint256 configuration) external override {
    originalPool.setConfiguration(asset, configuration);
  }

  function getConfiguration(address asset)
    external
    view
    override
    returns (DataTypes.ReserveConfigurationMap memory)
  {
    return originalPool.getConfiguration(asset);
  }

  mapping(uint256 => uint256) private reserveNormalizedIncome;

  function getReserveNormalizedIncome(address asset) external view override returns (uint256) {
    require(reserveNormalizedIncome[block.timestamp] == 1e27);
    return reserveNormalizedIncome[block.timestamp];
  }

  mapping(uint256 => uint256) private reserveNormalizedVariableDebt;

  function getReserveNormalizedVariableDebt(address asset)
    external
    view
    override
    returns (uint256)
  {
    require(reserveNormalizedVariableDebt[block.timestamp] == 1e27);
    return reserveNormalizedVariableDebt[block.timestamp];
  }

  function setPause(bool val) external override {
    originalPool.setPause(val);
  }

  function paused() external view override returns (bool) {
    return originalPool.paused();
  }

  function flashLoan(
    address receiver,
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata modes,
    address onBehalfOf,
    bytes calldata params,
    uint16 referralCode
  ) external override {
    originalPool.flashLoan(receiver, assets, amounts, modes, onBehalfOf, params, referralCode);
  }

  function finalizeTransfer(
    address asset,
    address from,
    address to,
    uint256 amount,
    uint256 balanceFromAfter,
    uint256 balanceToBefore
  ) external override {
    originalPool.finalizeTransfer(asset, from, to, amount, balanceFromAfter, balanceToBefore);
  }

  function getAddressesProvider() external view override returns (IPoolAddressesProvider) {
    return originalPool.getAddressesProvider();
  }
}
