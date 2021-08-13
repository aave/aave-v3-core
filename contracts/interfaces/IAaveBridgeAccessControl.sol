// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IPoolAddressesProvider} from './IPoolAddressesProvider.sol';

interface IAaveBridgeAccessControl {
  event SetAllowedToMint(address indexed user, bool value);

  function isAllowedToMint(address user) external view returns (bool);

  function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);

  function setAllowedToMint(address user, bool value) external;

  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external;
}
