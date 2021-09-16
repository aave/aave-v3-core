// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {PoolConfigurator} from '../protocol/pool/PoolConfigurator.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';

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
