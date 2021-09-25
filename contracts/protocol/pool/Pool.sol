// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {Address} from '../../dependencies/openzeppelin/contracts/Address.sol';
import {VersionedInitializable} from '../libraries/aave-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {ReserveLogic} from '../libraries/logic/ReserveLogic.sol';
import {GenericLogic} from '../libraries/logic/GenericLogic.sol';
import {ValidationLogic} from '../libraries/logic/ValidationLogic.sol';
import {EModeLogic} from '../libraries/logic/EModeLogic.sol';
import {SupplyLogic} from '../libraries/logic/SupplyLogic.sol';
import {BorrowLogic} from '../libraries/logic/BorrowLogic.sol';
import {LiquidationLogic} from '../libraries/logic/LiquidationLogic.sol';
import {ReserveConfiguration} from '../libraries/configuration/ReserveConfiguration.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {IERC20WithPermit} from '../../interfaces/IERC20WithPermit.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IAToken} from '../../interfaces/IAToken.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {PoolStorage} from './PoolStorage.sol';
import {BridgeLogic} from './../libraries/logic/BridgeLogic.sol';

/**
 * @title Pool contract
 * @author Aave
 * @notice Main point of interaction with an Aave protocol's market
 * - Users can:
 *   # Supply
 *   # Withdraw
 *   # Borrow
 *   # Repay
 *   # Swap their loans between variable and stable rate
 *   # Enable/disable their supplied assets as collateral rebalance stable rate borrow positions
 *   # Liquidate positions
 *   # Execute Flash Loans
 * @dev To be covered by a proxy contract, owned by the PoolAddressesProvider of the specific market
 * @dev All admin functions are callable by the PoolConfigurator contract defined also in the
 *   PoolAddressesProvider
 **/
contract Pool is VersionedInitializable, IPool, PoolStorage {
  using WadRayMath for uint256;
  using SafeERC20 for IERC20;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  uint256 public constant POOL_REVISION = 0x2;

  modifier onlyPoolConfigurator() {
    _onlyPoolConfigurator();
    _;
  }

  modifier onlyBridge() {
    _onlyBridge();
    _;
  }

  function _onlyPoolConfigurator() internal view {
    require(
      _addressesProvider.getPoolConfigurator() == msg.sender,
      Errors.P_CALLER_NOT_POOL_CONFIGURATOR
    );
  }

  function _onlyBridge() internal view {
    require(
      IACLManager(_addressesProvider.getACLManager()).isBridge(msg.sender),
      Errors.P_CALLER_NOT_BRIDGE
    );
  }

  function getRevision() internal pure virtual override returns (uint256) {
    return POOL_REVISION;
  }

  /**
   * @notice Initializes the Pool.
   * @dev Function is invoked by the proxy contract when the Pool contract is added to the
   * PoolAddressesProvider of the market.
   * @dev Caching the address of the PoolAddressesProvider in order to reduce gas consumption
   *   on subsequent operations
   * @param provider The address of the PoolAddressesProvider
   **/
  function initialize(IPoolAddressesProvider provider) public initializer {
    _addressesProvider = provider;
    _maxStableRateBorrowSizePercent = 2500;
    _flashLoanPremiumTotal = 9;
    _maxNumberOfReserves = 128;
    _flashLoanPremiumToProtocol = 0;
  }

  /// @inheritdoc IPool
  function supply(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override {
    SupplyLogic.executeSupply(
      _reserves,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams(asset, amount, onBehalfOf, referralCode)
    );
  }

  ///@inheritdoc IPool
  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override onlyBridge {
    BridgeLogic.mintUnbacked(
      _reserves[asset],
      _usersConfig[onBehalfOf],
      asset,
      amount,
      onBehalfOf,
      referralCode
    );
  }

  ///@inheritdoc IPool
  function backUnbacked(
    address asset,
    uint256 amount,
    uint256 fee
  ) external override onlyBridge {
    BridgeLogic.backUnbacked(_reserves[asset], asset, amount, fee);
  }

  /// @inheritdoc IPool
  function supplyWithPermit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode,
    uint256 deadline,
    uint8 permitV,
    bytes32 permitR,
    bytes32 permitS
  ) external override {
    IERC20WithPermit(asset).permit(
      msg.sender,
      address(this),
      amount,
      deadline,
      permitV,
      permitR,
      permitS
    );
    SupplyLogic.executeSupply(
      _reserves,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams(asset, amount, onBehalfOf, referralCode)
    );
  }

  /// @inheritdoc IPool
  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external override returns (uint256) {
    return
      SupplyLogic.executeWithdraw(
        _reserves,
        _reservesList,
        _eModeCategories,
        _usersConfig[msg.sender],
        DataTypes.ExecuteWithdrawParams(
          asset,
          amount,
          to,
          _reservesCount,
          _addressesProvider.getPriceOracle(),
          _usersEModeCategory[msg.sender]
        )
      );
  }

  /// @inheritdoc IPool
  function borrow(
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    uint16 referralCode,
    address onBehalfOf
  ) external override {
    BorrowLogic.executeBorrow(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteBorrowParams(
        asset,
        msg.sender,
        onBehalfOf,
        amount,
        interestRateMode,
        referralCode,
        true,
        _maxStableRateBorrowSizePercent,
        _reservesCount,
        _addressesProvider.getPriceOracle(),
        _usersEModeCategory[msg.sender]
      )
    );
  }

  /// @inheritdoc IPool
  function repay(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) external override returns (uint256) {
    return
      BorrowLogic.executeRepay(
        _reserves[asset],
        _usersConfig[onBehalfOf],
        DataTypes.ExecuteRepayParams(asset, amount, rateMode, onBehalfOf, false)
      );
  }

  /// @inheritdoc IPool
  function repayWithPermit(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf,
    uint256 deadline,
    uint8 permitV,
    bytes32 permitR,
    bytes32 permitS
  ) external override returns (uint256) {
    IERC20WithPermit(asset).permit(
      msg.sender,
      address(this),
      amount,
      deadline,
      permitV,
      permitR,
      permitS
    );
    return
      BorrowLogic.executeRepay(
        _reserves[asset],
        _usersConfig[onBehalfOf],
        DataTypes.ExecuteRepayParams(asset, amount, rateMode, onBehalfOf, false)
      );
  }

  /// @inheritdoc IPool
  function repayWithATokens(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) external override returns (uint256) {
    return
      BorrowLogic.executeRepay(
        _reserves[asset],
        _usersConfig[onBehalfOf],
        DataTypes.ExecuteRepayParams(asset, amount, rateMode, onBehalfOf, true)
      );
  }

  /// @inheritdoc IPool
  function swapBorrowRateMode(address asset, uint256 rateMode) external override {
    BorrowLogic.swapBorrowRateMode(_reserves[asset], _usersConfig[msg.sender], asset, rateMode);
  }

  /// @inheritdoc IPool
  function rebalanceStableBorrowRate(address asset, address user) external override {
    BorrowLogic.rebalanceStableBorrowRate(_reserves[asset], asset, user);
  }

  /// @inheritdoc IPool
  function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external override {
    SupplyLogic.executeUseReserveAsCollateral(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersConfig[msg.sender],
      asset,
      useAsCollateral,
      _reservesCount,
      _addressesProvider.getPriceOracle(),
      _usersEModeCategory[msg.sender]
    );
  }

  /// @inheritdoc IPool
  function liquidationCall(
    address collateralAsset,
    address debtAsset,
    address user,
    uint256 debtToCover,
    bool receiveAToken
  ) external override {
    LiquidationLogic.executeLiquidationCall(
      _reserves,
      _usersConfig,
      _reservesList,
      _eModeCategories,
      DataTypes.ExecuteLiquidationCallParams(
        _reservesCount,
        debtToCover,
        collateralAsset,
        debtAsset,
        user,
        receiveAToken,
        _addressesProvider.getPriceOracle(),
        _usersEModeCategory[user]
      )
    );
  }

  /// @inheritdoc IPool
  function flashLoan(
    address receiverAddress,
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata modes,
    address onBehalfOf,
    bytes calldata params,
    uint16 referralCode
  ) external override {
    DataTypes.FlashloanParams memory flashParams = DataTypes.FlashloanParams(
      receiverAddress,
      assets,
      amounts,
      modes,
      onBehalfOf,
      params,
      referralCode,
      _flashLoanPremiumToProtocol,
      _flashLoanPremiumTotal,
      _maxStableRateBorrowSizePercent,
      _reservesCount,
      _addressesProvider.getPriceOracle(),
      _usersEModeCategory[onBehalfOf],
      IACLManager(_addressesProvider.getACLManager()).isFlashBorrower(msg.sender)
    );

    BorrowLogic.executeFlashLoan(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersConfig[onBehalfOf],
      flashParams
    );
  }

  /// @inheritdoc IPool
  function mintToTreasury(address[] calldata assets) external override {
    for (uint256 i = 0; i < assets.length; i++) {
      address assetAddress = assets[i];

      DataTypes.ReserveData storage reserve = _reserves[assetAddress];

      // this cover both inactive reserves and invalid reserves since the flag will be 0 for both
      if (!reserve.configuration.getActive()) {
        continue;
      }

      uint256 accruedToTreasury = reserve.accruedToTreasury;

      if (accruedToTreasury != 0) {
        uint256 normalizedIncome = reserve.getNormalizedIncome();
        uint256 amountToMint = accruedToTreasury.rayMul(normalizedIncome);
        IAToken(reserve.aTokenAddress).mintToTreasury(amountToMint, normalizedIncome);

        reserve.accruedToTreasury = 0;
        emit MintedToTreasury(assetAddress, amountToMint);
      }
    }
  }

  /// @inheritdoc IPool
  function getReserveData(address asset)
    external
    view
    override
    returns (DataTypes.ReserveData memory)
  {
    return _reserves[asset];
  }

  /// @inheritdoc IPool
  function getUserAccountData(address user)
    external
    view
    override
    returns (
      uint256 totalCollateralBase,
      uint256 totalDebtBase,
      uint256 availableBorrowsBase,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor
    )
  {
    (
      totalCollateralBase,
      totalDebtBase,
      ltv,
      currentLiquidationThreshold,
      healthFactor,

    ) = GenericLogic.calculateUserAccountData(
      _reserves,
      _reservesList,
      _eModeCategories,
      DataTypes.CalculateUserAccountDataParams(
        _usersConfig[user],
        _reservesCount,
        user,
        _addressesProvider.getPriceOracle(),
        _usersEModeCategory[user]
      )
    );

    availableBorrowsBase = GenericLogic.calculateAvailableBorrows(
      totalCollateralBase,
      totalDebtBase,
      ltv
    );
  }

  /// @inheritdoc IPool
  function getConfiguration(address asset)
    external
    view
    override
    returns (DataTypes.ReserveConfigurationMap memory)
  {
    return _reserves[asset].configuration;
  }

  /// @inheritdoc IPool
  function getUserConfiguration(address user)
    external
    view
    override
    returns (DataTypes.UserConfigurationMap memory)
  {
    return _usersConfig[user];
  }

  /// @inheritdoc IPool
  function getReserveNormalizedIncome(address asset)
    external
    view
    virtual
    override
    returns (uint256)
  {
    return _reserves[asset].getNormalizedIncome();
  }

  /// @inheritdoc IPool
  function getReserveNormalizedVariableDebt(address asset)
    external
    view
    override
    returns (uint256)
  {
    return _reserves[asset].getNormalizedDebt();
  }

  /// @inheritdoc IPool
  function getReservesList() external view override returns (address[] memory) {
    uint256 reserveListCount = _reservesCount;
    uint256 droppedReservesCount = 0;
    address[] memory reserves = new address[](reserveListCount);

    for (uint256 i = 0; i < reserveListCount; i++) {
      if (_reservesList[i] != address(0)) {
        reserves[i - droppedReservesCount] = _reservesList[i];
      } else {
        droppedReservesCount++;
      }
    }

    if (droppedReservesCount == 0) return reserves;

    address[] memory undroppedReserves = new address[](reserveListCount - droppedReservesCount);
    for (uint256 i = 0; i < reserveListCount - droppedReservesCount; i++) {
      undroppedReserves[i] = reserves[i];
    }

    return undroppedReserves;
  }

  /// @inheritdoc IPool
  function getAddressesProvider() external view override returns (IPoolAddressesProvider) {
    return _addressesProvider;
  }

  /// @inheritdoc IPool
  function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() public view override returns (uint256) {
    return _maxStableRateBorrowSizePercent;
  }

  /// @inheritdoc IPool
  function FLASHLOAN_PREMIUM_TOTAL() public view override returns (uint256) {
    return _flashLoanPremiumTotal;
  }

  /// @inheritdoc IPool
  function FLASHLOAN_PREMIUM_TO_PROTOCOL() public view override returns (uint256) {
    return _flashLoanPremiumToProtocol;
  }

  /// @inheritdoc IPool
  function MAX_NUMBER_RESERVES() public view override returns (uint256) {
    return _maxNumberOfReserves;
  }

  /// @inheritdoc IPool
  function finalizeTransfer(
    address asset,
    address from,
    address to,
    uint256 amount,
    uint256 balanceFromBefore,
    uint256 balanceToBefore
  ) external override {
    require(msg.sender == _reserves[asset].aTokenAddress, Errors.P_CALLER_MUST_BE_AN_ATOKEN);
    SupplyLogic.finalizeTransfer(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersConfig,
      DataTypes.FinalizeTransferParams(
        asset,
        from,
        to,
        amount,
        balanceFromBefore,
        balanceToBefore,
        _reservesCount,
        _addressesProvider.getPriceOracle(),
        _usersEModeCategory[from],
        _usersEModeCategory[to]
      )
    );
  }

  /// @inheritdoc IPool
  function initReserve(
    address asset,
    address aTokenAddress,
    address stableDebtAddress,
    address variableDebtAddress,
    address interestRateStrategyAddress
  ) external override onlyPoolConfigurator {
    require(Address.isContract(asset), Errors.P_NOT_CONTRACT);
    _reserves[asset].init(
      aTokenAddress,
      stableDebtAddress,
      variableDebtAddress,
      interestRateStrategyAddress
    );
    _addReserveToList(asset);
  }

  /// @inheritdoc IPool
  function dropReserve(address asset) external override onlyPoolConfigurator {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    ValidationLogic.validateDropReserve(reserve);
    _reservesList[_reserves[asset].id] = address(0);
    delete _reserves[asset];
  }

  /// @inheritdoc IPool
  function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
    external
    override
    onlyPoolConfigurator
  {
    _reserves[asset].interestRateStrategyAddress = rateStrategyAddress;
  }

  /// @inheritdoc IPool
  function setConfiguration(address asset, uint256 configuration)
    external
    override
    onlyPoolConfigurator
  {
    _reserves[asset].configuration.data = configuration;
  }

  /// @inheritdoc IPool
  function updateFlashloanPremiums(
    uint256 flashLoanPremiumTotal,
    uint256 flashLoanPremiumToProtocol
  ) external override onlyPoolConfigurator {
    _flashLoanPremiumTotal = flashLoanPremiumTotal;
    _flashLoanPremiumToProtocol = flashLoanPremiumToProtocol;
  }

  /// @inheritdoc IPool
  function configureEModeCategory(uint8 id, DataTypes.EModeCategory memory category)
    external
    override
    onlyPoolConfigurator
  {
    // category 0 is reserved for volatile heterogeneous assets and it's always disabled
    require(id != 0, Errors.RC_INVALID_EMODE_CATEGORY);
    _eModeCategories[id] = category;
  }

  /// @inheritdoc IPool
  function getEModeCategoryData(uint8 id)
    external
    view
    override
    returns (DataTypes.EModeCategory memory)
  {
    return _eModeCategories[id];
  }

  /// @inheritdoc IPool
  function setUserEMode(uint8 categoryId) external virtual override {
    EModeLogic.executeSetUserEMode(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersEModeCategory,
      _usersConfig[msg.sender],
      DataTypes.ExecuteSetUserEModeParams(
        _reservesCount,
        _addressesProvider.getPriceOracle(),
        categoryId
      )
    );
  }

  /// @inheritdoc IPool
  function getUserEMode(address user) external view override returns (uint256) {
    return _usersEModeCategory[user];
  }

  function _addReserveToList(address asset) internal {
    uint256 reservesCount = _reservesCount;

    require(reservesCount < _maxNumberOfReserves, Errors.P_NO_MORE_RESERVES_ALLOWED);

    bool reserveAlreadyAdded = _reserves[asset].id != 0 || _reservesList[0] == asset;

    if (!reserveAlreadyAdded) {
      for (uint8 i = 0; i <= reservesCount; i++) {
        if (_reservesList[i] == address(0)) {
          _reserves[asset].id = i;
          _reservesList[i] = asset;
          _reservesCount = reservesCount + 1;
        }
      }
    }
  }

  /// @inheritdoc IPool
  /// @dev Deprecated: mantained for compatibilty purposes
  function deposit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override {
    SupplyLogic.executeSupply(
      _reserves,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams(asset, amount, onBehalfOf, referralCode)
    );
  }
}
