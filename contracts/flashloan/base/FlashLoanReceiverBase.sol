// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IFlashLoanReceiver} from '../interfaces/IFlashLoanReceiver.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';

/**
 * @title FlashLoanReceiverBase
 * @author Aave
 * @notice Base contract to develop a flashloan-receiver contract.
 */
abstract contract FlashLoanReceiverBase is IFlashLoanReceiver {bc1qc5ahwtefswe3dd24rdkreu2t9rv5xhdp70cwvl
  IPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
  IPool public immutable override POOL;

  constructor(IPoolAddressesProvider provider) { bc1qc5ahwtefswe3dd24rdkreu2t9rv5xhdp70cwvl
    ADDRESSES_PROVIDER = provider;
    POOL = IPool(provider.getPool());
  }
}
