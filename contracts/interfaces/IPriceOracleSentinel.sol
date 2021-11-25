// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IPoolAddressesProvider} from './IPoolAddressesProvider.sol';
import {ISequencerOracle} from './ISequencerOracle.sol';

/**
 * @title IPriceOracleSentinel
 * @author Aave
 * @notice Defines the basic interface for the PriceOracleSentinel
 */
interface IPriceOracleSentinel {
  /**
   * @notice Returns true if the `borrow` operation is allowed.
   * @dev Operation not allowed when PriceOracle is down or grace period not passed.
   * @return True if the `borrow` operation is allowed, false otherwise.
   */
  function isBorrowAllowed() external view returns (bool);

  /**
   * @notice Returns true if the `liquidation` operation is allowed.
   * @dev Operation not allowed when PriceOracle is down or grace period not passed.
   * @return True if the `liquidation` operation is allowed, false otherwise.
   */
  function isLiquidationAllowed() external view returns (bool);

  function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);

  function ORACLE() external view returns (ISequencerOracle);

  function GRACE_PERIOD() external view returns (uint256);
}
