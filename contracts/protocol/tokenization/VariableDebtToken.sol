// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {VersionedInitializable} from '../libraries/aave-upgradeability/VersionedInitializable.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IAaveIncentivesController} from '../../interfaces/IAaveIncentivesController.sol';
import {IInitializableDebtToken} from '../../interfaces/IInitializableDebtToken.sol';
import {IVariableDebtToken} from '../../interfaces/IVariableDebtToken.sol';
import {IScaledBalanceToken} from '../../interfaces/IScaledBalanceToken.sol';
import {DebtTokenBase} from './base/DebtTokenBase.sol';

/**
 * @title VariableDebtToken
 * @author Aave
 * @notice Implements a variable debt token to track the borrowing positions of users
 * at variable rate mode
 **/
contract VariableDebtToken is DebtTokenBase, IVariableDebtToken {
  using WadRayMath for uint256;

  uint256 public constant DEBT_TOKEN_REVISION = 0x2;

  IPool internal _pool;
  address internal _underlyingAsset;

  /// @inheritdoc IInitializableDebtToken
  function initialize(
    IPool pool,
    address underlyingAsset,
    IAaveIncentivesController incentivesController,
    uint8 debtTokenDecimals,
    string memory debtTokenName,
    string memory debtTokenSymbol,
    bytes calldata params
  ) public override initializer {
    uint256 chainId;

    //solium-disable-next-line
    assembly {
      chainId := chainid()
    }

    _setName(debtTokenName);
    _setSymbol(debtTokenSymbol);
    _setDecimals(debtTokenDecimals);

    _pool = pool;
    _underlyingAsset = underlyingAsset;
    _incentivesController = incentivesController;

    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        EIP712_DOMAIN,
        keccak256(bytes(debtTokenName)),
        keccak256(EIP712_REVISION),
        chainId,
        address(this)
      )
    );

    emit Initialized(
      underlyingAsset,
      address(pool),
      address(incentivesController),
      debtTokenDecimals,
      debtTokenName,
      debtTokenSymbol,
      params
    );
  }

  /// @inheritdoc VersionedInitializable
  function getRevision() internal pure virtual override returns (uint256) {
    return DEBT_TOKEN_REVISION;
  }

  /// @inheritdoc IERC20
  function balanceOf(address user) public view virtual override returns (uint256) {
    uint256 scaledBalance = super.balanceOf(user);

    if (scaledBalance == 0) {
      return 0;
    }

    return scaledBalance.rayMul(_pool.getReserveNormalizedVariableDebt(_underlyingAsset));
  }

  /// @inheritdoc IVariableDebtToken
  function mint(
    address user,
    address onBehalfOf,
    uint256 amount,
    uint256 index
  ) external override onlyPool returns (bool, uint256) {
    if (user != onBehalfOf) {
      _decreaseBorrowAllowance(onBehalfOf, user, amount);
    }

    uint256 amountScaled = amount.rayDiv(index);
    require(amountScaled != 0, Errors.CT_INVALID_MINT_AMOUNT);

    uint128 castAmount = _castUint128(amountScaled);
    uint128 castIndex = _castUint128(index);

    uint256 previousBalance = super.balanceOf(onBehalfOf);
    uint256 accumulatedDebt = _calculateAccruedInterest(previousBalance, onBehalfOf);

    _mint(onBehalfOf, castAmount);

    _userData[user].previousIndexOrStableRate = castIndex;

    emit Transfer(address(0), onBehalfOf, amount);
    emit Mint(user, onBehalfOf, amount + accumulatedDebt, index);

    return (previousBalance == 0, scaledTotalSupply());
  }

  /// @inheritdoc IVariableDebtToken
  function burn(
    address user,
    uint256 amount,
    uint256 index
  ) external override onlyPool returns (uint256) {
    uint256 amountScaled = amount.rayDiv(index);
    require(amountScaled != 0, Errors.CT_INVALID_BURN_AMOUNT);

    uint128 castAmount = _castUint128(amountScaled);
    uint128 castIndex = _castUint128(index);

    uint256 accumulatedInterest = _calculateAccruedInterest(super.balanceOf(user), user);

    _burn(user, castAmount);

    _userData[user].previousIndexOrStableRate = castIndex;

    emit Transfer(user, address(0), amount);
    emit Mint(user, user, accumulatedInterest, index);
    emit Burn(user, amount, index);
    return scaledTotalSupply();
  }

  /// @inheritdoc IScaledBalanceToken
  function scaledBalanceOf(address user) public view virtual override returns (uint256) {
    return super.balanceOf(user);
  }

  /// @inheritdoc IERC20
  function totalSupply() public view virtual override returns (uint256) {
    return super.totalSupply().rayMul(_pool.getReserveNormalizedVariableDebt(_underlyingAsset));
  }

  /// @inheritdoc IScaledBalanceToken
  function scaledTotalSupply() public view virtual override returns (uint256) {
    return super.totalSupply();
  }

  /// @inheritdoc IScaledBalanceToken
  function getScaledUserBalanceAndSupply(address user)
    external
    view
    override
    returns (uint256, uint256)
  {
    return (super.balanceOf(user), super.totalSupply());
  }

  /**
   * @notice Returns the address of the underlying asset of this debtToken (E.g. WETH for aWETH)
   * @return The address of the underlying asset
   **/
  function UNDERLYING_ASSET_ADDRESS() public view returns (address) {
    return _underlyingAsset;
  }

  /**
   * @notice Returns the address of the pool where this debtToken is used
   * @return The address of the Pool
   **/
  function POOL() public view returns (IPool) {
    return _pool;
  }

  /// @inheritdoc DebtTokenBase
  function _getUnderlyingAssetAddress() internal view override returns (address) {
    return _underlyingAsset;
  }

  /// @inheritdoc DebtTokenBase
  function _getPool() internal view override returns (IPool) {
    return _pool;
  }
}
