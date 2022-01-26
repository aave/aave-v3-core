methods {
  setLtv(uint256) envfree
  getLtv() returns uint256 envfree
  setLiquidationThreshold(uint256) envfree
  getLiquidationThreshold() returns uint256 envfree
  setLiquidationBonus(uint256) envfree
  getLiquidationBonus() returns uint256 envfree
  setDecimals(uint256) envfree
  getDecimals() returns uint256 envfree
  setActive(bool) envfree
  getActive() returns bool envfree
  setFrozen(bool) envfree
  getFrozen() returns bool envfree
  setPaused(bool) envfree
  getPaused() returns bool envfree
  setBorrowingEnabled(bool) envfree
  getBorrowingEnabled() returns bool envfree
  setStableRateBorrowingEnabled(bool) envfree
  getStableRateBorrowingEnabled() returns bool envfree
  setBorrowableInIsolation(bool) envfree
  getBorrowableInIsolation() returns bool envfree
  setReserveFactor(uint256) envfree
  getReserveFactor() returns uint256 envfree
  setBorrowCap(uint256) envfree
  getBorrowCap() returns uint256 envfree
  setSupplyCap(uint256) envfree
  getSupplyCap() returns uint256 envfree
  setDebtCeiling(uint256) envfree
  getDebtCeiling() returns uint256 envfree
  setLiquidationProtocolFee(uint256) envfree
  getLiquidationProtocolFee() returns uint256 envfree
  setUnbackedMintCap(uint256) envfree
  getUnbackedMintCap() returns uint256 envfree
  setEModeCategory(uint256) envfree
  getEModeCategory() returns uint256 envfree

  xorWithReserve(uint256) returns uint256 envfree 
  initMaps() envfree
  getData() returns uint256 envfree
  init_state() envfree
  
  getIntSetterLowerBound(uint256) returns uint256 envfree
  getIntSetterUpperBound(uint256) returns uint256 envfree
  executeIntSetterById(uint256, uint256) envfree
  executeIntGetterById(uint256) returns uint256 envfree

  getBoolSetterCompare(uint256) returns uint256 envfree
  executeBoolSetterById(uint256, bool) envfree
  executeBoolGetterById(uint256) returns bool envfree
}

rule setLtvIntegrity(uint256 ltv) {
  setLtv(ltv);
  assert getLtv() == ltv;
}

rule setLiquidationThresholdIntegrity(uint256 threshold) {
  setLiquidationThreshold(threshold);
  assert getLiquidationThreshold() == threshold;
}

rule setLiquidationBonusIntegrity(uint256 bonus) {
  setLiquidationBonus(bonus);
  assert getLiquidationBonus() == bonus;
}

rule setDecimalsIntegrity(uint256 decimals) {
  setDecimals(decimals);
  assert getDecimals() == decimals;
}

rule setActiveIntegrity(bool active) {
  setActive(active);
  assert getActive() == active;
}

rule setFrozenIntegrity(bool frozen) {
  setFrozen(frozen);
  assert getFrozen() == frozen;
}

rule setPausedIntegrity(bool paused) {
  setPaused(paused);
  assert getPaused() == paused;
}

rule setBorrowingEnabledIntegrity(bool enabled) {
  setBorrowingEnabled(enabled);
  assert getBorrowingEnabled() == enabled;
}

rule setStableRateBorrowingEnabledIntegrity(bool enabled) {
  setStableRateBorrowingEnabled(enabled);
  assert getStableRateBorrowingEnabled() == enabled;
}

rule setBorrowableInIsolationIntegrity(bool borrowable) {
  setBorrowableInIsolation(borrowable);
  assert getBorrowableInIsolation() == borrowable;
}

rule setReserveFactorIntegrity(uint256 reserveFactor) {
  setReserveFactor(reserveFactor);
  assert getReserveFactor() == reserveFactor;
}

rule setBorrowCapIntegrity(uint256 borrowCap) {
  setBorrowCap(borrowCap);
  assert getBorrowCap() == borrowCap;
}

rule setSupplyCapIntegrity(uint256 supplyCap) {
  setSupplyCap(supplyCap);
  assert getSupplyCap() == supplyCap;
}

rule setDebtCeilingIntegrity(uint256 ceiling) {
  setDebtCeiling(ceiling);
  assert getDebtCeiling() == ceiling;
}

rule setLiquidationProtocolFeeIntegrity(uint256 liquidationProtocolFee) {
  setLiquidationProtocolFee(liquidationProtocolFee);
  assert getLiquidationProtocolFee() == liquidationProtocolFee;
}

rule setUnbackedMintCapIntegrity(uint256 unbackedMintCap) {
  setUnbackedMintCap(unbackedMintCap);
  assert getUnbackedMintCap() == unbackedMintCap;
}

rule setEModeCategoryIntegrity(uint256 category) {
  setEModeCategory(category);
  assert getEModeCategory() == category;
}

rule changeOfIntSetters(uint256 funcId, uint256 val) {
  
  require 0 <= funcId && funcId <= 10;
  
  initMaps();
  uint256 dataBefore = getData();
  uint256 valueBefore = executeIntGetterById(funcId);
  
  executeIntSetterById(funcId, val);
  
  uint256 dataAfter = getData();
  uint256 xored = xorWithReserve(dataBefore);
  uint256 lowerBoundF = getIntSetterLowerBound(funcId);
  uint256 upperBoundF = getIntSetterUpperBound(funcId);
  
  assert (val == valueBefore => xored == 0) &&
         (val != valueBefore => (xored >= lowerBoundF && xored <= upperBoundF));
}

rule changeOfBoolSetters(uint256 funcId, bool val) {
  require 0 <= funcId && funcId <= 10;
  
  initMaps();
  uint256 dataBefore = getData();
  bool valueBefore = executeBoolGetterById(funcId);
  
  executeBoolSetterById(funcId, val);
  
  uint256 dataAfter = getData();
  uint256 xored = xorWithReserve(dataBefore);
  uint256 compareWith = getBoolSetterCompare(funcId);
  
  assert (val == valueBefore => xored == 0) &&
         (val != valueBefore => xored == compareWith);
}