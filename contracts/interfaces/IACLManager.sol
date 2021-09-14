// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

/**
 * @title IACLManager
 * @author Aave
 * @notice Defines the basic interface for the ACL Manager
 **/
interface IACLManager {
  function POOL_ADMIN_ROLE() external view returns (bytes32);

  function EMERGENCY_ADMIN_ROLE() external view returns (bytes32);

  function RISK_ADMIN_ROLE() external view returns (bytes32);

  function FLASH_BORROWER_ROLE() external view returns (bytes32);

  function BRIDGE_ROLE() external view returns (bytes32);

  /**
   * @notice Set the role as admin of a specific role.
   * @dev By default the admin role for all roles is `DEFAULT_ADMIN_ROLE`.
   * @param role The role to be managed by the admin role
   * @param adminRole The admin role
   */
  function setRoleAdmin(bytes32 role, bytes32 adminRole) external;

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

  function addBridge(address bridge) external;

  function removeBridge(address bridge) external;

  function isBridge(address bridge) external view returns (bool);
}
