// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title CalldataLogic library
 * @author Aave
 * @notice Library to decode calldata, used to optimize calldata size in L2Pool for transaction cost reduction
 */
library CalldataLogic {
  function decodeSupplyParams(mapping(uint256 => address) storage reservesList, bytes32 args)
    internal
    view
    returns (
      address,
      uint256,
      uint16
    )
  {
    uint16 assetId;
    uint256 amount;
    uint16 referralCode;

    assembly {
      assetId := and(args, 0xFFFF)
      amount := and(shr(16, args), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
      referralCode := and(shr(144, args), 0xFFFF)
    }
    return (reservesList[assetId], amount, referralCode);
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
    uint32 deadline;
    uint8 permitV;

    bytes32 supplyParams;
    assembly {
      supplyParams := and(args, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
      deadline := and(shr(160, args), 0xFFFFFFFF)
      permitV := and(shr(192, args), 0xFF)
    }
    (address asset, uint256 amount, uint16 referralCode) = decodeSupplyParams(reservesList, args);

    return (asset, amount, referralCode, deadline, permitV);
  }

  function decodeWithdrawParams(mapping(uint256 => address) storage reservesList, bytes32 args)
    internal
    view
    returns (address, uint256)
  {
    uint16 assetId;
    uint256 amount;
    assembly {
      assetId := and(args, 0xFFFF)
      amount := and(shr(16, args), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
    }
    if (amount == type(uint128).max) {
      amount = type(uint256).max;
    }
    return (reservesList[assetId], amount);
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
    uint16 assetId;
    uint256 amount;
    uint256 interestRateMode;
    uint16 referralCode;

    assembly {
      assetId := and(args, 0xFFFF)
      amount := and(shr(16, args), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
      interestRateMode := and(shr(144, args), 0xFF)
      referralCode := and(shr(152, args), 0xFFFF)
    }

    return (reservesList[assetId], amount, interestRateMode, referralCode);
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
    uint16 assetId;
    uint256 amount;
    uint256 interestRateMode;

    assembly {
      assetId := and(args, 0xFFFF)
      amount := and(shr(16, args), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
      interestRateMode := and(shr(144, args), 0xFF)
    }

    if (amount == type(uint128).max) {
      amount = type(uint256).max;
    }

    return (reservesList[assetId], amount, interestRateMode);
  }

  function decodeRepayWithPermitParams(
    mapping(uint256 => address) storage reservesList,
    bytes32 args
  )
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
    uint32 deadline;
    uint8 permitV;

    (address asset, uint256 amount, uint256 interestRateMode) = decodeRepayParams(
      reservesList,
      args
    );

    assembly {
      deadline := and(shr(152, args), 0xFFFFFFFF)
      permitV := and(shr(184, args), 0xFF)
    }

    return (asset, amount, interestRateMode, deadline, permitV);
  }

  function decodeSwapBorrowRateMode(mapping(uint256 => address) storage reservesList, bytes32 args)
    internal
    view
    returns (address, uint256)
  {
    uint16 assetId;
    uint256 interestRateMode;

    assembly {
      assetId := and(args, 0xFFFF)
      interestRateMode := and(shr(16, args), 0xFF)
    }

    return (reservesList[assetId], interestRateMode);
  }

  function decodeRebalanceStableBorrowRate(
    mapping(uint256 => address) storage reservesList,
    bytes32 args
  ) internal view returns (address, address) {
    uint16 assetId;
    address user;
    assembly {
      assetId := and(args, 0xFFFF)
      user := and(shr(16, args), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
    }
    return (reservesList[assetId], user);
  }

  function decodeSetUserUseReserveAsCollateral(
    mapping(uint256 => address) storage reservesList,
    bytes32 args
  ) internal view returns (address, bool) {
    uint16 assetId;
    bool useAsCollateral;
    assembly {
      assetId := and(args, 0xFFFF)
      useAsCollateral := and(shr(16, args), 0x1)
    }
    return (reservesList[assetId], useAsCollateral);
  }

  function decodeLiquidationCall(
    mapping(uint256 => address) storage reservesList,
    bytes32 args1,
    bytes32 args2
  )
    internal
    view
    returns (
      address,
      address,
      address,
      uint256,
      bool
    )
  {
    uint16 collateralAssetId;
    uint16 debtAssetId;
    address user;
    uint256 debtToCover;
    bool receiveAToken;

    assembly {
      collateralAssetId := and(args1, 0xFFFF)
      debtAssetId := and(shr(16, args1), 0xFFFF)
      user := and(shr(32, args1), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)

      debtToCover := and(args2, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
      receiveAToken := and(shr(128, args2), 0x1)
    }

    if (debtToCover == type(uint128).max) {
      debtToCover = type(uint256).max;
    }

    return (
      reservesList[collateralAssetId],
      reservesList[debtAssetId],
      user,
      debtToCover,
      receiveAToken
    );
  }
}
