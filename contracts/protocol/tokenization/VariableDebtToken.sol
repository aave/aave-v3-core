// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {VersionedInitializable} from '../libraries/aave-upgradeability/VersionedInitializable.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {Helpers} from '../libraries/helpers/Helpers.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IAaveIncentivesController} from '../../interfaces/IAaveIncentivesController.sol';
import {IInitializableDebtToken} from '../../interfaces/IInitializableDebtToken.sol';
import {IVariableDebtToken} from '../../interfaces/IVariableDebtToken.sol';
import {IScaledBalanceToken} from '../../interfaces/IScaledBalanceToken.sol';
import {DebtTokenBase} from './base/DebtTokenBase.sol';
import {IncentivizedERC20} from './IncentivizedERC20.sol';

/**
 * @title VariableDebtToken
 * @author Aave
 * @notice Implements a variable debt token to track the borrowing positions of users
 * at variable rate mode
 **/
contract VariableDebtToken is DebtTokenBase, IVariableDebtToken {
  using WadRayMath for uint256;

  uint256 public constant DEBT_TOKEN_REVISION = 0x2;
  address internal _underlyingAsset;

  constructor(IPool pool) DebtTokenBase(pool) {}

  /// @inheritdoc IInitializableDebtToken
  function initialize(
    address underlyingAsset,
    IAaveIncentivesController incentivesController,
    uint8 debtTokenDecimals,
    string memory debtTokenName,
    string memory debtTokenSymbol,
    bytes calldata params
  ) external override initializer {
    _setName(debtTokenName);
    _setSymbol(debtTokenSymbol);
    _setDecimals(debtTokenDecimals);

    _underlyingAsset = underlyingAsset;
    _incentivesController = incentivesController;

    _domainSeparator = _calculateDomainSeparator();

    emit Initialized(
      underlyingAsset,
      address(POOL),
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

    return scaledBalance.rayMul(POOL.getReserveNormalizedVariableDebt(_underlyingAsset));
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

    uint256 scaledBalance = super.balanceOf(onBehalfOf);
    uint256 accumulatedInterest = scaledBalance.rayMul(index) -
      scaledBalance.rayMul(_userState[onBehalfOf].additionalData);

    _userState[onBehalfOf].additionalData = Helpers.castUint128(index);

    _mint(onBehalfOf, Helpers.castUint128(amountScaled));

    emit Transfer(address(0), onBehalfOf, amount + accumulatedInterest);
    emit Mint(user, onBehalfOf, amount + accumulatedInterest, index);

    return (scaledBalance == 0, scaledTotalSupply());
  }

  /// @inheritdoc IVariableDebtToken
  function burn(
    address user,
    uint256 amount,
    uint256 index
  ) external override onlyPool returns (uint256) {
    uint256 amountScaled = amount.rayDiv(index);
    require(amountScaled != 0, Errors.CT_INVALID_BURN_AMOUNT);

    uint256 scaledBalance = super.balanceOf(user);
    uint256 accumulatedInterest = scaledBalance.rayMul(index) -
      scaledBalance.rayMul(_userState[user].additionalData);

    _userState[user].additionalData = Helpers.castUint128(index);

    _burn(user, Helpers.castUint128(amountScaled));

    if (accumulatedInterest > amount) {
      emit Transfer(address(0), user, accumulatedInterest - amount);
      emit Mint(user, user, accumulatedInterest - amount, index);
    } else {
      emit Transfer(user, address(0), amount - accumulatedInterest);
      emit Burn(user, amount - accumulatedInterest, index);
    }
    return scaledTotalSupply();
  }

  /// @inheritdoc IScaledBalanceToken
  function scaledBalanceOf(address user) external view virtual override returns (uint256) {
    return super.balanceOf(user);
  }

  /// @inheritdoc IERC20
  function totalSupply() public view virtual override returns (uint256) {
    return super.totalSupply().rayMul(POOL.getReserveNormalizedVariableDebt(_underlyingAsset));
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

  /// @inheritdoc IScaledBalanceToken
  function getPreviousIndex(address user) external view virtual override returns (uint256) {
    return _userState[user].additionalData;
  }

  /**
   * @notice Returns the address of the underlying asset of this debtToken (E.g. WETH for aWETH)
   * @return The address of the underlying asset
   **/
  function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
    return _underlyingAsset;
  }

  /// @inheritdoc DebtTokenBase
  function _getUnderlyingAssetAddress() internal view override returns (address) {
    return _underlyingAsset;
  }
}
