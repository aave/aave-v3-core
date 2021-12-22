// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {GPv2SafeERC20} from '../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';
import {Address} from '../../dependencies/openzeppelin/contracts/Address.sol';
import {VersionedInitializable} from '../libraries/aave-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {ReserveLogic} from '../libraries/logic/ReserveLogic.sol';
import {GenericLogic} from '../libraries/logic/GenericLogic.sol';
import {ValidationLogic} from '../libraries/logic/ValidationLogic.sol';
import {EModeLogic} from '../libraries/logic/EModeLogic.sol';
import {SupplyLogic} from '../libraries/logic/SupplyLogic.sol';
import {FlashLoanLogic} from '../libraries/logic/FlashLoanLogic.sol';
import {BorrowLogic} from '../libraries/logic/BorrowLogic.sol';
import {LiquidationLogic} from '../libraries/logic/LiquidationLogic.sol';
import {ReserveConfiguration} from '../libraries/configuration/ReserveConfiguration.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {BridgeLogic} from '../libraries/logic/BridgeLogic.sol';
import {IERC20WithPermit} from '../../interfaces/IERC20WithPermit.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IAToken} from '../../interfaces/IAToken.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {PoolStorage} from './PoolStorage.sol';
import {Helpers} from '../libraries/helpers/Helpers.sol';

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
  using GPv2SafeERC20 for IERC20;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  uint256 public constant POOL_REVISION = 0x2;
  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

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
      ADDRESSES_PROVIDER.getPoolConfigurator() == msg.sender,
      Errors.P_CALLER_NOT_POOL_CONFIGURATOR
    );
  }

  function _onlyBridge() internal view {
    require(
      IACLManager(ADDRESSES_PROVIDER.getACLManager()).isBridge(msg.sender),
      Errors.P_CALLER_NOT_BRIDGE
    );
  }

  function getRevision() internal pure virtual override returns (uint256) {
    return POOL_REVISION;
  }

  constructor(IPoolAddressesProvider provider) {
    ADDRESSES_PROVIDER = provider;
  }

  /**
   * @notice Initializes the Pool.
   * @dev Function is invoked by the proxy contract when the Pool contract is added to the
   * PoolAddressesProvider of the market.
   * @dev Caching the address of the PoolAddressesProvider in order to reduce gas consumption on subsequent operations
   * @param provider The address of the PoolAddressesProvider
   **/
  function initialize(IPoolAddressesProvider provider) external initializer {
    require(provider == ADDRESSES_PROVIDER, Errors.PC_INVALID_CONFIGURATION);
    _maxStableRateBorrowSizePercent = 2500;
    _flashLoanPremiumTotal = 9;
    _flashLoanPremiumToProtocol = 0;
  }

  ///@inheritdoc IPool
  function mintUnbacked(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override onlyBridge {
    BridgeLogic.executeMintUnbacked(
      _reserves,
      _reservesList,
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
    BridgeLogic.executeBackUnbacked(_reserves[asset], asset, amount, fee, _bridgeProtocolFee);
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
      _reservesList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        asset: asset,
        amount: amount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
    );
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
      _reservesList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        asset: asset,
        amount: amount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
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
        DataTypes.ExecuteWithdrawParams({
          asset: asset,
          amount: amount,
          to: to,
          reservesCount: _reservesCount,
          oracle: ADDRESSES_PROVIDER.getPriceOracle(),
          userEModeCategory: _usersEModeCategory[msg.sender]
        })
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
      DataTypes.ExecuteBorrowParams({
        asset: asset,
        user: msg.sender,
        onBehalfOf: onBehalfOf,
        amount: amount,
        interestRateMode: DataTypes.InterestRateMode(interestRateMode),
        referralCode: referralCode,
        releaseUnderlying: true,
        maxStableRateBorrowSizePercent: _maxStableRateBorrowSizePercent,
        reservesCount: _reservesCount,
        oracle: ADDRESSES_PROVIDER.getPriceOracle(),
        userEModeCategory: _usersEModeCategory[onBehalfOf],
        priceOracleSentinel: ADDRESSES_PROVIDER.getPriceOracleSentinel()
      })
    );
  }

  /// @inheritdoc IPool
  function repay(
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf
  ) external override returns (uint256) {
    return
      BorrowLogic.executeRepay(
        _reserves,
        _reservesList,
        _reserves[asset],
        _usersConfig[onBehalfOf],
        DataTypes.ExecuteRepayParams({
          asset: asset,
          amount: amount,
          interestRateMode: DataTypes.InterestRateMode(interestRateMode),
          onBehalfOf: onBehalfOf,
          useATokens: false
        })
      );
  }

  /// @inheritdoc IPool
  function repayWithPermit(
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf,
    uint256 deadline,
    uint8 permitV,
    bytes32 permitR,
    bytes32 permitS
  ) external override returns (uint256) {
    {
      IERC20WithPermit(asset).permit(
        msg.sender,
        address(this),
        amount,
        deadline,
        permitV,
        permitR,
        permitS
      );
    }
    {
      DataTypes.ExecuteRepayParams memory params = DataTypes.ExecuteRepayParams({
        asset: asset,
        amount: amount,
        interestRateMode: DataTypes.InterestRateMode(interestRateMode),
        onBehalfOf: onBehalfOf,
        useATokens: false
      });
      return
        BorrowLogic.executeRepay(
          _reserves,
          _reservesList,
          _reserves[asset],
          _usersConfig[onBehalfOf],
          params
        );
    }
  }

  /// @inheritdoc IPool
  function repayWithATokens(
    address asset,
    uint256 amount,
    uint256 interestRateMode
  ) external override returns (uint256) {
    return
      BorrowLogic.executeRepay(
        _reserves,
        _reservesList,
        _reserves[asset],
        _usersConfig[msg.sender],
        DataTypes.ExecuteRepayParams({
          asset: asset,
          amount: amount,
          interestRateMode: DataTypes.InterestRateMode(interestRateMode),
          onBehalfOf: msg.sender,
          useATokens: true
        })
      );
  }

  /// @inheritdoc IPool
  function swapBorrowRateMode(address asset, uint256 interestRateMode) external override {
    BorrowLogic.executeSwapBorrowRateMode(
      _reserves[asset],
      _usersConfig[msg.sender],
      asset,
      DataTypes.InterestRateMode(interestRateMode)
    );
  }

  /// @inheritdoc IPool
  function rebalanceStableBorrowRate(address asset, address user) external override {
    BorrowLogic.executeRebalanceStableBorrowRate(_reserves[asset], asset, user);
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
      ADDRESSES_PROVIDER.getPriceOracle(),
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
      DataTypes.ExecuteLiquidationCallParams({
        reservesCount: _reservesCount,
        debtToCover: debtToCover,
        collateralAsset: collateralAsset,
        debtAsset: debtAsset,
        user: user,
        receiveAToken: receiveAToken,
        priceOracle: ADDRESSES_PROVIDER.getPriceOracle(),
        userEModeCategory: _usersEModeCategory[user],
        priceOracleSentinel: ADDRESSES_PROVIDER.getPriceOracleSentinel()
      })
    );
  }

  /// @inheritdoc IPool
  function flashLoan(
    address receiverAddress,
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata interestRateModes,
    address onBehalfOf,
    bytes calldata params,
    uint16 referralCode
  ) external override {
    DataTypes.FlashloanParams memory flashParams = DataTypes.FlashloanParams({
      receiverAddress: receiverAddress,
      assets: assets,
      amounts: amounts,
      interestRateModes: interestRateModes,
      onBehalfOf: onBehalfOf,
      params: params,
      referralCode: referralCode,
      flashLoanPremiumToProtocol: _flashLoanPremiumToProtocol,
      flashLoanPremiumTotal: _flashLoanPremiumTotal,
      maxStableRateBorrowSizePercent: _maxStableRateBorrowSizePercent,
      reservesCount: _reservesCount,
      addressesProvider: address(ADDRESSES_PROVIDER),
      userEModeCategory: _usersEModeCategory[onBehalfOf],
      isAuthorizedFlashBorrower: IACLManager(ADDRESSES_PROVIDER.getACLManager()).isFlashBorrower(
        msg.sender
      )
    });

    FlashLoanLogic.executeFlashLoan(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersConfig[onBehalfOf],
      flashParams
    );
  }

  /// @inheritdoc IPool
  function flashLoanSimple(
    address receiverAddress,
    address asset,
    uint256 amount,
    bytes calldata params,
    uint16 referralCode
  ) external override {
    DataTypes.FlashloanSimpleParams memory flashParams = DataTypes.FlashloanSimpleParams({
      receiverAddress: receiverAddress,
      asset: asset,
      amount: amount,
      params: params,
      referralCode: referralCode,
      flashLoanPremiumToProtocol: _flashLoanPremiumToProtocol,
      flashLoanPremiumTotal: _flashLoanPremiumTotal
    });
    FlashLoanLogic.executeFlashLoanSimple(_reserves[asset], flashParams);
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
        reserve.accruedToTreasury = 0;
        uint256 normalizedIncome = reserve.getNormalizedIncome();
        uint256 amountToMint = accruedToTreasury.rayMul(normalizedIncome);
        IAToken(reserve.aTokenAddress).mintToTreasury(amountToMint, normalizedIncome);

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
      DataTypes.CalculateUserAccountDataParams({
        userConfig: _usersConfig[user],
        reservesCount: _reservesCount,
        user: user,
        oracle: ADDRESSES_PROVIDER.getPriceOracle(),
        userEModeCategory: _usersEModeCategory[user]
      })
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
  function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() public view override returns (uint256) {
    return _maxStableRateBorrowSizePercent;
  }

  /// @inheritdoc IPool
  function BRIDGE_PROTOCOL_FEE() public view override returns (uint256) {
    return _bridgeProtocolFee;
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
  function MAX_NUMBER_RESERVES() public view virtual override returns (uint256) {
    return ReserveConfiguration.MAX_RESERVES_COUNT;
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
    SupplyLogic.executeFinalizeTransfer(
      _reserves,
      _reservesList,
      _eModeCategories,
      _usersConfig,
      DataTypes.FinalizeTransferParams({
        asset: asset,
        from: from,
        to: to,
        amount: amount,
        balanceFromBefore: balanceFromBefore,
        balanceToBefore: balanceToBefore,
        reservesCount: _reservesCount,
        oracle: ADDRESSES_PROVIDER.getPriceOracle(),
        fromEModeCategory: _usersEModeCategory[from],
        toEModeCategory: _usersEModeCategory[to]
      })
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
  function updateBridgeProtocolFee(uint256 protocolFee) external override onlyPoolConfigurator {
    _bridgeProtocolFee = protocolFee;
  }

  /// @inheritdoc IPool
  function updateFlashloanPremiums(
    uint256 flashLoanPremiumTotal,
    uint256 flashLoanPremiumToProtocol
  ) external override onlyPoolConfigurator {
    _flashLoanPremiumTotal = Helpers.toUint128(flashLoanPremiumTotal);
    _flashLoanPremiumToProtocol = Helpers.toUint128(flashLoanPremiumToProtocol);
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
      DataTypes.ExecuteSetUserEModeParams({
        reservesCount: _reservesCount,
        oracle: ADDRESSES_PROVIDER.getPriceOracle(),
        categoryId: categoryId
      })
    );
  }

  /// @inheritdoc IPool
  function getUserEMode(address user) external view override returns (uint256) {
    return _usersEModeCategory[user];
  }

  function _addReserveToList(address asset) internal {
    bool reserveAlreadyAdded = _reserves[asset].id != 0 || _reservesList[0] == asset;
    require(!reserveAlreadyAdded, Errors.RL_RESERVE_ALREADY_INITIALIZED);

    uint16 reservesCount = _reservesCount;

    for (uint16 i = 0; i < reservesCount; i++) {
      if (_reservesList[i] == address(0)) {
        _reserves[asset].id = i;
        _reservesList[i] = asset;
        return;
      }
    }
    require(reservesCount < MAX_NUMBER_RESERVES(), Errors.P_NO_MORE_RESERVES_ALLOWED);
    _reserves[asset].id = reservesCount;
    _reservesList[reservesCount] = asset;
    // no need to check for overflow - the require above must ensure that max number of reserves < type(uint16).max
    _reservesCount = reservesCount + 1;
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
      _reservesList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        asset: asset,
        amount: amount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
    );
  }
}
