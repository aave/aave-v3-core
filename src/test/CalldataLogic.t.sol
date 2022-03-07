// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from './../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';

import {CalldataLogic} from './../../contracts/protocol/libraries/logic/CalldataLogic.sol';
import {L2Encoder} from './../../contracts/misc/L2Encoder.sol';

import {Vm} from './../Vm.sol';
import {TestHelper} from './TestHelper.sol';

// TODO: There is an error with the revert messages. For now, we are checking after reverts only,
// as the integration tests are already catching the revert messages
contract CalldataLogicTest is TestHelper {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  Vm constant VM = Vm(HEVM_ADDRESS);

  mapping(uint256 => address) reservesList;

  function setUp() public {
    for (uint256 i = 0; i < 128; i++) {
      reservesList[i] = address(uint160(400 + i));
    }
  }

  function testDecodeSupplyParams(
    uint16 assetId,
    uint128 amount,
    uint16 referralCode
  ) public {
    VM.assume(assetId < 128);

    bytes32 args;
    assembly {
      args := add(assetId, add(shl(16, amount), shl(144, referralCode)))
    }

    (address _asset, uint256 _amount, uint16 _referralCode) = CalldataLogic.decodeSupplyParams(
      reservesList,
      args
    );

    assertEq(_asset, reservesList[assetId]);
    assertEq(_amount, amount);
    assertEq(_referralCode, referralCode);
  }

  function testDecodeSupplyWithPermitParams(
    uint16 assetId,
    uint128 amount,
    uint16 referralCode,
    uint256 deadLine,
    uint8 permitV
  ) public {
    VM.assume(assetId < 128 && deadLine < type(uint32).max);

    bytes32 args;
    assembly {
      args := add(
        assetId,
        add(
          shl(16, amount),
          add(shl(144, referralCode), add(shl(160, deadLine), shl(192, permitV)))
        )
      )
    }

    (
      address _asset,
      uint256 _amount,
      uint16 _referralCode,
      uint256 _deadLine,
      uint8 _permitV
    ) = CalldataLogic.decodeSupplyWithPermitParams(reservesList, args);

    assertEq(_asset, reservesList[assetId]);
    assertEq(_amount, amount);
    assertEq(_referralCode, referralCode);
    assertEq(_deadLine, deadLine);
    assertEq(_permitV, permitV);
  }

  function testDecodeWithdrawParams(uint16 assetId, uint128 amount) public {
    bytes32 args;
    assembly {
      args := add(assetId, shl(16, amount))
    }

    (address _asset, uint256 _amount) = CalldataLogic.decodeWithdrawParams(reservesList, args);

    uint256 expectedAmount = amount == type(uint128).max ? type(uint256).max : uint256(amount);

    assertEq(_asset, reservesList[assetId]);
    assertEq(_amount, expectedAmount);
  }

  function testDecodeBorrowParams(
    uint16 assetId,
    uint128 amount,
    bool stableRateMode,
    uint16 referralCode
  ) public {
    uint256 interestRateMode = stableRateMode ? 1 : 2;

    bytes32 args;
    assembly {
      args := add(
        assetId,
        add(shl(16, amount), add(shl(144, interestRateMode), shl(152, referralCode)))
      )
    }

    (
      address _asset,
      uint256 _amount,
      uint256 _interestRateMode,
      uint16 _referralCode
    ) = CalldataLogic.decodeBorrowParams(reservesList, args);

    assertEq(_asset, reservesList[assetId]);
    assertEq(_amount, amount);
    assertEq(_interestRateMode, interestRateMode);
    assertEq(_referralCode, referralCode);
  }

  function testDecodeRepayParams(
    uint16 assetId,
    uint128 amount,
    bool stableRateMode
  ) public {
    uint256 interestRateMode = stableRateMode ? 1 : 2;
    uint256 expectedAmount = amount == type(uint128).max ? type(uint256).max : amount;

    bytes32 args;
    assembly {
      args := add(assetId, add(shl(16, amount), shl(144, interestRateMode)))
    }

    (address _asset, uint256 _amount, uint256 _interestRateMode) = CalldataLogic.decodeRepayParams(
      reservesList,
      args
    );

    assertEq(_asset, reservesList[assetId]);
    assertEq(_amount, expectedAmount);
    assertEq(_interestRateMode, interestRateMode);
  }

  struct DecodeRepayWithPermitHelper {
    uint256 expectedAmount;
    address _asset;
    uint256 _amount;
    uint256 _interestRateMode;
    uint256 _deadline;
    uint8 _permitV;
  }

  function testDecodeRepayWithPermitParams(
    uint16 assetId,
    uint128 amount,
    bool stableRateMode,
    uint32 deadline,
    uint8 permitV
  ) public {
    DecodeRepayWithPermitHelper memory vars;

    vars.expectedAmount = amount == type(uint128).max ? type(uint256).max : amount;

    bytes32 args;
    assembly {
      args := add(
        assetId,
        add(
          shl(16, amount),
          add(shl(144, sub(2, stableRateMode)), add(shl(152, deadline), shl(184, permitV)))
        )
      )
    }

    (
      vars._asset,
      vars._amount,
      vars._interestRateMode,
      vars._deadline,
      vars._permitV
    ) = CalldataLogic.decodeRepayWithPermitParams(reservesList, args);

    assertEq(vars._asset, reservesList[assetId]);
    assertEq(vars._amount, vars.expectedAmount);
    assertEq(vars._interestRateMode, stableRateMode ? 1 : 2);
    assertEq(vars._deadline, uint256(deadline));
    assertEq(vars._permitV, permitV);
  }

  function testDecodeSwapBorrowRateModeParams(uint16 assetId, bool stableRateMode) public {
    uint256 interestRateMode = stableRateMode ? 1 : 2;
    bytes32 args;
    assembly {
      args := add(assetId, shl(16, interestRateMode))
    }

    (address _asset, uint256 _interestRateMode) = CalldataLogic.decodeSwapBorrowRateModeParams(
      reservesList,
      args
    );

    assertEq(_asset, reservesList[assetId]);
    assertEq(_interestRateMode, interestRateMode);
  }

  function testDecodeRebalanceStableBorrowRateParams(uint16 assetId, address user) public {
    bytes32 args;
    assembly {
      args := add(assetId, shl(16, user))
    }

    (address _asset, address _user) = CalldataLogic.decodeRebalanceStableBorrowRateParams(
      reservesList,
      args
    );
    assertEq(_asset, reservesList[assetId]);
    assertEq(_user, user);
  }

  function testDecodeSetUserUseReserveAsCollateralParams(uint16 assetId, bool useAsCollateral)
    public
  {
    bytes32 args;
    assembly {
      args := add(assetId, shl(16, useAsCollateral))
    }

    (address _asset, bool _useAsCollateral) = CalldataLogic
      .decodeSetUserUseReserveAsCollateralParams(reservesList, args);

    assertEq(_asset, reservesList[assetId]);
    assertEq(_useAsCollateral, useAsCollateral);
  }

  struct DecodeLiquidationCallParamsHelper {
    uint256 expectedDebtToCover;
    address collateralAsset;
    address debtAsset;
    address user;
    uint256 debtToCover;
    bool receiveAToken;
  }

  function testDecodeLiquidationCallParams(
    uint16 collateralAssetId,
    uint16 debtAssetId,
    address user,
    uint128 debtToCover,
    bool receiveAToken
  ) public {
    DecodeLiquidationCallParamsHelper memory vars;

    bytes32 args1;
    bytes32 args2;

    vars.expectedDebtToCover = debtToCover == type(uint128).max ? type(uint256).max : debtToCover;

    assembly {
      args1 := add(add(collateralAssetId, shl(16, debtAssetId)), shl(32, user))
      args2 := add(debtToCover, shl(128, receiveAToken))
    }

    (
      vars.collateralAsset,
      vars.debtAsset,
      vars.user,
      vars.debtToCover,
      vars.receiveAToken
    ) = CalldataLogic.decodeLiquidationCallParams(reservesList, args1, args2);

    assertEq(vars.collateralAsset, reservesList[collateralAssetId]);
    assertEq(vars.debtAsset, reservesList[debtAssetId]);
    assertEq(vars.user, user);
    assertEq(vars.debtToCover, vars.expectedDebtToCover);
    assertEq(vars.receiveAToken, receiveAToken);
  }
}
