// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {RateOracle} from '../mocks/oracle/RateOracle.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';

contract RateOracleSetupHelper is Ownable {
  function setOracleBorrowRates(
    address[] calldata assets,
    uint256[] calldata rates,
    address oracle
  ) external onlyOwner {
    require(assets.length == rates.length, 'Arrays not same length');

    for (uint256 i = 0; i < assets.length; i++) {
      // RateOracle owner must be this contract
      RateOracle(oracle).setMarketBorrowRate(assets[i], rates[i]);
    }
  }

  function setOracleOwnership(address oracle, address admin) external onlyOwner {
    require(admin != address(0), 'owner can not be zero');
    require(RateOracle(oracle).owner() == address(this), 'helper is not owner');
    RateOracle(oracle).transferOwnership(admin);
  }
}
