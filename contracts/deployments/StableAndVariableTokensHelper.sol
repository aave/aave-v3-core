// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {StableDebtToken} from '../protocol/tokenization/StableDebtToken.sol';
import {VariableDebtToken} from '../protocol/tokenization/VariableDebtToken.sol';
import {RateOracle} from '../mocks/oracle/RateOracle.sol';
import {Ownable} from '../dependencies/openzeppelin/contracts/Ownable.sol';

/**
 * @title StableAndVariableTokensHelper
 * @notice Implements a helper to update rate oracles for debt tokens
 * @author Aave
 **/
contract StableAndVariableTokensHelper is Ownable {
  address payable private pool;
  address private addressesProvider;
  event deployedContracts(address stableToken, address variableToken);

  constructor(address payable _pool, address _addressesProvider) {
    pool = _pool;
    addressesProvider = _addressesProvider;
  }

  /**
   * @notice Updates the borrow rates for the reserves
   * @param assets The assets to update rates for
   * @param rates The new rates for the assets
   * @param oracle The address of the rate oracle
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
   * @notice Transfers ownership of rates oracle
   * @dev Only callable by owner and when this contract is the owner of the oracle
   * @param oracle The address of the oracle
   * @param admin The address of the new admin
   */
  function setOracleOwnership(address oracle, address admin) external onlyOwner {
    require(admin != address(0), 'owner can not be zero');
    require(RateOracle(oracle).owner() == address(this), 'helper is not owner');
    RateOracle(oracle).transferOwnership(admin);
  }
}
