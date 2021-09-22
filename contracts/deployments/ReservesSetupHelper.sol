// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {PoolConfigurator} from '../protocol/pool/PoolConfigurator.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';

/**
 * @title ReservesSetupHelper
 * @author Aave
 * @notice Deployment helper to setup the assets risk parameters at PoolConfigurator in batch.
 * @dev The Pool admin or risk admin must transfer the ownership to ReservesSetupHelper before calling to setOracleBorrowRates.
 * @dev The ReservesSetupHelper is an Ownable contract, so only the deployer or future owners can call this contract.
 */
contract ReservesSetupHelper is Ownable {
  struct ConfigureReserveInput {
    address asset;
    uint256 baseLTV;
    uint256 liquidationThreshold;
    uint256 liquidationBonus;
    uint256 reserveFactor;
    uint256 borrowCap;
    uint256 supplyCap;
    bool stableBorrowingEnabled;
    bool borrowingEnabled;
  }

  /**
   * @notice External function called by the owner account to setup the assets risk parameters in batch.
   * @param configurator The address of PoolConfigurator contract
   * @param inputParams An array of ConfigureReserveInput struct that contains the assets and their risk parameters
   */
  function configureReserves(
    PoolConfigurator configurator,
    ConfigureReserveInput[] calldata inputParams
  ) external onlyOwner {
    for (uint256 i = 0; i < inputParams.length; i++) {
      configurator.configureReserveAsCollateral(
        inputParams[i].asset,
        inputParams[i].baseLTV,
        inputParams[i].liquidationThreshold,
        inputParams[i].liquidationBonus
      );

      if (inputParams[i].borrowingEnabled) {
        configurator.enableBorrowingOnReserve(
          inputParams[i].asset,
          inputParams[i].borrowCap,
          inputParams[i].stableBorrowingEnabled
        );
      }
      configurator.setSupplyCap(inputParams[i].asset, inputParams[i].supplyCap);
      configurator.setReserveFactor(inputParams[i].asset, inputParams[i].reserveFactor);
    }
  }
}
