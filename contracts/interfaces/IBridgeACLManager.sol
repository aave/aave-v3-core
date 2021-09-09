// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IPool} from './IPool.sol';

/**
 * @title IBridgeACLManager contract
 * @notice Main registry of bridges that are authorized to mint unbacked tokens and later back them with received funds.
 * - Acting also as whitelist for fast withdrawal bridges
 * - Controlled by the Aave Governance
 * @author Aave
 **/

interface IBridgeACLManager {
  function POOL() external view returns (IPool);

  /**
   * @notice Mints an `amount` of aTokens to the `onBehalfOf`
   * @param asset The address of the underlying asset that we are to mint atokens for
   * @param amount The amount to mint
   * @param onBehalfOf The address that will receive the aTokens
   * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
   *   0 if the action is executed directly by the user, without any middle-man
   **/
  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external;

  /**
   * @notice Back the current unbacked underlying with `amount` and pay `fee`.
   *   If backing unnecessarily, excess `amount` will be added to `fee`.
   * @param asset The address of the underlying asset to repay
   * @param amount The amount to back
   * @param fee The amount paid in fees
   **/
  function backUnbacked(
    address asset,
    uint256 amount,
    uint256 fee
  ) external;
}
