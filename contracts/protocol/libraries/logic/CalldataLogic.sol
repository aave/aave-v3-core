// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title CalldataLogic library
 * @author Aave
 * @notice Library to decode calldata, used to optimize calldata size in L2Pool for transaction cost reduction
 */
library CalldataLogic {
  using BytesLib for bytes;

  function decodeSupplyParams(mapping(uint256 => address) storage reservesList, bytes32 args)
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

      uint16 assetId = uint16(uint256(args) & 0xFFFF);
      cursor += 16;
      uint256 amount = uint16(uint256(args >> cursor) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
      cursor += 128;
      uint16 referralCode = uint16(uint256(args >> cursor) & 0xFFFF);

      return (reservesList[assetId], amount, referralCode);
    }
  }

  function decodeSupplyWithPermitParams(
    mapping(uint256 => address) storage reservesList,
    bytes32 args
  )
    internal
    view
    returns (
      address,
      uint256,
      uint16,
      uint32,
      uint8
    )
  {
    (address asset, uint256 amount, uint16 referralCode) = decodeSupplyParams(reservesList, args);
    uint32 deadline = uint32(uint256(args >> 160) & 0xFFFFFFFF);
    uint8 v = uint8(uint256(args >> 192) & 0xFF);
    return (asset, amount, referralCode, deadline, v);
  }

  function decodeWithdrawParams(mapping(uint256 => address) storage reservesList, bytes32 args)
    internal
    view
    returns (address, uint256)
  {
    unchecked {
      uint256 cursor;

      uint16 assetId = uint16(uint256(args) & 0xFFFF);
      cursor += 2;
      uint256 amount = uint16(uint256(args >> cursor) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);

      return (reservesList[assetId], amount);
    }
  }

  function decodeBorrowParams(mapping(uint256 => address) storage reservesList, bytes32 args)
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

    uint16 referralCode = uint16(uint256(args >> 136) & 0xFFFF);

    return (asset, amount, interestRateMode, referralCode);
  }

  function decodeRepayWithPermitParams(mapping(uint256 => address) storage reservesList, bytes32 args)
    internal
    view
    returns (
      address,
      uint256,
      uint256,
      uint32,
      uint8
    )
  {
    (address asset, uint256 amount, uint256 interestRateMode) = _decodeBorrowRepayCommonParams(reservesList, args);
    uint32 deadline = uint32(uint256(args >> 160) & 0xFFFFFFFF);
    uint8 v = uint8(uint256(args >> 192) & 0xFF);
    return (asset, amount, interestRateMode, deadline, v);
  }

    function decodeRepayParams(mapping(uint256 => address) storage reservesList, bytes32 args)
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
    bytes32 args
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

      uint16 assetId = uint16(uint256(args) & 0xFFFF);
      cursor += 2;
      uint256 amount = uint256(args >> cursor) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
      cursor += 16;
      uint16 interestRateMode = uint8(uint256(args >> cursor) & 0xFF);

      return (reservesList[assetId], amount, interestRateMode);
    }
  }
}
