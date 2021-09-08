// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {Pool} from '../protocol/pool/Pool.sol';
import {PoolAddressesProvider} from '../protocol/configuration/PoolAddressesProvider.sol';
import {PoolConfigurator} from '../protocol/pool/PoolConfigurator.sol';
import {AToken} from '../protocol/tokenization/AToken.sol';
import {
  DefaultReserveInterestRateStrategy
} from '../protocol/pool/DefaultReserveInterestRateStrategy.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';

contract ATokensAndRatesHelper is Ownable {
  address payable private pool;
  address private addressesProvider;
  address private poolConfigurator;
  event deployedContracts(address aToken, address strategy);

  struct InitDeploymentInput {
    address asset;
    uint256[6] rates;
  }

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

  constructor(
    address payable _pool,
    address _addressesProvider,
    address _poolConfigurator
  ) {
    pool = _pool;
    addressesProvider = _addressesProvider;
    poolConfigurator = _poolConfigurator;
  }

  function configureReserves(ConfigureReserveInput[] calldata inputParams) external onlyOwner {
    PoolConfigurator configurator = PoolConfigurator(poolConfigurator);
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
