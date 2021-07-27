// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.6;

/**
 * @title IDelegationToken
 * @dev Implements an interface for tokens with delegation COMP/UNI compatible
 * @author Aave
 **/
interface IDelegationToken {
  function delegate(address delegatee) external;
}
