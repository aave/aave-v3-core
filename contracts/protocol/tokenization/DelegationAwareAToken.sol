// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {Errors} from '../libraries/helpers/Errors.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IDelegationToken} from '../../interfaces/IDelegationToken.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {AToken} from './AToken.sol';

/**
 * @title DelegationAwareAToken
 * @author Aave
 * @notice AToken enabled to delegate voting power of the underlying asset to a different address
 * @dev The underlying asset needs to be compatible with the COMP delegation interface
 */
contract DelegationAwareAToken is AToken {
  modifier onlyPoolAdmin() {
    IACLManager aclManager = IACLManager(IPool(_pool).getAddressesProvider().getACLManager());
    require(aclManager.isPoolAdmin(msg.sender), Errors.CALLER_NOT_POOL_ADMIN);
    _;
  }

  /**
   * @notice Delegates voting power of the underlying asset to a `delegatee` address
   * @param delegatee The address that will receive the delegation
   **/
  function delegateUnderlyingTo(address delegatee) external onlyPoolAdmin {
    IDelegationToken(_underlyingAsset).delegate(delegatee);
  }
}
