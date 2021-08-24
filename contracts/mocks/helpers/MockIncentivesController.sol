// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IAaveIncentivesController} from './../../interfaces/IAaveIncentivesController.sol';

import 'hardhat/console.sol';

contract MockIncentivesController is IAaveIncentivesController {
  function getAssetData(address asset)
    external
    view
    override
    returns (
      uint256,
      uint256,
      uint256
    )
  {
    return (0, 0, 0);
  }

  function setClaimer(address user, address claimer) external override {}

  function getClaimer(address user) external view override returns (address) {
    return address(1);
  }

  function configureAssets(address[] calldata assets, uint256[] calldata emissionsPerSecond)
    external
    override
  {}

  function handleAction(
    address asset,
    uint256 userBalance,
    uint256 totalSupply
  ) external override {}

  function getRewardsBalance(address[] calldata assets, address user)
    external
    view
    override
    returns (uint256)
  {
    return 0;
  }

  function claimRewards(
    address[] calldata assets,
    uint256 amount,
    address user
  ) external view override returns (uint256) {
    return 0;
  }

  function claimRewardsOnBehalf(
    address[] calldata assets,
    uint256 amount,
    address user,
    address to
  ) external view override returns (uint256) {
    return 0;
  }

  function getUserUnclaimedRewards(address user) external view override returns (uint256) {
    return 0;
  }

  function getUserAssetData(address user, address asset) external view override returns (uint256) {
    return 0;
  }

  function REWARD_TOKEN() external view override returns (address) {
    return address(0);
  }

  function PRECISION() external view override returns (uint8) {
    return 0;
  }
}
