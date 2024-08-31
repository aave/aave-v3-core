// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.10;

import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from './../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';
import {Errors} from './../../contracts/protocol/libraries/helpers/Errors.sol';

import {Test} from 'forge-std/Test.sol';

contract ReserveConfigurationTest is Test {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  function testSetLtv(uint256 data, uint256 ltv) public pure {
    ltv = bound(ltv, 0, type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data & ReserveConfiguration.LTV_MASK
    });
    config.setLtv(ltv);
    assertEq(config.data & ~ReserveConfiguration.LTV_MASK, ltv);
  }

  function testRevertSetLtv(uint256 data, uint256 ltv) public {
    ltv = bound(ltv, ReserveConfiguration.MAX_VALID_LTV + 1, type(uint256).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data & ReserveConfiguration.LTV_MASK
    });
    vm.expectRevert(bytes(Errors.INVALID_LTV));
    config.setLtv(ltv);
  }

  function testGetLtv(uint256 data, uint256 ltv) public pure {
    ltv = bound(ltv, 0, type(uint16).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LTV_MASK) | ltv
    });
    assertEq(config.getLtv(), ltv);
  }

  function testSetLiquidationThreshold(uint256 data, uint256 threshold) public pure {
    threshold = bound(threshold, 0, type(uint16).max);
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

  function testRevertSetLiquidationThreshold(uint256 data, uint256 threshold) public {
    threshold = bound(
      threshold,
      ReserveConfiguration.MAX_VALID_LIQUIDATION_THRESHOLD + 1,
      type(uint256).max
    );

    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_THRESHOLD_MASK)
    });

    vm.expectRevert(bytes(Errors.INVALID_LIQ_THRESHOLD));
    config.setLiquidationThreshold(threshold);
  }

  function testGetLiquidationThreshold(uint256 data, uint256 threshold) public pure {
    threshold = bound(threshold, 0, ReserveConfiguration.MAX_VALID_LIQUIDATION_THRESHOLD);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_THRESHOLD_MASK) |
        (threshold << ReserveConfiguration.LIQUIDATION_THRESHOLD_START_BIT_POSITION)
    });
    assertEq(config.getLiquidationThreshold(), threshold);
  }

  function testSetLiquidationBonus(uint256 data, uint256 bonus) public pure {
    bonus = bound(bonus, 0, ReserveConfiguration.MAX_VALID_LIQUIDATION_BONUS);
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

  function testRevertSetLiquidationBonus(uint256 data, uint256 bonus) public {
    bonus = bound(bonus, ReserveConfiguration.MAX_VALID_LIQUIDATION_BONUS + 1, type(uint256).max);

    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_BONUS_MASK)
    });

    vm.expectRevert(bytes(Errors.INVALID_LIQ_BONUS));
    config.setLiquidationBonus(bonus);
  }

  function testGetLiquidationBonus(uint256 data, uint256 bonus) public pure {
    bonus = bound(bonus, 0, ReserveConfiguration.MAX_VALID_LIQUIDATION_BONUS);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_BONUS_MASK) |
        (bonus << ReserveConfiguration.LIQUIDATION_BONUS_START_BIT_POSITION)
    });
    assertEq(config.getLiquidationBonus(), bonus);
  }

  function testSetDecimals(uint256 data, uint256 decimals) public pure {
    decimals = bound(decimals, 0, ReserveConfiguration.MAX_VALID_DECIMALS);
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

  function testRevertSetDecimals(uint256 data, uint256 decimals) public {
    decimals = bound(decimals, ReserveConfiguration.MAX_VALID_DECIMALS + 1, type(uint256).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DECIMALS_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_DECIMALS));
    config.setDecimals(decimals);
  }

  function testGetDecimals(uint256 data, uint256 decimals) public pure {
    decimals = bound(decimals, 0, ReserveConfiguration.MAX_VALID_DECIMALS);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DECIMALS_MASK) |
        (decimals << ReserveConfiguration.RESERVE_DECIMALS_START_BIT_POSITION)
    });
    assertEq(config.getDecimals(), decimals);
  }

  function testSetActive(uint256 data, bool active) public pure {
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

  function testGetActive(uint256 data, bool active) public pure {
    uint256 activeBit = active ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.ACTIVE_MASK) |
        (activeBit << ReserveConfiguration.IS_ACTIVE_START_BIT_POSITION)
    });
    assertEq(config.getActive(), active);
  }

  function testSetFrozen(uint256 data, bool frozen) public pure {
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

  function testGetFrozen(uint256 data, bool frozen) public pure {
    uint256 frozenBit = frozen ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.FROZEN_MASK) |
        (frozenBit << ReserveConfiguration.IS_FROZEN_START_BIT_POSITION)
    });
    assertEq(config.getFrozen(), frozen);
  }

  function testSetPaused(uint256 data, bool paused) public pure {
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

  function testGetPaused(uint256 data, bool paused) public pure {
    uint256 pausedBit = paused ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.PAUSED_MASK) |
        (pausedBit << ReserveConfiguration.IS_PAUSED_START_BIT_POSITION)
    });
    assertEq(config.getPaused(), paused);
  }

  function testSetBorrowableInIsolation(uint256 data, bool enabled) public pure {
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

  function testGetBorrowableInIsolation(uint256 data, bool enabled) public pure {
    uint256 isolationBorrowAble = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK) |
        (isolationBorrowAble << ReserveConfiguration.BORROWABLE_IN_ISOLATION_START_BIT_POSITION)
    });
    assertEq(config.getBorrowableInIsolation(), enabled);
  }

  function testSetSiloedBorrowing(uint256 data, bool enabled) public pure {
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

  function testGetSiloedBorrowing(uint256 data, bool enabled) public pure {
    uint256 siloedBorrowingBit = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SILOED_BORROWING_MASK) |
        (siloedBorrowingBit << ReserveConfiguration.SILOED_BORROWING_START_BIT_POSITION)
    });
    assertEq(config.getSiloedBorrowing(), enabled);
  }

  function testSetBorrowingEnabled(uint256 data, bool enabled) public pure {
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

  function testGetBorrowingEnabled(uint256 data, bool enabled) public pure {
    uint256 borrowingBit = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWING_MASK) |
        (borrowingBit << ReserveConfiguration.BORROWING_ENABLED_START_BIT_POSITION)
    });
    assertEq(config.getBorrowingEnabled(), enabled);
  }

  function testSetStableBorrowingEnabled(uint256 data, bool enabled) public pure {
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

  function testGetStableBorrowingEnabled(uint256 data, bool enabled) public pure {
    uint256 borrowingBit = enabled ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.STABLE_BORROWING_MASK) |
        (borrowingBit << ReserveConfiguration.STABLE_BORROWING_ENABLED_START_BIT_POSITION)
    });
    assertEq(config.getStableRateBorrowingEnabled(), enabled);
  }

  function testSetReserveFactor(uint256 data, uint256 reserveFactor) public pure {
    reserveFactor = bound(reserveFactor, 0, ReserveConfiguration.MAX_VALID_RESERVE_FACTOR);
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

  function testRevertSetReserveFactor(uint256 data, uint256 reserveFactor) public {
    reserveFactor = bound(
      reserveFactor,
      ReserveConfiguration.MAX_VALID_RESERVE_FACTOR + 1,
      type(uint256).max
    );
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.RESERVE_FACTOR_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_RESERVE_FACTOR));
    config.setReserveFactor(reserveFactor);
  }

  function testGetReserveFactor(uint256 data, uint256 reserveFactor) public pure {
    reserveFactor = bound(reserveFactor, 0, ReserveConfiguration.MAX_VALID_RESERVE_FACTOR);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.RESERVE_FACTOR_MASK) |
        (reserveFactor << ReserveConfiguration.RESERVE_FACTOR_START_BIT_POSITION)
    });
    assertEq(config.getReserveFactor(), reserveFactor);
  }

  function testSetBorrowCap(uint256 data, uint256 borrowCap) public pure {
    borrowCap = bound(borrowCap, 0, ReserveConfiguration.MAX_VALID_BORROW_CAP);
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

  function testRevertSetBorrowCap(uint256 data, uint256 borrowCap) public {
    borrowCap = bound(borrowCap, ReserveConfiguration.MAX_VALID_BORROW_CAP + 1, type(uint256).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROW_CAP_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_BORROW_CAP));
    config.setBorrowCap(borrowCap);
  }

  function testGetBorrowCap(uint256 data, uint256 borrowCap) public pure {
    borrowCap = bound(borrowCap, 0, ReserveConfiguration.MAX_VALID_BORROW_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROW_CAP_MASK) |
        (borrowCap << ReserveConfiguration.BORROW_CAP_START_BIT_POSITION)
    });
    assertEq(config.getBorrowCap(), borrowCap);
  }

  function testSetSupplyCap(uint256 data, uint256 supplyCap) public pure {
    supplyCap = bound(supplyCap, 0, ReserveConfiguration.MAX_VALID_SUPPLY_CAP);
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

  function testRevertSetSupplyCap(uint256 data, uint256 supplyCap) public {
    supplyCap = bound(supplyCap, ReserveConfiguration.MAX_VALID_SUPPLY_CAP + 1, type(uint256).max);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SUPPLY_CAP_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_SUPPLY_CAP));
    config.setSupplyCap(supplyCap);
  }

  function testGetSupplyCap(uint256 data, uint256 supplyCap) public pure {
    supplyCap = bound(supplyCap, 0, ReserveConfiguration.MAX_VALID_SUPPLY_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SUPPLY_CAP_MASK) |
        (supplyCap << ReserveConfiguration.SUPPLY_CAP_START_BIT_POSITION)
    });
    assertEq(config.getSupplyCap(), supplyCap);
  }

  function testSetDebtCeiling(uint256 data, uint256 debtCeiling) public pure {
    debtCeiling = bound(debtCeiling, 0, ReserveConfiguration.MAX_VALID_DEBT_CEILING);
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

  function testRevertSetDebtCeiling(uint256 data, uint256 debtCeiling) public {
    debtCeiling = bound(
      debtCeiling,
      ReserveConfiguration.MAX_VALID_DEBT_CEILING + 1,
      type(uint256).max
    );
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DEBT_CEILING_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_DEBT_CEILING));
    config.setDebtCeiling(debtCeiling);
  }

  function testGetDebtCeiling(uint256 data, uint256 debtCeiling) public pure {
    debtCeiling = bound(debtCeiling, 0, ReserveConfiguration.MAX_VALID_DEBT_CEILING);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.DEBT_CEILING_MASK) |
        (debtCeiling << ReserveConfiguration.DEBT_CEILING_START_BIT_POSITION)
    });
    assertEq(config.getDebtCeiling(), debtCeiling);
  }

  function testSetLiquidationProtocolFee(uint256 data, uint256 liquidationProtocolFee) public pure {
    liquidationProtocolFee = bound(
      liquidationProtocolFee,
      0,
      ReserveConfiguration.MAX_VALID_LIQUIDATION_PROTOCOL_FEE
    );
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

  function testRevertSetLiquidationProtocolFee(
    uint256 data,
    uint256 liquidationProtocolFee
  ) public {
    liquidationProtocolFee = bound(
      liquidationProtocolFee,
      ReserveConfiguration.MAX_VALID_LIQUIDATION_PROTOCOL_FEE + 1,
      type(uint256).max
    );
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_LIQUIDATION_PROTOCOL_FEE));
    config.setLiquidationProtocolFee(liquidationProtocolFee);
  }

  function testGetLiquidationProtocolFee(uint256 data, uint256 liquidationProtocolFee) public pure {
    liquidationProtocolFee = bound(
      liquidationProtocolFee,
      0,
      ReserveConfiguration.MAX_VALID_LIQUIDATION_PROTOCOL_FEE
    );
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_MASK) |
        (liquidationProtocolFee << ReserveConfiguration.LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION)
    });
    assertEq(config.getLiquidationProtocolFee(), liquidationProtocolFee);
  }

  function testSetUnbackedMintCap(uint256 data, uint256 unbackedMintCap) public pure {
    unbackedMintCap = bound(unbackedMintCap, 0, ReserveConfiguration.MAX_VALID_UNBACKED_MINT_CAP);
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

  function testRevertSetUnbackedMintCap(uint256 data, uint256 unbackedMintCap) public {
    unbackedMintCap = bound(
      unbackedMintCap,
      ReserveConfiguration.MAX_VALID_UNBACKED_MINT_CAP + 1,
      type(uint256).max
    );
    vm.assume(unbackedMintCap > ReserveConfiguration.MAX_VALID_UNBACKED_MINT_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.UNBACKED_MINT_CAP_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_UNBACKED_MINT_CAP));
    config.setUnbackedMintCap(unbackedMintCap);
  }

  function testGetUnbackedMintCap(uint256 data, uint256 unbackedMintCap) public pure {
    unbackedMintCap = bound(unbackedMintCap, 0, ReserveConfiguration.MAX_VALID_UNBACKED_MINT_CAP);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.UNBACKED_MINT_CAP_MASK) |
        (unbackedMintCap << ReserveConfiguration.UNBACKED_MINT_CAP_START_BIT_POSITION)
    });
    assertEq(config.getUnbackedMintCap(), unbackedMintCap);
  }

  function testSetEModeCategory(uint256 data, uint256 _category) public pure {
    uint256 category = bound(_category, 0, ReserveConfiguration.MAX_VALID_EMODE_CATEGORY);
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

  function testRevertSetEModeCategory(uint256 data, uint256 category) public {
    category = bound(
      category,
      ReserveConfiguration.MAX_VALID_EMODE_CATEGORY + 1,
      type(uint256).max
    );
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.EMODE_CATEGORY_MASK)
    });
    vm.expectRevert(bytes(Errors.INVALID_EMODE_CATEGORY));
    config.setEModeCategory(category);
  }

  function testGetEModeCategory(uint256 data, uint256 category) public pure {
    category = bound(category, 0, ReserveConfiguration.MAX_VALID_EMODE_CATEGORY);
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.EMODE_CATEGORY_MASK) |
        (category << ReserveConfiguration.EMODE_CATEGORY_START_BIT_POSITION)
    });
    assertEq(config.getEModeCategory(), category);
  }

  function testGetFlags(uint256 data) public pure {
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

  function testGetParams(uint256 data) public pure {
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

  function testGetCaps(uint256 data) public pure {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data
    });
    (uint256 borrowCap, uint256 supplyCap) = config.getCaps();

    assertEq(borrowCap, config.getBorrowCap());
    assertEq(supplyCap, config.getSupplyCap());
  }

  function testSetFlashloanEnabled(uint256 data) public pure {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: data
    });
    bool isFlashLoanEnabled = config.getFlashLoanEnabled();
    config.setFlashLoanEnabled(!isFlashLoanEnabled);
    assertEq(config.getFlashLoanEnabled(), !isFlashLoanEnabled);
  }
}
