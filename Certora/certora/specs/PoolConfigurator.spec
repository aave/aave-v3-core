methods {
  configureReserveAsCollateral(address, uint256, uint256, uint256) envfree
  getLtv(address) returns uint256 envfree 
  getLiquidationThreshold(address) returns uint256 envfree
  getLiquidationBonus(address) returns uint256 envfree
}

rule configureReserveAsCollateralIntegrity(address asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus) {
  configureReserveAsCollateral(asset, ltv, liquidationThreshold, liquidationThreshold);
  assert getLtv(asset) == ltv && 
         getLiquidationThreshold(asset) == liquidationThreshold &&
         getLiquidationBonus(asset) == liquidationBonus;   
}