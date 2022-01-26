pragma solidity ^0.8.10;

import {Pool} from './Pool.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {SupplyLogic} from '../libraries/logic/SupplyLogic.sol';
import {CalldataLogic} from '../libraries/logic/CalldataLogic.sol';

contract L2Pool is Pool {
  /**
   * @dev Constructor.
   * @param provider The address of the PoolAddressesProvider contract
   */
  constructor(IPoolAddressesProvider provider) Pool(provider) {}

  function supply(bytes32 args) external {
    (address asset, uint256 amount, uint16 referralCode) = CalldataLogic.decodeSupplyParams(
      _reservesList,
      args
    );

    supply(asset, amount, msg.sender, referralCode);
  }

  function supplyWithPermit(
    bytes32 args,
    bytes32 r,
    bytes32 s
  ) external {
    (address asset, uint256 amount, uint16 referralCode, uint32 deadline, uint8 v) = CalldataLogic
      .decodeSupplyWithPermitParams(_reservesList, args);

    supplyWithPermit(asset, amount, msg.sender, referralCode, deadline, v, r, s);
  }

  function withdraw(bytes32 args) external {
    (address asset, uint256 amount) = CalldataLogic.decodeWithdrawParams(_reservesList, args);

    withdraw(asset, amount, msg.sender);
  }

  function borrow(bytes32 args) external {
    (address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode) = CalldataLogic
      .decodeBorrowParams(_reservesList, args);

    borrow(asset, amount, interestRateMode, referralCode, msg.sender);
  }

  function repay(bytes32 args) external returns (uint256) {
    (address asset, uint256 amount, uint256 interestRateMode) = CalldataLogic.decodeRepayParams(
      _reservesList,
      args
    );

    return repay(asset, amount, interestRateMode, msg.sender);
  }

  function repayWithPermit(
    bytes32 args,
    bytes32 r,
    bytes32 s
  ) external returns (uint256) {
    (
      address asset,
      uint256 amount,
      uint256 interestRateMode,
      uint32 deadline,
      uint8 v
    ) = CalldataLogic.decodeRepayWithPermitParams(_reservesList, args);

    return repayWithPermit(asset, amount, interestRateMode, msg.sender, deadline, v, r, s);
  }
}
