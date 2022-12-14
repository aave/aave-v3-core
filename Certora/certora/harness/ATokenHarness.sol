// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Pool} from '../../contracts/protocol/pool/Pool.sol';
import {AToken} from '../../contracts/protocol/tokenization/AToken.sol';

/**
 * @title Certora harness for Aave ERC20 AToken
 *
 * @dev Certora's harness contract for the verification of Aave ERC20 AToken.
 */
contract ATokenHarness is AToken {

  constructor(
    Pool pool
  ) public AToken(pool) {}

  /**
   * @dev Calls burn with index == 1 RAY
   * @param amount the amount being burned
   */
  function burn(
    address user,
    address receiverOfUnderlying,
    uint256 amount,
    uint256 index
  ) public override onlyPool {

    // changes for pool
    // require(index == 1e27, 'index is assumed to be 1 RAY');
    // super.burn(user, receiverOfUnderlying, amount, index);

    super.burn(user, receiverOfUnderlying, amount, 1e27);
    //POOL.setATokenFlag(!POOL.getATokenFlag());
  }

  /**
   * @dev Calls mint with index == 1 RAY
   * @param amount the amount of tokens to mint
   */
  function mint(
    address user,
    address onBehalfOf,
    uint256 amount,
    uint256 index
  ) public virtual override onlyPool returns (bool) {

    // changes for pool
    // require(index == 1e27, 'index is assumed to be 1 RAY');
    // return super.mint(user, amount, index);
    return super.mint(user, onBehalfOf, amount, 1e27);
  }

  function scaledTotalSupply() public view override returns (uint256) {
    uint256 val = super.scaledTotalSupply();
   // POOL.setATokenFlag(!POOL.getATokenFlag());
    return val;
  }

  function additionalData(address user) public view returns (uint128) {
    return _userState[user].additionalData;
  }
}