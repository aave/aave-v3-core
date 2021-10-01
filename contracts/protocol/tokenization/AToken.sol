// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {VersionedInitializable} from '../libraries/aave-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {Helpers} from '../libraries/helpers/Helpers.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IAToken} from '../../interfaces/IAToken.sol';
import {IAaveIncentivesController} from '../../interfaces/IAaveIncentivesController.sol';
import {IScaledBalanceToken} from '../../interfaces/IScaledBalanceToken.sol';
import {IInitializableAToken} from '../../interfaces/IInitializableAToken.sol';
import {IncentivizedERC20} from './IncentivizedERC20.sol';

/**
 * @title Aave ERC20 AToken
 * @author Aave
 * @notice Implementation of the interest bearing token for the Aave protocol
 */
contract AToken is
  VersionedInitializable,
  IncentivizedERC20('ATOKEN_IMPL', 'ATOKEN_IMPL', 0),
  IAToken
{
  using WadRayMath for uint256;
  using SafeERC20 for IERC20;

  bytes public constant EIP712_REVISION = bytes('1');
  bytes32 internal constant EIP712_DOMAIN =
    keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');
  bytes32 public constant PERMIT_TYPEHASH =
    keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');

  uint256 public constant ATOKEN_REVISION = 0x1;

  /// @dev owner => next valid nonce to submit with permit()
  mapping(address => uint256) public _nonces;

  bytes32 public DOMAIN_SEPARATOR;

  IPool internal _pool;
  address internal _treasury;
  address internal _underlyingAsset;

  modifier onlyPool() {
    require(_msgSender() == address(_pool), Errors.CT_CALLER_MUST_BE_POOL);
    _;
  }

  /// @inheritdoc VersionedInitializable
  function getRevision() internal pure virtual override returns (uint256) {
    return ATOKEN_REVISION;
  }

  /// @inheritdoc IInitializableAToken
  function initialize(
    IPool pool,
    address treasury,
    address underlyingAsset,
    IAaveIncentivesController incentivesController,
    uint8 aTokenDecimals,
    string calldata aTokenName,
    string calldata aTokenSymbol,
    bytes calldata params
  ) external override initializer {
    uint256 chainId = block.chainid;

    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        EIP712_DOMAIN,
        keccak256(bytes(aTokenName)),
        keccak256(EIP712_REVISION),
        chainId,
        address(this)
      )
    );

    _setName(aTokenName);
    _setSymbol(aTokenSymbol);
    _setDecimals(aTokenDecimals);

    _pool = pool;
    _treasury = treasury;
    _underlyingAsset = underlyingAsset;
    _incentivesController = incentivesController;

    emit Initialized(
      underlyingAsset,
      address(pool),
      treasury,
      address(incentivesController),
      aTokenDecimals,
      aTokenName,
      aTokenSymbol,
      params
    );
  }

  /// @inheritdoc IAToken
  function burn(
    address user,
    address receiverOfUnderlying,
    uint256 amount,
    uint256 index
  ) external override onlyPool {
    uint256 amountScaled = amount.rayDiv(index);
    require(amountScaled != 0, Errors.CT_INVALID_BURN_AMOUNT);

    uint256 scaledBalance = super.balanceOf(user);
    uint256 accumulatedInterest = scaledBalance.rayMul(index) -
      scaledBalance.rayMul(_userState[user].additionalData);

    _userState[user].additionalData = Helpers.castUint128(index);

    _burn(user, Helpers.castUint128(amountScaled));

    if (receiverOfUnderlying != address(this)) {
      IERC20(_underlyingAsset).safeTransfer(receiverOfUnderlying, amount);
    }

    emit Transfer(user, address(0), amount);
    if (accumulatedInterest > amount) {
      emit Mint(user, accumulatedInterest - amount, index);
    } else {
      emit Burn(user, receiverOfUnderlying, amount - accumulatedInterest, index);
    }
  }

  /// @inheritdoc IAToken
  function mint(
    address user,
    uint256 amount,
    uint256 index
  ) external override onlyPool returns (bool) {
    uint256 amountScaled = amount.rayDiv(index);
    require(amountScaled != 0, Errors.CT_INVALID_MINT_AMOUNT);

    uint256 scaledBalance = super.balanceOf(user);
    uint256 accumulatedInterest = scaledBalance.rayMul(index) -
      scaledBalance.rayMul(_userState[user].additionalData);

    _userState[user].additionalData = Helpers.castUint128(index);

    _mint(user, Helpers.castUint128(amountScaled));

    emit Transfer(address(0), user, amount);
    emit Mint(user, amount + accumulatedInterest, index);

    return scaledBalance == 0;
  }

  /// @inheritdoc IAToken
  function mintToTreasury(uint256 amount, uint256 index) external override onlyPool {
    if (amount == 0) {
      return;
    }

    address treasury = _treasury;

    // Compared to the normal mint, we don't check for rounding errors.
    // The amount to mint can easily be very small since it is a fraction of the interest ccrued.
    // In that case, the treasury will experience a (very small) loss, but it
    // wont cause potentially valid transactions to fail.
    _mint(treasury, Helpers.castUint128(amount.rayDiv(index)));

    emit Transfer(address(0), treasury, amount);
    emit Mint(treasury, amount, index);
  }

  /// @inheritdoc IAToken
  function transferOnLiquidation(
    address from,
    address to,
    uint256 value
  ) external override onlyPool {
    // Being a normal transfer, the Transfer() and BalanceTransfer() are emitted
    // so no need to emit a specific event here
    _transfer(from, to, value, false);

    emit Transfer(from, to, value);
  }

  /// @inheritdoc IncentivizedERC20
  function balanceOf(address user)
    public
    view
    override(IncentivizedERC20, IERC20)
    returns (uint256)
  {
    return super.balanceOf(user).rayMul(_pool.getReserveNormalizedIncome(_underlyingAsset));
  }

  /// @inheritdoc IScaledBalanceToken
  function scaledBalanceOf(address user) external view override returns (uint256) {
    return super.balanceOf(user);
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

  /// @inheritdoc IncentivizedERC20
  function totalSupply() public view override(IncentivizedERC20, IERC20) returns (uint256) {
    uint256 currentSupplyScaled = super.totalSupply();

    if (currentSupplyScaled == 0) {
      return 0;
    }

    return currentSupplyScaled.rayMul(_pool.getReserveNormalizedIncome(_underlyingAsset));
  }

  /// @inheritdoc IScaledBalanceToken
  function scaledTotalSupply() public view virtual override returns (uint256) {
    return super.totalSupply();
  }

  /// @inheritdoc IScaledBalanceToken
  function getPreviousIndex(address user) public view virtual override returns (uint256) {
    return _userState[user].additionalData;
  }

  /**
   * @notice Returns the address of the Aave treasury, receiving the fees on this aToken
   * @return Address of the Aave treasury
   **/
  function RESERVE_TREASURY_ADDRESS() public view override returns (address) {
    return _treasury;
  }

  /// @inheritdoc IAToken
  function UNDERLYING_ASSET_ADDRESS() public view override returns (address) {
    return _underlyingAsset;
  }

  /**
   * @notice Returns the address of the pool where this aToken is used
   * @return Address of the pool
   **/
  function POOL() public view returns (IPool) {
    return _pool;
  }

  /// @inheritdoc IAToken
  function transferUnderlyingTo(address target, uint256 amount)
    external
    override
    onlyPool
    returns (uint256)
  {
    IERC20(_underlyingAsset).safeTransfer(target, amount);
    return amount;
  }

  /// @inheritdoc IAToken
  function handleRepayment(address user, uint256 amount) external override onlyPool {}

  /// @inheritdoc IAToken
  function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    require(owner != address(0), 'INVALID_OWNER');
    //solium-disable-next-line
    require(block.timestamp <= deadline, 'INVALID_EXPIRATION');
    uint256 currentValidNonce = _nonces[owner];
    bytes32 digest = keccak256(
      abi.encodePacked(
        '\x19\x01',
        DOMAIN_SEPARATOR,
        keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, currentValidNonce, deadline))
      )
    );
    require(owner == ecrecover(digest, v, r, s), 'INVALID_SIGNATURE');
    _nonces[owner] = currentValidNonce + 1;
    _approve(owner, spender, value);
  }

  /**
   * @notice Transfers the aTokens between two users. Validates the transfer
   * (ie checks for valid HF after the transfer) if required
   * @param from The source address
   * @param to The destination address
   * @param amount The amount getting transferred
   * @param validate True if the transfer needs to be validated, false otherwise
   **/
  function _transfer(
    address from,
    address to,
    uint256 amount,
    bool validate
  ) internal {
    address underlyingAsset = _underlyingAsset;
    IPool pool = _pool;

    uint256 index = pool.getReserveNormalizedIncome(underlyingAsset);

    uint256 fromBalanceBefore = super.balanceOf(from).rayMul(index);
    uint256 toBalanceBefore = super.balanceOf(to).rayMul(index);

    super._transfer(from, to, Helpers.castUint128(amount.rayDiv(index)));

    if (validate) {
      pool.finalizeTransfer(underlyingAsset, from, to, amount, fromBalanceBefore, toBalanceBefore);
    }

    emit BalanceTransfer(from, to, amount, index);
  }

  /**
   * @notice Overrides the parent _transfer to force validated transfer() and transferFrom()
   * @param from The source address
   * @param to The destination address
   * @param amount The amount getting transferred
   **/
  function _transfer(
    address from,
    address to,
    uint128 amount
  ) internal override {
    _transfer(from, to, amount, true);
  }
}
