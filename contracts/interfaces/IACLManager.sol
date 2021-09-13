// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

/**
 * @title IACLManager
 * @author Aave
 **/
interface IACLManager {
  function POOL_ADMIN_ROLE() external view returns (bytes32);

  function EMERGENCY_ADMIN_ROLE() external view returns (bytes32);

  function RISK_ADMIN_ROLE() external view returns (bytes32);

  function FLASH_BORROWER_ROLE() external view returns (bytes32);

  function BRIDGE_MANAGER_ROLE() external view returns (bytes32);

  function addPoolAdmin(address admin) external;

  function removePoolAdmin(address admin) external;

  function isPoolAdmin(address admin) external view returns (bool);

  function addEmergencyAdmin(address admin) external;

  function removeEmergencyAdmin(address admin) external;

  function isEmergencyAdmin(address admin) external view returns (bool);

  function addRiskAdmin(address admin) external;

  function removeRiskAdmin(address admin) external;

  function isRiskAdmin(address admin) external view returns (bool);

  function addFlashBorrower(address borrower) external;

  function removeFlashBorrower(address borrower) external;

  function isFlashBorrower(address borrower) external view returns (bool);
}
