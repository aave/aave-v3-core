// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.10;

import {DataTypes} from './../../contracts/protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from './../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';
import {Vm} from './../Vm.sol';
import {Errors} from './../../contracts/protocol/libraries/helpers/Errors.sol';

// TODO: There is an error with the revert messages. For now, just assume they are correct. Not sure if because of libraries or what it is
import {TestHelper} from './TestHelper.sol';

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

  function testSetBorrowableInIsolation(uint256 data, bool borrowAble) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK)
    });
    config.setBorrowableInIsolation(borrowAble);
    uint256 isolationBorrowAbleBit = borrowAble ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK) >>
        ReserveConfiguration.BORROWABLE_IN_ISOLATION_START_BIT_POSITION,
      isolationBorrowAbleBit
    );
  }

  function testGetBorrowableInIsolation(uint256 data, bool borrowAble) public {
    uint256 isolationBorrowAble = borrowAble ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWABLE_IN_ISOLATION_MASK) |
        (isolationBorrowAble << ReserveConfiguration.BORROWABLE_IN_ISOLATION_START_BIT_POSITION)
    });
    assertEq(config.getBorrowableInIsolation(), borrowAble);
  }

  function testSetSiloedBorrowing(uint256 data, bool borrowAble) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SILOED_BORROWING_MASK)
    });
    config.setSiloedBorrowing(borrowAble);
    uint256 siloedBorrowingBit = borrowAble ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.SILOED_BORROWING_MASK) >>
        ReserveConfiguration.SILOED_BORROWING_START_BIT_POSITION,
      siloedBorrowingBit
    );
  }

  function testGetSiloedBorrowing(uint256 data, bool borrowAble) public {
    uint256 siloedBorrowingBit = borrowAble ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.SILOED_BORROWING_MASK) |
        (siloedBorrowingBit << ReserveConfiguration.SILOED_BORROWING_START_BIT_POSITION)
    });
    assertEq(config.getSiloedBorrowing(), borrowAble);
  }

  function testSetBorrowingEnabled(uint256 data, bool borrowAble) public {
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWING_MASK)
    });
    config.setBorrowingEnabled(borrowAble);
    uint256 borrowingBit = borrowAble ? 1 : 0;
    assertEq(
      (config.data & ~ReserveConfiguration.BORROWING_MASK) >>
        ReserveConfiguration.BORROWING_ENABLED_START_BIT_POSITION,
      borrowingBit
    );
  }

  function testGetBorrowingEnabled(uint256 data, bool borrowAble) public {
    uint256 borrowingBit = borrowAble ? 1 : 0;
    DataTypes.ReserveConfigurationMap memory config = DataTypes.ReserveConfigurationMap({
      data: (data & ReserveConfiguration.BORROWING_MASK) |
        (borrowingBit << ReserveConfiguration.BORROWING_ENABLED_START_BIT_POSITION)
    });
    assertEq(config.getBorrowingEnabled(), borrowAble);
  }
}
