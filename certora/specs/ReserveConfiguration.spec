methods {
    setLtv(uint256) envfree
    getLtv() returns (uint256) envfree
    setLiquidationThreshold(uint256) envfree
    getLiquidationThreshold() returns (uint256) envfree
    setLiquidationBonus(uint256) envfree
    getLiquidationBonus() returns (uint256) envfree
    setDecimals(uint256) envfree
    getDecimals() returns (uint256) envfree
    setActive(bool) envfree
    getActive() returns (bool) envfree
    setFrozen(bool) envfree
    getFrozen() returns (bool) envfree
    setPaused(bool) envfree
    getPaused() returns (bool) envfree
    setBorrowableInIsolation(bool) envfree
    getBorrowableInIsolation() returns (bool) envfree
    setSiloedBorrowing(bool) envfree
    getSiloedBorrowing() envfree
    setBorrowingEnabled(bool) envfree
    getBorrowingEnabled() returns (bool) envfree
    setStableRateBorrowingEnabled(bool) envfree
    getStableRateBorrowingEnabled() returns (bool) envfree
    setReserveFactor(uint256) envfree
    getReserveFactor() returns (uint256) envfree
    setBorrowCap(uint256) envfree
    getBorrowCap() returns (uint256) envfree
    setSupplyCap(uint256) envfree
    getSupplyCap() returns (uint256) envfree
    setDebtCeiling(uint256) envfree
    getDebtCeiling() returns (uint256) envfree
    setLiquidationProtocolFee(uint256) envfree
    getLiquidationProtocolFee() returns (uint256) envfree
    setUnbackedMintCap(uint256) envfree
    getUnbackedMintCap() returns (uint256) envfree
    setEModeCategory(uint256) envfree
    getEModeCategory() returns (uint256) envfree
    setFlashLoanEnabled(bool) envfree
    getFlashLoanEnabled() returns (bool) envfree
    getFlags() returns (bool, bool, bool, bool, bool) envfree
    getParams() returns (uint256, uint256, uint256, uint256, uint256, uint256) envfree
    getCaps() returns (uint256, uint256) envfree

    init_state() envfree
    getData() returns uint256 envfree
    xorWithReserve(uint256) returns uint256 envfree 
    initMaps() envfree
    
    getIntSetterLowerBound(uint256) returns uint256 envfree
    getIntSetterUpperBound(uint256) returns uint256 envfree
    executeIntSetterById(uint256, uint256) envfree
    executeIntGetterById(uint256) returns uint256 envfree

    getBoolSetterCompare(uint256) returns uint256 envfree
    executeBoolSetterById(uint256, bool) envfree
    executeBoolGetterById(uint256) returns bool envfree
}


// checks the integrity of set LTV function and correct retrieval of the corresponding getter.
rule setLtvIntegrity(uint256 ltv) {
    setLtv(ltv);
    assert getLtv() == ltv;
}

// checks the integrity of set LiquidationThreshold function and correct retrieval of the corresponding getter.
rule setLiquidationThresholdIntegrity(uint256 threshold) {
    setLiquidationThreshold(threshold);
    assert getLiquidationThreshold() == threshold;
}

// checks the integrity of set LiquidationBonus function and correct retrieval of the corresponding getter.
rule setLiquidationBonusIntegrity(uint256 bonus) {
    setLiquidationBonus(bonus);
    assert getLiquidationBonus() == bonus;
}

// checks the integrity of set Decimals function and correct retrieval of the corresponding getter.
rule setDecimalsIntegrity(uint256 decimals) {
    setDecimals(decimals);
    assert getDecimals() == decimals;
}

// checks the integrity of set Active function and correct retrieval of the corresponding getter.
rule setActiveIntegrity(bool active) {
    setActive(active);
    assert getActive() == active;
}

// checks the integrity of set Frozen function and correct retrieval of the corresponding getter.
rule setFrozenIntegrity(bool frozen) {
    setFrozen(frozen);
    assert getFrozen() == frozen;
}

// checks the integrity of set Paused function and correct retrieval of the corresponding getter.
rule setPausedIntegrity(bool paused) {
    setPaused(paused);
    assert getPaused() == paused;
}

// checks the integrity of set BorrowableInIsolation function and correct retrieval of the corresponding getter.
rule setBorrowableInIsolationIntegrity(bool borrowable) {
    setBorrowableInIsolation(borrowable);
    assert getBorrowableInIsolation() == borrowable;
}

// checks the integrity of set SiloedBorrowing function and correct retrieval of the corresponding getter.
rule setSiloedBorrowingIntegrity(bool siloed) {
    setSiloedBorrowing(siloed);
    assert getSiloedBorrowing() == siloed;
}

// checks the integrity of set BorrowingEnabled function and correct retrieval of the corresponding getter.
rule setBorrowingEnabledIntegrity(bool enabled) {
    setBorrowingEnabled(enabled);
    assert getBorrowingEnabled() == enabled;
}

// checks the integrity of set StableRateBorrowingEnabled function and correct retrieval of the corresponding getter.
rule setStableRateBorrowingEnabledIntegrity(bool enabled) {
    setStableRateBorrowingEnabled(enabled);
    assert getStableRateBorrowingEnabled() == enabled;
}

// checks the integrity of set ReserveFactor function and correct retrieval of the corresponding getter.
rule setReserveFactorIntegrity(uint256 reserveFactor) {
    setReserveFactor(reserveFactor);
    assert getReserveFactor() == reserveFactor;
}

// checks the integrity of set BorrowCap function and correct retrieval of the corresponding getter.
rule setBorrowCapIntegrity(uint256 borrowCap) {
    setBorrowCap(borrowCap);
    assert getBorrowCap() == borrowCap;
}

// checks the integrity of set SupplyCap function and correct retrieval of the corresponding getter.
rule setSupplyCapIntegrity(uint256 supplyCap) {
    setSupplyCap(supplyCap);
    assert getSupplyCap() == supplyCap;
}

// checks the integrity of set DebtCeiling function and correct retrieval of the corresponding getter.
rule setDebtCeilingIntegrity(uint256 ceiling) {
    setDebtCeiling(ceiling);
    assert getDebtCeiling() == ceiling;
}

// checks the integrity of set LiquidationProtocolFee function and correct retrieval of the corresponding getter.
rule setLiquidationProtocolFeeIntegrity(uint256 liquidationProtocolFee) {
    setLiquidationProtocolFee(liquidationProtocolFee);
    assert getLiquidationProtocolFee() == liquidationProtocolFee;
}

// checks the integrity of set UnbackedMintCap function and correct retrieval of the corresponding getter.
rule setUnbackedMintCapIntegrity(uint256 unbackedMintCap) {
    setUnbackedMintCap(unbackedMintCap);
    assert getUnbackedMintCap() == unbackedMintCap;
}

// checks the integrity of set EModeCategory function and correct retrieval of the corresponding getter.
rule setEModeCategoryIntegrity(uint256 category) {
    setEModeCategory(category);
    assert getEModeCategory() == category;
}

// checks for independence of int parameters - if one parameter is being set, non of the others is being changed
rule integrityAndIndependencyOfIntSetters(uint256 funcId, uint256 otherFuncId, uint256 val) {
    
    require 0 <= funcId && funcId <= 10;
    require 0 <= otherFuncId && otherFuncId <= 10;
    uint256 valueBefore = executeIntGetterById(funcId);
    uint256 otherValueBefore = executeIntGetterById(otherFuncId);

    executeIntSetterById(funcId, val);

    uint256 valueAfter = executeIntGetterById(funcId);
    uint256 otherValueAfter = executeIntGetterById(otherFuncId);

    assert valueAfter == val;
    assert (otherFuncId != funcId => otherValueAfter == otherValueBefore);
}

// checks for independence of bool parameters - if one parameter is being set, non of the others is being changed
rule integrityAndIndependencyOfBoolSetters(uint256 funcId, uint256 otherFuncId, bool val) {
    
    require 0 <= funcId && funcId <= 10;
    require 0 <= otherFuncId && otherFuncId <= 10;
    bool valueBefore = executeBoolGetterById(funcId);
    bool otherValueBefore = executeBoolGetterById(otherFuncId);
    
    executeBoolSetterById(funcId, val);

    bool valueAfter = executeBoolGetterById(funcId);
    bool otherValueAfter = executeBoolGetterById(otherFuncId);

    assert valueAfter == val;
    assert (otherFuncId != funcId => otherValueAfter == otherValueBefore);
}
