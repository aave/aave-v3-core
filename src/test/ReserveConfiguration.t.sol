// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from './../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';
import {Vm} from './../Vm.sol';
import {Errors} from './../../contracts/protocol/libraries/helpers/Errors.sol';

import {TestHelper} from './TestHelper.sol';

// TODO: There is an error with the revert messages. For now, we are checking after reverts only,
// as the integration tests are already catching the revert messages
contract ReserveConfigurationTest is TestHelper {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  Vm constant VM = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

  function testSetLtv(uint256 data, uint256 ltv) public {
    VM.assume(ltv <= ReserveConfiguration.MAX_VALID_LTV);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data & ReserveConfiguration.LTV_MASK
    });
    config.setLtv(ltv);
    assertEq(config.data & ~ReserveConfiguration.LTV_MASK, ltv);
  }

  function testFailSetLtvTooHigh(uint256 data, uint256 ltv) public {
    VM.assume(ltv > ReserveConfiguration.MAX_VALID_LTV);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data & ReserveConfiguration.LTV_MASK
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_LTV));
    config.setLtv(ltv);
  }

  function testGetLtv(uint256 data, uint256 ltv) public {
    // Notice that the mask may support values that is significantly larger than the max value.
    VM.assume(ltv <= type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LTV_MASK) | ltv
    });
    assertEq(config.getLtv(), ltv);
  }

  function testSetLiquidationThreshold(uint256 data, uint256 threshold) public {
    VM.assume(threshold <= ReserveConfiguration.MAX_VALID_LIQUIDATION_THRESHOLD);

    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_THRESHOLD_MASK)
    });

    config.setLiquidationThreshold(threshold);

    assertEq(
      (config.data & ~ReserveConfiguration.LIQUIDATION_THRESHOLD_MASK) >>
        ReserveConfiguration.LIQUIDATION_THRESHOLD_START_BIT_POSITION,
      threshold
    );
  }

  function testFailSetLiquidationThreshold(uint256 data, uint256 threshold) public {
    VM.assume(threshold > ReserveConfiguration.MAX_VALID_LIQUIDATION_THRESHOLD);

    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_THRESHOLD_MASK)
    });

    //TODO: VM.expectRevert(bytes(Errors.INVALID_LIQ_THRESHOLD));
    config.setLiquidationThreshold(threshold);
  }

  function testGetLiquidationThreshold(uint256 data, uint256 threshold) public {
    VM.assume(threshold <= type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_THRESHOLD_MASK) |
        (threshold << ReserveConfiguration.LIQUIDATION_THRESHOLD_START_BIT_POSITION)
    });
    assertEq(config.getLiquidationThreshold(), threshold);
  }

  function testSetLiquidationBonus(uint256 data, uint256 bonus) public {
    VM.assume(bonus <= ReserveConfiguration.MAX_VALID_LIQUIDATION_BONUS);

    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_BONUS_MASK)
    });

    config.setLiquidationBonus(bonus);

    assertEq(
      (config.data & ~ReserveConfiguration.LIQUIDATION_BONUS_MASK) >>
        ReserveConfiguration.LIQUIDATION_BONUS_START_BIT_POSITION,
      bonus
    );
  }

  function testFailSetLiquidationBonus(uint256 data, uint256 bonus) public {
    VM.assume(bonus > ReserveConfiguration.MAX_VALID_LIQUIDATION_BONUS);

    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_BONUS_MASK)
    });

    //TODO: VM.expectRevert(bytes(Errors.INVALID_LIQ_THRESHOLD));
    config.setLiquidationBonus(bonus);
  }

  function testGetLiquidationBonus(uint256 data, uint256 bonus) public {
    VM.assume(bonus <= type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_BONUS_MASK) |
        (bonus << ReserveConfiguration.LIQUIDATION_BONUS_START_BIT_POSITION)
    });
    assertEq(config.getLiquidationBonus(), bonus);
  }

  function testSetDecimals(uint256 data, uint256 decimals) public {
    VM.assume(decimals <= type(uint8).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DECIMALS_MASK)
    });

    config.setDecimals(decimals);

    assertEq(
      (config.data & ~ReserveConfiguration.DECIMALS_MASK) >>
        ReserveConfiguration.RESERVE_DECIMALS_START_BIT_POSITION,
      decimals
    );
  }

  function testFailSetDecimals(uint256 data, uint256 decimals) public {
    VM.assume(decimals > type(uint8).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DECIMALS_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_DECIMALS));
    config.setDecimals(decimals);
  }

  function testGetDecimals(uint256 data, uint256 decimals) public {
    VM.assume(decimals <= type(uint8).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DECIMALS_MASK) |
        (decimals << ReserveConfiguration.RESERVE_DECIMALS_START_BIT_POSITION)
    });
    assertEq(config.getDecimals(), decimals);
  }

  function testSetActive(uint256 data, bool active) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.ACTIVE_MASK)
    });
    config.setActive(active);
    uint256 activeBit = active ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.ACTIVE_MASK) >>
        ReserveConfiguration.IS_ACTIVE_START_BIT_POSITION,
      activeBit
    );
  }

  function testGetActive(uint256 data, bool active) public {
    uint256 activeBit = active ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.ACTIVE_MASK) |
        (activeBit << ReserveConfiguration.IS_ACTIVE_START_BIT_POSITION)
    });
    assertEq(config.getActive(), active);
  }

  function testSetFrozen(uint256 data, bool frozen) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.FROZEN_MASK)
    });
    config.setFrozen(frozen);
    uint256 frozenBit = frozen ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.FROZEN_MASK) >>
        ReserveConfiguration.IS_FROZEN_START_BIT_POSITION,
      frozenBit
    );
  }

  function testGetFrozen(uint256 data, bool frozen) public {
    uint256 frozenBit = frozen ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.FROZEN_MASK) |
        (frozenBit << ReserveConfiguration.IS_FROZEN_START_BIT_POSITION)
    });
    assertEq(config.getFrozen(), frozen);
  }

  function testSetPaused(uint256 data, bool paused) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.PAUSED_MASK)
    });
    config.setPaused(paused);
    uint256 pausedBit = paused ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.PAUSED_MASK) >>
        ReserveConfiguration.IS_PAUSED_START_BIT_POSITION,
      pausedBit
    );
  }

  function testGetPaused(uint256 data, bool paused) public {
    uint256 pausedBit = paused ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.PAUSED_MASK) |
        (pausedBit << ReserveConfiguration.IS_PAUSED_START_BIT_POSITION)
    });
    assertEq(config.getPaused(), paused);
  }

  function testSetBorrowableInIsolation(uint256 data, bool enabled) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK)
    });
    config.setBorrowableInIsolation(enabled);
    uint256 isolationBorrowAbleBit = enabled ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK) >>
        ReserveConfiguration.BORROWABLE_IN_ISOLATION_START_BIT_POSITION,
      isolationBorrowAbleBit
    );
  }

  function testGetBorrowableInIsolation(uint256 data, bool enabled) public {
    uint256 isolationBorrowAble = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK) |
        (isolationBorrowAble << ReserveConfiguration.BORROWABLE_IN_ISOLATION_START_BIT_POSITION)
    });
    assertEq(config.getBorrowableInIsolation(), enabled);
  }

  function testSetSiloedBorrowing(uint256 data, bool enabled) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SILOED_BORROWING_MASK)
    });
    config.setSiloedBorrowing(enabled);
    uint256 siloedBorrowingBit = enabled ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.SILOED_BORROWING_MASK) >>
        ReserveConfiguration.SILOED_BORROWING_START_BIT_POSITION,
      siloedBorrowingBit
    );
  }

  function testGetSiloedBorrowing(uint256 data, bool enabled) public {
    uint256 siloedBorrowingBit = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SILOED_BORROWING_MASK) |
        (siloedBorrowingBit << ReserveConfiguration.SILOED_BORROWING_START_BIT_POSITION)
    });
    assertEq(config.getSiloedBorrowing(), enabled);
  }

  function testSetBorrowingEnabled(uint256 data, bool enabled) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWING_MASK)
    });
    config.setBorrowingEnabled(enabled);
    uint256 borrowingBit = enabled ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.BORROWING_MASK) >>
        ReserveConfiguration.BORROWING_ENABLED_START_BIT_POSITION,
      borrowingBit
    );
  }

  function testGetBorrowingEnabled(uint256 data, bool enabled) public {
    uint256 borrowingBit = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWING_MASK) |
        (borrowingBit << ReserveConfiguration.BORROWING_ENABLED_START_BIT_POSITION)
    });
    assertEq(config.getBorrowingEnabled(), enabled);
  }

  function testSetStableBorrowingEnabled(uint256 data, bool enabled) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.STABLE_BORROWING_MASK)
    });
    config.setStableRateBorrowingEnabled(enabled);
    uint256 borrowingBit = enabled ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.STABLE_BORROWING_MASK) >>
        ReserveConfiguration.STABLE_BORROWING_ENABLED_START_BIT_POSITION,
      borrowingBit
    );
  }

  function testGetStableBorrowingEnabled(uint256 data, bool enabled) public {
    uint256 borrowingBit = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.STABLE_BORROWING_MASK) |
        (borrowingBit << ReserveConfiguration.STABLE_BORROWING_ENABLED_START_BIT_POSITION)
    });
    assertEq(config.getStableRateBorrowingEnabled(), enabled);
  }

  function testSetReserveFactor(uint256 data, uint256 reserveFactor) public {
    VM.assume(reserveFactor <= ReserveConfiguration.MAX_VALID_RESERVE_FACTOR);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.RESERVE_FACTOR_MASK)
    });

    config.setReserveFactor(reserveFactor);

    assertEq(
      (config.data & ~ReserveConfiguration.RESERVE_FACTOR_MASK) >>
        ReserveConfiguration.RESERVE_FACTOR_START_BIT_POSITION,
      reserveFactor
    );
  }

  function testFailSetReserveFactor(uint256 data, uint256 reserveFactor) public {
    VM.assume(reserveFactor > ReserveConfiguration.MAX_VALID_RESERVE_FACTOR);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.RESERVE_FACTOR_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_RESERVE_FACTOR));
    config.setReserveFactor(reserveFactor);
  }

  function testGetReserveFactor(uint256 data, uint256 reserveFactor) public {
    VM.assume(reserveFactor <= type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.RESERVE_FACTOR_MASK) |
        (reserveFactor << ReserveConfiguration.RESERVE_FACTOR_START_BIT_POSITION)
    });
    assertEq(config.getReserveFactor(), reserveFactor);
  }

  function testSetBorrowCap(uint256 data, uint256 borrowCap) public {
    VM.assume(borrowCap <= ReserveConfiguration.MAX_VALID_BORROW_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROW_CAP_MASK)
    });

    config.setBorrowCap(borrowCap);

    assertEq(
      (config.data & ~ReserveConfiguration.BORROW_CAP_MASK) >>
        ReserveConfiguration.BORROW_CAP_START_BIT_POSITION,
      borrowCap
    );
  }

  function testFailSetBorrowCap(uint256 data, uint256 borrowCap) public {
    VM.assume(borrowCap > ReserveConfiguration.MAX_VALID_BORROW_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROW_CAP_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_BORROW_CAP));
    config.setBorrowCap(borrowCap);
  }

  function testGetBorrowCap(uint256 data, uint256 borrowCap) public {
    VM.assume(borrowCap < 2**36);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROW_CAP_MASK) |
        (borrowCap << ReserveConfiguration.BORROW_CAP_START_BIT_POSITION)
    });
    assertEq(config.getBorrowCap(), borrowCap);
  }

  function testSetSupplyCap(uint256 data, uint256 supplyCap) public {
    VM.assume(supplyCap <= ReserveConfiguration.MAX_VALID_SUPPLY_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SUPPLY_CAP_MASK)
    });

    config.setSupplyCap(supplyCap);

    assertEq(
      (config.data & ~ReserveConfiguration.SUPPLY_CAP_MASK) >>
        ReserveConfiguration.SUPPLY_CAP_START_BIT_POSITION,
      supplyCap
    );
  }

  function testFailSetSupplyCap(uint256 data, uint256 supplyCap) public {
    VM.assume(supplyCap > ReserveConfiguration.MAX_VALID_SUPPLY_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SUPPLY_CAP_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_SUPPLY_CAP));
    config.setSupplyCap(supplyCap);
  }

  function testGetSupplyCap(uint256 data, uint256 supplyCap) public {
    VM.assume(supplyCap < 2**36);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SUPPLY_CAP_MASK) |
        (supplyCap << ReserveConfiguration.SUPPLY_CAP_START_BIT_POSITION)
    });
    assertEq(config.getSupplyCap(), supplyCap);
  }

  function testSetDebtCeiling(uint256 data, uint256 debtCeiling) public {
    VM.assume(debtCeiling <= ReserveConfiguration.MAX_VALID_DEBT_CEILING);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DEBT_CEILING_MASK)
    });

    config.setDebtCeiling(debtCeiling);

    assertEq(
      (config.data & ~ReserveConfiguration.DEBT_CEILING_MASK) >>
        ReserveConfiguration.DEBT_CEILING_START_BIT_POSITION,
      debtCeiling
    );
  }

  function testFailSetDebtCeiling(uint256 data, uint256 debtCeiling) public {
    VM.assume(debtCeiling > ReserveConfiguration.MAX_VALID_DEBT_CEILING);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DEBT_CEILING_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_DEBT_CEILING));
    config.setDebtCeiling(debtCeiling);
  }

  function testGetDebtCeiling(uint256 data, uint256 debtCeiling) public {
    VM.assume(debtCeiling < 2**36);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DEBT_CEILING_MASK) |
        (debtCeiling << ReserveConfiguration.DEBT_CEILING_START_BIT_POSITION)
    });
    assertEq(config.getDebtCeiling(), debtCeiling);
  }

  function testSetLiquidationProtocolFee(uint256 data, uint256 liquidationProtocolFee) public {
    VM.assume(liquidationProtocolFee <= ReserveConfiguration.MAX_VALID_LIQUIDATION_PROTOCOL_FEE);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_MASK)
    });

    config.setLiquidationProtocolFee(liquidationProtocolFee);

    assertEq(
      (config.data & ~ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_MASK) >>
        ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION,
      liquidationProtocolFee
    );
  }

  function testFailSetLiquidationProtocolFee(uint256 data, uint256 liquidationProtocolFee) public {
    VM.assume(liquidationProtocolFee > ReserveConfiguration.MAX_VALID_LIQUIDATION_PROTOCOL_FEE);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.INVALID_LIQUIDATION_PROTOCOL_FEE));
    config.setLiquidationProtocolFee(liquidationProtocolFee);
  }

  function testGetLiquidationProtocolFee(uint256 data, uint256 liquidationProtocolFee) public {
    VM.assume(liquidationProtocolFee < type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_MASK) |
        (liquidationProtocolFee << ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION)
    });
    assertEq(config.getLiquidationProtocolFee(), liquidationProtocolFee);
  }

  function testSetUnbackedMintCap(uint256 data, uint256 unbackedMintCap) public {
    VM.assume(unbackedMintCap <= ReserveConfiguration.MAX_VALID_UNBACKED_MINT_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.UNBACKED_MINT_CAP_MASK)
    });

    config.setUnbackedMintCap(unbackedMintCap);

    assertEq(
      (config.data & ~ReserveConfiguration.UNBACKED_MINT_CAP_MASK) >>
        ReserveConfiguration.UNBACKED_MINT_CAP_START_BIT_POSITION,
      unbackedMintCap
    );
  }

  function testFailSetUnbackedMintCap(uint256 data, uint256 unbackedMintCap) public {
    VM.assume(unbackedMintCap > ReserveConfiguration.MAX_VALID_UNBACKED_MINT_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.UNBACKED_MINT_CAP_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.MAX_VALID_UNBACKED_MINT_CAP));
    config.setUnbackedMintCap(unbackedMintCap);
  }

  function testGetUnbackedMintCap(uint256 data, uint256 unbackedMintCap) public {
    VM.assume(unbackedMintCap < type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.UNBACKED_MINT_CAP_MASK) |
        (unbackedMintCap << ReserveConfiguration.UNBACKED_MINT_CAP_START_BIT_POSITION)
    });
    assertEq(config.getUnbackedMintCap(), unbackedMintCap);
  }

  function testSetEModeCategory(uint256 data, uint256 category) public {
    VM.assume(category <= ReserveConfiguration.MAX_VALID_EMODE_CATEGORY);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.EMODE_CATEGORY_MASK)
    });

    config.setEModeCategory(category);

    assertEq(
      (config.data & ~ReserveConfiguration.EMODE_CATEGORY_MASK) >>
        ReserveConfiguration.EMODE_CATEGORY_START_BIT_POSITION,
      category
    );
  }

  function testFailSetEModeCategory(uint256 data, uint256 category) public {
    VM.assume(category > ReserveConfiguration.MAX_VALID_EMODE_CATEGORY);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.EMODE_CATEGORY_MASK)
    });
    //TODO: VM.expectRevert(bytes(Errors.MAX_VALID_EMODE_CATEGORY));
    config.setEModeCategory(category);
  }

  function testGetEModeCategory(uint256 data, uint256 category) public {
    VM.assume(category < type(uint8).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.EMODE_CATEGORY_MASK) |
        (category << ReserveConfiguration.EMODE_CATEGORY_START_BIT_POSITION)
    });
    assertEq(config.getEModeCategory(), category);
  }

  function testGetFlags(uint256 data) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data
    });

    (bool active, bool frozen, bool borrowing, bool stableBorrowing, bool paused) = config
      .getFlags();

    assertEq(active, config.getActive());
    assertEq(frozen, config.getFrozen());
    assertEq(borrowing, config.getBorrowingEnabled());
    assertEq(stableBorrowing, config.getStableRateBorrowingEnabled());
    assertEq(paused, config.getPaused());
  }

  function testGetParams(uint256 data) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data
    });

    (
      uint256 ltv,
      uint256 liquidationThreshold,
      uint256 liquidationBonus,
      uint256 decimals,
      uint256 reserveFactor,
      uint256 category
    ) = config.getParams();

    assertEq(ltv, config.getLtv());
    assertEq(liquidationThreshold, config.getLiquidationThreshold());
    assertEq(liquidationBonus, config.getLiquidationBonus());
    assertEq(decimals, config.getDecimals());
    assertEq(reserveFactor, config.getReserveFactor());
    assertEq(category, config.getEModeCategory());
  }

  function testGetCaps(uint256 data) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data
    });
    (uint256 borrowCap, uint256 supplyCap) = config.getCaps();

    assertEq(borrowCap, config.getBorrowCap());
    assertEq(supplyCap, config.getSupplyCap());
  }
}
