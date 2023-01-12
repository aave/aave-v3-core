pragma solidity 0.8.10;
pragma experimental ABIEncoderV2;

import {ReserveConfiguration} from '../munged/protocol/libraries/configuration/ReserveConfiguration.sol';
import {DataTypes} from '../munged/protocol/libraries/types/DataTypes.sol';

contract ReserveConfigurationHarness {
    DataTypes.ReserveConfigurationMap public reservesConfig;
    mapping(uint256 => uint256) public intSettersUpperBounds;
    mapping(uint256 => uint256) public intSetterslowerBounds;
    mapping(uint256 => uint256) public boolSettersCompare;
    
    // Sets the Loan to Value of the reserve
    function setLtv(uint256 ltv) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setLtv(configNew, ltv);
        reservesConfig.data = configNew.data;
    }

    // Gets the Loan to Value of the reserve
    function getLtv() public view returns (uint256) {
        return ReserveConfiguration.getLtv(reservesConfig);
    }

    // Sets the liquidation threshold of the reserve
    function setLiquidationThreshold(uint256 threshold) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setLiquidationThreshold(configNew, threshold);
        reservesConfig.data = configNew.data;
    }

    // Gets the liquidation threshold of the reserve
    function getLiquidationThreshold() public view returns (uint256) {
        return ReserveConfiguration.getLiquidationThreshold(reservesConfig);
    }

    // Sets the liquidation bonus of the reserve
    function setLiquidationBonus(uint256 bonus) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setLiquidationBonus(configNew, bonus);
        reservesConfig.data = configNew.data;
    }

    // Gets the liquidation bonus of the reserve
    function getLiquidationBonus() public view returns (uint256) {
        return ReserveConfiguration.getLiquidationBonus(reservesConfig);
    }

    // Sets the decimals of the underlying asset of the reserve
    function setDecimals(uint256 decimals) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setDecimals(configNew, decimals);
        reservesConfig.data = configNew.data;
    }

    // Gets the decimals of the underlying asset of the reserve
    function getDecimals() public view returns (uint256) {
        return ReserveConfiguration.getDecimals(reservesConfig);
    }

    // Sets the active state of the reserve
    function setActive(bool active) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setActive(configNew, active);
        reservesConfig.data = configNew.data;
    }

    // Gets the active state of the reserve
    function getActive() public view returns (bool) {
        return ReserveConfiguration.getActive(reservesConfig);
    }

    // Sets the frozen state of the reserve
    function setFrozen(bool frozen) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setFrozen(configNew, frozen);
        reservesConfig.data = configNew.data;
    }

    // Gets the frozen state of the reserve
    function getFrozen() public view returns (bool) {
        return ReserveConfiguration.getFrozen(reservesConfig);
    }

    // Sets the paused state of the reserve
    function setPaused(bool paused) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setPaused(configNew, paused);
        reservesConfig.data = configNew.data;
    }

    // Gets the paused state of the reserve
    function getPaused() public view returns (bool) {
        return ReserveConfiguration.getPaused(reservesConfig);
    }

    // Sets the borrowable in isolation flag for the reserve.
    function setBorrowableInIsolation(bool borrowable) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setBorrowableInIsolation(configNew, borrowable);
        reservesConfig.data = configNew.data;
    }

    // Gets the borrowable in isolation flag for the reserve.
    function getBorrowableInIsolation() public view returns (bool) {
        return ReserveConfiguration.getBorrowableInIsolation(reservesConfig);
    }

    // Sets the siloed borrowing flag for the reserve.
    function setSiloedBorrowing(bool siloed) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setSiloedBorrowing(configNew, siloed);
        reservesConfig.data = configNew.data;
    }

    // Gets the siloed borrowing flag for the reserve.
    function getSiloedBorrowing() public view returns (bool) {
        return ReserveConfiguration.getSiloedBorrowing(reservesConfig);
    }

    // Enables or disables borrowing on the reserve
    function setBorrowingEnabled(bool enabled) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setBorrowingEnabled(configNew, enabled);
        reservesConfig.data = configNew.data;
    }

    // Gets the borrowing state of the reserve
    function getBorrowingEnabled() public view returns (bool) {
        return ReserveConfiguration.getBorrowingEnabled(reservesConfig);
    }

    // Enables or disables stable rate borrowing on the reserve
    function setStableRateBorrowingEnabled(bool enabled) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setStableRateBorrowingEnabled(configNew, enabled);
        reservesConfig.data = configNew.data;
    }

    // Gets the stable rate borrowing state of the reserve
    function getStableRateBorrowingEnabled() public view returns (bool) {
        return ReserveConfiguration.getStableRateBorrowingEnabled(reservesConfig);
    }

    // Sets the reserve factor of the reserve
    function setReserveFactor(uint256 reserveFactor) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setReserveFactor(configNew, reserveFactor);
        reservesConfig.data = configNew.data;
    }

    // Gets the reserve factor of the reserve
    function getReserveFactor() public view returns (uint256) {
        return ReserveConfiguration.getReserveFactor(reservesConfig);
    }

    // Sets the borrow cap of the reserve
    function setBorrowCap(uint256 borrowCap) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setBorrowCap(configNew, borrowCap);
        reservesConfig.data = configNew.data;
    }

    // Gets the borrow cap of the reserve
    function getBorrowCap() public view returns (uint256) {
        return ReserveConfiguration.getBorrowCap(reservesConfig);
    }

    // Sets the supply cap of the reserve
    function setSupplyCap(uint256 supplyCap) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setSupplyCap(configNew, supplyCap);
        reservesConfig.data = configNew.data;
    }

    // Gets the supply cap of the reserve
    function getSupplyCap() public view returns (uint256) {
        return ReserveConfiguration.getSupplyCap(reservesConfig);
    }

    // Sets the debt ceiling in isolation mode for the asset
    function setDebtCeiling(uint256 ceiling) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setDebtCeiling(configNew, ceiling);
        reservesConfig.data = configNew.data;
    }

    // Gets the debt ceiling for the asset if the asset is in isolation mode
    function getDebtCeiling() public view returns (uint256) {
        return ReserveConfiguration.getDebtCeiling(reservesConfig);
    }

    // Sets the liquidation protocol fee of the reserve
    function setLiquidationProtocolFee(uint256 liquidationProtocolFee) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setLiquidationProtocolFee(configNew, liquidationProtocolFee);
        reservesConfig.data = configNew.data;
    }

    // Gets the liquidation protocol fee
    function getLiquidationProtocolFee() public view returns (uint256) {
        return ReserveConfiguration.getLiquidationProtocolFee(reservesConfig);
    }

    // Sets the unbacked mint cap of the reserve
    function setUnbackedMintCap(uint256 unbackedMintCap) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setUnbackedMintCap(configNew, unbackedMintCap);
        reservesConfig.data = configNew.data;
    }

    // Gets the unbacked mint cap of the reserve
    function getUnbackedMintCap() public view returns (uint256) {
        return ReserveConfiguration.getUnbackedMintCap(reservesConfig);
    }

    // Sets the eMode asset category
    function setEModeCategory(uint256 category) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setEModeCategory(configNew, category);
        reservesConfig.data = configNew.data;
    }

    // Gets the eMode asset category
    function getEModeCategory() public view returns (uint256) {
        return ReserveConfiguration.getEModeCategory(reservesConfig);
    }

    // Sets the flashloanble flag for the reserve
    function setFlashLoanEnabled(bool flashLoanEnabled) public {
        DataTypes.ReserveConfigurationMap memory configNew = reservesConfig;
        ReserveConfiguration.setFlashLoanEnabled(configNew, flashLoanEnabled);
        reservesConfig.data = configNew.data;
    }

    // Gets the flashloanable flag for the reserve
    function getFlashLoanEnabled() public view returns (bool) {
        return ReserveConfiguration.getFlashLoanEnabled(reservesConfig);
    }

    // returns the entire data in form of unit256
    function getData() public view returns (uint256) {
        return reservesConfig.data;
    }

    // Executes a setter of an int parameter according to the given id
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

    // Executes a getter of an int parameter according to the given id
    function executeIntGetterById(uint256 id) public view returns(uint256) {
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

    // Executes a setter of a bool parameter according to the given id
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

    // Executes a getter of a bool parameter according to the given id
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
}