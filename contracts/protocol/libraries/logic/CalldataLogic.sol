// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {BytesLib} from '../../../dependencies/consensys/BytesLib.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title CalldataLogic library
 * @author Aave
 * @notice Library to decode calldata, used to optimize calldata size in L2Pool for transaction cost reduction
 */
library CalldataLogic {
  using BytesLib for bytes;

  function decodeSupplyParams(mapping(uint256 => address) storage reservesList, bytes calldata args)
    internal
    view
    returns (
      address,
      uint256,
      uint16
    )
  {
    unchecked {
      uint256 cursor;

      uint16 assetId = args.toUint16(cursor);
      cursor += 2;
      uint256 amount = args.toUint128(cursor);
      cursor += 16;
      uint16 referralCode = args.toUint16(cursor);
      cursor += 2;

      return (reservesList[assetId], amount, referralCode);
    }
  }

  function decodePermitParams(bytes calldata args, uint256 start)
    internal
    pure
    returns (
      uint32,
      uint8,
      bytes32,
      bytes32
    )
  {
    unchecked {
      uint32 deadline = args.toUint32(start);
      start += 4;
      uint8 v = args.toUint8(start);
      start += 1;
      bytes32 r = args.toBytes32(start);
      start += 32;
      bytes32 s = args.toBytes32(start);
      start += 32;
      return (deadline, v, r, s);
    }
  }

  function decodeWithdrawParams(
    mapping(uint256 => address) storage reservesList,
    bytes calldata args
  ) internal view returns (address, uint256) {
    unchecked {
      uint256 cursor;

      uint16 assetId = args.toUint16(cursor);
      cursor += 2;
      uint256 amount = args.toUint128(cursor);
      cursor += 16;

      return (reservesList[assetId], amount);
    }
  }

  function decodeBorrowParams(mapping(uint256 => address) storage reservesList, bytes calldata args)
    internal
    view
    returns (
      address,
      uint256,
      uint256,
      uint16
    )
  {
    (address asset, uint256 amount, uint256 interestRateMode) = _decodeBorrowRepayCommonParams(
      reservesList,
      args
    );

    uint16 referralCode = args.toUint16(17);

    return (asset, amount, interestRateMode, referralCode);
  }

  function decodeRepayParams(mapping(uint256 => address) storage reservesList, bytes calldata args)
    internal
    view
    returns (
      address,
      uint256,
      uint256
    )
  {
    return _decodeBorrowRepayCommonParams(reservesList, args);
  }

  function _decodeBorrowRepayCommonParams(
    mapping(uint256 => address) storage reservesList,
    bytes calldata args
  )
    internal
    view
    returns (
      address,
      uint256,
      uint256
    )
  {
    unchecked {
      uint256 cursor;

      uint16 assetId = args.toUint16(cursor);
      cursor += 2;
      uint256 amount = args.toUint128(cursor);
      cursor += 16;

      uint8 interestRateMode = args.toUint8(cursor);
      cursor += 1;

      return (reservesList[assetId], amount, interestRateMode);
    }
  }
}
