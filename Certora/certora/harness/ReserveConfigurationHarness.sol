pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {ReserveConfiguration} from '../../contracts/protocol/libraries/configuration/ReserveConfiguration.sol';
import {DataTypes} from '../../contracts/protocol/libraries/types/DataTypes.sol';

contract ReserveConfigurationHarness {
  DataTypes.ReserveConfigurationMap public reservesConfig;
  mapping(uint256 => uint256) public intSettersUpperBounds;
  mapping(uint256 => uint256) public intSetterslowerBounds;
  mapping(uint256 => uint256) public boolSettersCompare;
  
  function setLtv(uint256 ltv) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setLtv(configNew, ltv);
    reservesConfig.data = configNew.data;
  }

  function getLtv() public view returns (uint256) {
    return ReserveConfiguration.getLtv(reservesConfig);
  }

  function setLiquidationThreshold(uint256 threshold) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setLiquidationThreshold(configNew, threshold);
    reservesConfig.data = configNew.data;
  }

  function getLiquidationThreshold() public view returns (uint256) {
    return ReserveConfiguration.getLiquidationThreshold(reservesConfig);
  }

  function setLiquidationBonus(uint256 bonus) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setLiquidationBonus(configNew, bonus);
    reservesConfig.data = configNew.data;
  }

  function getLiquidationBonus() public view returns (uint256) {
    return ReserveConfiguration.getLiquidationBonus(reservesConfig);
  }

  function setDecimals(uint256 decimals) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setDecimals(configNew, decimals);
    reservesConfig.data = configNew.data;
  }

  function getDecimals() public view returns (uint256) {
    return ReserveConfiguration.getDecimals(reservesConfig);
  }

  function setActive(bool active) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setActive(configNew, active);
    reservesConfig.data = configNew.data;
  }

  function getActive() public view returns (bool) {
    return ReserveConfiguration.getActive(reservesConfig);
  }

  function setFrozen(bool frozen) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setFrozen(configNew, frozen);
    reservesConfig.data = configNew.data;
  }

  function getFrozen() public view returns (bool) {
    return ReserveConfiguration.getFrozen(reservesConfig);
  }

  function setPaused(bool paused) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setPaused(configNew, paused);
    reservesConfig.data = configNew.data;
  }

  function getPaused() public view returns (bool) {
    return ReserveConfiguration.getPaused(reservesConfig);
  }

  function setBorrowingEnabled(bool enabled) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setBorrowingEnabled(configNew, enabled);
    reservesConfig.data = configNew.data;
  }

  function getBorrowingEnabled() public view returns (bool) {
    return ReserveConfiguration.getBorrowingEnabled(reservesConfig);
  }

  function setStableRateBorrowingEnabled(bool enabled) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setStableRateBorrowingEnabled(configNew, enabled);
    reservesConfig.data = configNew.data;
  }

  function getStableRateBorrowingEnabled() public view returns (bool) {
    return ReserveConfiguration.getStableRateBorrowingEnabled(reservesConfig);
  }

  function setBorrowableInIsolation(bool borrowable) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setBorrowableInIsolation(configNew, borrowable);
    reservesConfig.data = configNew.data;
  }

  function getBorrowableInIsolation() public view returns (bool) {
    return ReserveConfiguration.getBorrowableInIsolation(reservesConfig);
  }

  function setReserveFactor(uint256 reserveFactor) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setReserveFactor(configNew, reserveFactor);
    reservesConfig.data = configNew.data;
  }

  function getReserveFactor() public view returns (uint256) {
    return ReserveConfiguration.getReserveFactor(reservesConfig);
  }

  function setBorrowCap(uint256 borrowCap) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setBorrowCap(configNew, borrowCap);
    reservesConfig.data = configNew.data;
  }

  function getBorrowCap() public view returns (uint256) {
    return ReserveConfiguration.getBorrowCap(reservesConfig);
  }

  function setSupplyCap(uint256 supplyCap) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setSupplyCap(configNew, supplyCap);
    reservesConfig.data = configNew.data;
  }

  function getSupplyCap() public view returns (uint256) {
    return ReserveConfiguration.getSupplyCap(reservesConfig);
  }

  function setDebtCeiling(uint256 ceiling) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setDebtCeiling(configNew, ceiling);
    reservesConfig.data = configNew.data;
  }

  function getDebtCeiling() public view returns (uint256) {
    return ReserveConfiguration.getDebtCeiling(reservesConfig);
  }

  function setLiquidationProtocolFee(uint256 liquidationProtocolFee) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setLiquidationProtocolFee(configNew, liquidationProtocolFee);
    reservesConfig.data = configNew.data;
  }

  function getLiquidationProtocolFee() public view returns (uint256) {
    return ReserveConfiguration.getLiquidationProtocolFee(reservesConfig);
  }

  function setUnbackedMintCap(uint256 unbackedMintCap) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setUnbackedMintCap(configNew, unbackedMintCap);
    reservesConfig.data = configNew.data;
  }

  function getUnbackedMintCap() public view returns (uint256) {
    return ReserveConfiguration.getUnbackedMintCap(reservesConfig);
  }

  function setEModeCategory(uint256 category) public {
    DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
    ReserveConfiguration.setEModeCategory(configNew, category);
    reservesConfig.data = configNew.data;
  }

  function getEModeCategory() public view returns (uint256) {
    return ReserveConfiguration.getEModeCategory(reservesConfig);
  }

  function init_state() public {}

  function getData() public view returns (uint256) {
    return reservesConfig.data;
  }

  function xorWithReserve(uint256 rhs) public view returns (uint256) {
    return reservesConfig.data ^ rhs;
  }

  function initMaps() public {
    intSetterslowerBounds[0] = 0; // ltv - START_BIT_POSITION = 0
    intSetterslowerBounds[1] = 65536; // liq threshold - START_BIT_POSITION = 16
    intSetterslowerBounds[2] = 4294967296; // liq bonus - START_BIT_POSITION = 32
    intSetterslowerBounds[3] = 281474976710656; // decimals - START_BIT_POSITION = 48
    intSetterslowerBounds[4] = 18446744073709551616; // reserve factor - START_BIT_POSITION = 64
    intSetterslowerBounds[5] = 1208925819614629174706176; // borrow cap - START_BIT_POSITION = 80
    intSetterslowerBounds[6] = 83076749736557242056487941267521536; // supply cap - START_BIT_POSITION = 116
    intSetterslowerBounds[7] = 5708990770823839524233143877797980545530986496; // liquidation fee - FEE_START_BIT_POSITION = 152
    intSetterslowerBounds[8] = 374144419156711147060143317175368453031918731001856; // emode category - START_BIT_POSITION = 168
    intSetterslowerBounds[9] = 95780971304118053647396689196894323976171195136475136; // unbacked mint cap - START_BIT_POSITION = 176
    intSetterslowerBounds[10] = 6582018229284824168619876730229402019930943462534319453394436096; // debt ceiling - START_BIT_POSITION = 212

    intSettersUpperBounds[0] = 65535; // ltv - 16 bits
    intSettersUpperBounds[1] = 4294901760; // liq threshold - 16 bits
    intSettersUpperBounds[2] = 281470681743360; // liq bonus - 16 bits
    intSettersUpperBounds[3] = 71776119061217280; // decimals - 8 bits
    intSettersUpperBounds[4] = 1208907372870555465154560; // reserve factor - 16 bits
    intSettersUpperBounds[5] = 83076749735348316236873312092815360; // borrow cap - 36 bits
    intSettersUpperBounds[6] = 5708990770740762774496586635741492604263464960; // supply cap - 36 bits
    intSettersUpperBounds[7] = 374138710165940323220619084031490655051373200015360; // liquidation fee - 16 bits
    intSettersUpperBounds[8] = 95406826884961342500336545879718955523139276405473280; // emode category - 8 bits
    intSettersUpperBounds[9] = 6582018229189043197315758676582005330734049138558148258257960960; // unbacked mint cap - 36 bits
    intSettersUpperBounds[10] = 7237005577325680195743901738874374364099144639582604309003564681041176166400; // debt ceiling - 40 bits

    boolSettersCompare[0] = 72057594037927936; // active - START_BIT_POSITION = 56
    boolSettersCompare[1] = 144115188075855872; // frozen - START_BIT_POSITION = 57
    boolSettersCompare[2] = 288230376151711744; // borrowing enabled - START_BIT_POSITION = 58
    boolSettersCompare[3] = 576460752303423488; // stable rate borrowing enabled - START_BIT_POSITION = 59
    boolSettersCompare[4] = 1152921504606846976; // paused - START_BIT_POSITION = 60
    boolSettersCompare[5] = 2305843009213693952; // borrowable in isolation - START_BIT_POSITION = 61
  }

  function executeIntSetterById(uint256 id, uint256 val) public {
    require(id >= 0 && id <= 10);
    if (id == 0) {
      setLtv(val);
    } else if (id == 1) {
      setLiquidationThreshold(val);
    } else if (id == 2) {
      setLiquidationBonus(val);
    } else if (id == 3) {
      setDecimals(val);
    } else if (id == 4) {
      setReserveFactor(val);
    } else if (id == 5) {
      setBorrowCap(val);
    } else if (id == 6) {
      setSupplyCap(val);
    } else if (id == 7) {
      setLiquidationProtocolFee(val);
    } else if (id == 8) {
      setEModeCategory(val);
    } else if (id == 9) {
      setUnbackedMintCap(val);
    } else {
      setDebtCeiling(val);
    }
  }

  function executeIntGetterById(uint256 id) public returns(uint256) {
    require(id >= 0 && id <= 10);
    if (id == 0) {
      return getLtv();
    } else if (id == 1) {
      return getLiquidationThreshold();
    } else if (id == 2) {
      return getLiquidationBonus();
    } else if (id == 3) {
      return getDecimals();
    } else if (id == 4) {
      return getReserveFactor();
    } else if (id == 5) {
      return getBorrowCap();
    } else if (id == 6) {
      return getSupplyCap();
    } else if (id == 7) {
      return getLiquidationProtocolFee();
    } else if (id == 8) {
      return getEModeCategory();
    } else if (id == 9) {
      return getUnbackedMintCap();
    } else {
      return getDebtCeiling();
    }
  }

  function executeBoolSetterById(uint256 id, bool val) public {
    require(id >= 0 && id <= 5);
    if (id == 0) {
      setActive(val);
    } else if (id == 1) {
      setFrozen(val);
    } else if (id == 2) {
      setBorrowingEnabled(val);
    } else if (id == 3) {
      setStableRateBorrowingEnabled(val);
    } else if (id == 4) {
      setPaused(val);
    } else {
      setBorrowableInIsolation(val);
    }
  }

  function executeBoolGetterById(uint256 id) public view returns(bool) {
    require(id >= 0 && id <= 5);
    if (id == 0) {
      return getActive();
    } else if (id == 1) {
      return getFrozen();
    } else if (id == 2) {
      return getBorrowingEnabled();
    } else if (id == 3) {
      return getStableRateBorrowingEnabled();
    } else if (id == 4) {
      return getPaused();
    } else {
      return getBorrowableInIsolation();
    }
  }

  function getIntSetterLowerBound(uint256 i) public view returns (uint256) {
    return intSetterslowerBounds[i];
  }

  function getIntSetterUpperBound(uint256 i) public view returns (uint256) {
    return intSettersUpperBounds[i];
  }

  function getBoolSetterCompare(uint256 i) public view returns (uint256) {
    return boolSettersCompare[i];
  }
}
