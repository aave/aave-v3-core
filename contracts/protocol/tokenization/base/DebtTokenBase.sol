// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {Errors} from '../../libraries/helpers/Errors.sol';
import {VersionedInitializable} from '../../libraries/aave-upgradeability/VersionedInitializable.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {ICreditDelegationToken} from '../../../interfaces/ICreditDelegationToken.sol';
import {IncentivizedERC20} from '../IncentivizedERC20.sol';

/**
 * @title DebtTokenBase
 * @author Aave
 * @notice Base contract for different types of debt tokens, like StableDebtToken or VariableDebtToken
 * @dev Transfer and approve functionalities are disabled since its a non-transferable token.
 */
abstract contract DebtTokenBase is
  IncentivizedERC20,
  VersionedInitializable,
  ICreditDelegationToken
{
  mapping(address => mapping(address => uint256)) internal _borrowAllowances;
  bytes32 public constant DELEGATION_WITH_SIG_TYPEHASH =
    keccak256(
      'DelegationWithSig(address delegator,address delegatee,uint256 value,uint256 nonce,uint256 deadline)'
    );
  mapping(address => uint256) public _nonces;
  IPool internal immutable _pool;

  /**
   * @dev Only pool can call functions marked by this modifier
   **/
  modifier onlyPool() {
    require(_msgSender() == address(_pool), Errors.CT_CALLER_MUST_BE_POOL);
    _;
  }

  constructor(IPool pool)
    IncentivizedERC20(pool.getAddressesProvider(), 'DEBT_TOKEN_IMPL', 'DEBT_TOKEN_IMPL', 0)
  {
    _pool = pool;
  }

  /// @inheritdoc ICreditDelegationToken
  function approveDelegation(address delegatee, uint256 amount) external override {
    _approveDelegation(_msgSender(), delegatee, amount);
  }

  /**
   * @notice Implements the credit delegation with ERC712 signature
   * @param delegator The delegator of the credit
   * @param delegatee The delegatee that can use the credit
   * @param value The amount to be delegated
   * @param deadline The deadline timestamp, type(uint256).max for max deadline
   * @param v The V signature param
   * @param s The S signature param
   * @param r The R signature param
   */
  function delegationWithSig(
    address delegator,
    address delegatee,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    require(delegator != address(0), 'INVALID_DELEGATOR');
    //solium-disable-next-line
    require(block.timestamp <= deadline, 'INVALID_EXPIRATION');
    uint256 currentValidNonce = _nonces[delegator];
    bytes32 digest = keccak256(
      abi.encodePacked(
        '\x19\x01',
        DOMAIN_SEPARATOR(),
        keccak256(
          abi.encode(
            DELEGATION_WITH_SIG_TYPEHASH,
            delegator,
            delegatee,
            value,
            currentValidNonce,
            deadline
          )
        )
      )
    );
    require(delegator == ecrecover(digest, v, r, s), 'INVALID_SIGNATURE');
    _nonces[delegator] = currentValidNonce + 1;
    _approveDelegation(delegator, delegatee, value);
  }

  /// @inheritdoc ICreditDelegationToken
  function borrowAllowance(address fromUser, address toUser)
    external
    view
    override
    returns (uint256)
  {
    return _borrowAllowances[fromUser][toUser];
  }

  /**
   * @notice Returns the address of the underlying asset of this debt token
   * @dev For internal usage in the logic of the parent contracts
   * @return The address of the underlying asset
   **/
  function _getUnderlyingAssetAddress() internal view virtual returns (address);

  /**
   * @notice Returns the address of the pool where this debtToken is used
   * @return The address of the Pool
   **/
  function POOL() external view returns (IPool) {
    return _pool;
  }

  /**
   * @dev Being non transferrable, the debt token does not implement any of the
   * standard ERC20 functions for transfer and allowance.
   **/
  function transfer(address, uint256) external virtual override returns (bool) {
    revert('TRANSFER_NOT_SUPPORTED');
  }

  function allowance(address, address) external view virtual override returns (uint256) {
    revert('ALLOWANCE_NOT_SUPPORTED');
  }

  function approve(address, uint256) external virtual override returns (bool) {
    revert('APPROVAL_NOT_SUPPORTED');
  }

  function transferFrom(
    address,
    address,
    uint256
  ) external virtual override returns (bool) {
    revert('TRANSFER_NOT_SUPPORTED');
  }

  function increaseAllowance(address, uint256) external virtual override returns (bool) {
    revert('ALLOWANCE_NOT_SUPPORTED');
  }

  function decreaseAllowance(address, uint256) external virtual override returns (bool) {
    revert('ALLOWANCE_NOT_SUPPORTED');
  }

  function _approveDelegation(
    address delegator,
    address delegatee,
    uint256 amount
  ) internal {
    _borrowAllowances[delegator][delegatee] = amount;
    emit BorrowAllowanceDelegated(delegator, delegatee, _getUnderlyingAssetAddress(), amount);
  }

  function _decreaseBorrowAllowance(
    address delegator,
    address delegatee,
    uint256 amount
  ) internal {
    uint256 newAllowance = _borrowAllowances[delegator][delegatee] - amount;

    _borrowAllowances[delegator][delegatee] = newAllowance;

    emit BorrowAllowanceDelegated(delegator, delegatee, _getUnderlyingAssetAddress(), newAllowance);
  }
}
