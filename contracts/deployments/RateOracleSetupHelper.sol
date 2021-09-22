// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {RateOracle} from '../mocks/oracle/RateOracle.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';

/**
 * @title RateOracleSetupHelper
 * @author Aave
 * @notice Deployment helper to setup initial borrow rates of multiple assets in one transaction.
 * @dev The RateOracle owner must transfer the ownership to RateOracleSetupHelper before calling to setOracleBorrowRates.
 * @dev The RateOracleSetupHelper is an Ownable contract, so only the deployer or future owners can call this contract.
 */
contract RateOracleSetupHelper is Ownable {
  /**
   * @notice External function called by the owner account to set the initial borrow rates of the assets
   * @param assets The addresses of the assets
   * @param rates The interest rates of each asset
   * @param oracle The address of the RateOracle contract
   */
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

  /**
   * @notice External function called by the deployer account to give ownership of the RateOracle back to the corresponding owner address.
   * @param oracle The address of the RateOracle contract
   * @param admin The corresponding owner address
   */
  function setOracleOwnership(address oracle, address admin) external onlyOwner {
    require(admin != address(0), 'owner can not be zero');
    require(RateOracle(oracle).owner() == address(this), 'helper is not owner');
    RateOracle(oracle).transferOwnership(admin);
  }
}
