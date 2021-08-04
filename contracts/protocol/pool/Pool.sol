// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IERC20WithPermit} from '../../interfaces/IERC20WithPermit.sol';
import {SafeERC20} from '../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {Address} from '../../dependencies/openzeppelin/contracts/Address.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IAToken} from '../../interfaces/IAToken.sol';
import {IVariableDebtToken} from '../../interfaces/IVariableDebtToken.sol';
import {IFlashLoanReceiver} from '../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {IPriceOracleGetter} from '../../interfaces/IPriceOracleGetter.sol';
import {IStableDebtToken} from '../../interfaces/IStableDebtToken.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {VersionedInitializable} from '../libraries/aave-upgradeability/VersionedInitializable.sol';
import {Helpers} from '../libraries/helpers/Helpers.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {WadRayMath} from '../libraries/math/WadRayMath.sol';
import {PercentageMath} from '../libraries/math/PercentageMath.sol';
import {ReserveLogic} from '../libraries/logic/ReserveLogic.sol';
import {GenericLogic} from '../libraries/logic/GenericLogic.sol';
import {ReserveConfiguration} from '../libraries/configuration/ReserveConfiguration.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {PoolStorage} from './PoolStorage.sol';

import {PoolBaseLogic} from '../libraries/logic/PoolBaseLogic.sol';
import {PoolHelperLogic} from '../libraries/logic/PoolHelperLogic.sol';

/**
 * @title Pool contract
 * @dev Main point of interaction with an Aave protocol's market
 * - Users can:
 *   # Deposit
 *   # Withdraw
 *   # Borrow
 *   # Repay
 *   # Swap their loans between variable and stable rate
 *   # Enable/disable their deposits as collateral rebalance stable rate borrow positions
 *   # Liquidate positions
 *   # Execute Flash Loans
 * - To be covered by a proxy contract, owned by the PoolAddressesProvider of the specific market
 * - All admin functions are callable by the PoolConfigurator contract defined also in the
 *   PoolAddressesProvider
 * @author Aave
 **/
contract Pool is VersionedInitializable, IPool, PoolStorage {
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeERC20 for IERC20;
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  uint256 public constant POOL_REVISION = 0x2;

  modifier onlyPoolConfigurator() {
    _onlyPoolConfigurator();
    _;
  }

  function _onlyPoolConfigurator() internal view {
    require(
      _addressesProvider.getPoolConfigurator() == msg.sender,
      Errors.P_CALLER_NOT_POOL_CONFIGURATOR
    );
  }

  function getRevision() internal pure override returns (uint256) {
    return POOL_REVISION;
  }

  /**
   * @dev Function is invoked by the proxy contract when the Pool contract is added to the
   * PoolAddressesProvider of the market.
   * - Caching the address of the PoolAddressesProvider in order to reduce gas consumption
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

  ///@inheritdoc IPool
  function deposit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external override {
    _executeDeposit(asset, amount, onBehalfOf, referralCode);
  }

  ///@inheritdoc IPool
  function depositWithPermit(
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
    _executeDeposit(asset, amount, onBehalfOf, referralCode);
  }

  ///@inheritdoc IPool
  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external override returns (uint256) {
    return _executeWithdraw(asset, amount, to);
  }

  ///@inheritdoc IPool
  function borrow(
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    uint16 referralCode,
    address onBehalfOf
  ) external override {
    _executeBorrow(
      DataTypes.ExecuteBorrowParams(
        asset,
        msg.sender,
        onBehalfOf,
        amount,
        interestRateMode,
        referralCode,
        true
      )
    );
  }

  ///@inheritdoc IPool
  function repay(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) external override returns (uint256) {
    return _executeRepay(asset, amount, rateMode, onBehalfOf);
  }

  ///@inheritdoc IPool
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
    return _executeRepay(asset, amount, rateMode, onBehalfOf);
  }

  ///@inheritdoc IPool
  function swapBorrowRateMode(address asset, uint256 rateMode) external override {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    DataTypes.UserConfigurationMap storage userConfig = _usersConfig[msg.sender];
    PoolHelperLogic.swapBorrowRateMode(reserve, userConfig, asset, rateMode);
  }

  ///@inheritdoc IPool
  function rebalanceStableBorrowRate(address asset, address user) external override {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    PoolHelperLogic.rebalanceStableBorrowRate(reserve, asset, user);
  }

  ///@inheritdoc IPool
  function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external override {
    DataTypes.UserConfigurationMap storage userConfig = _usersConfig[msg.sender];
    PoolHelperLogic.setUserUseReserveAsCollateral(
      _reserves,
      userConfig,
      asset,
      useAsCollateral,
      _reservesList,
      _reservesCount,
      _addressesProvider.getPriceOracle()
    );
  }

  ///@inheritdoc IPool
  function liquidationCall(
    address collateralAsset,
    address debtAsset,
    address user,
    uint256 debtToCover,
    bool receiveAToken
  ) external override {
    address collateralManager = _addressesProvider.getPoolCollateralManager();

    //solium-disable-next-line
    (bool success, bytes memory result) =
      collateralManager.delegatecall(
        abi.encodeWithSignature(
          'liquidationCall(address,address,address,uint256,bool)',
          collateralAsset,
          debtAsset,
          user,
          debtToCover,
          receiveAToken
        )
      );

    require(success, Errors.P_LIQUIDATION_CALL_FAILED);

    (uint256 returnCode, string memory returnMessage) = abi.decode(result, (uint256, string));

    require(returnCode == 0, string(abi.encodePacked(returnMessage)));
  }

  ///@inheritdoc IPool
  function flashLoan(
    address receiverAddress,
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata modes,
    address onBehalfOf,
    bytes calldata params,
    uint16 referralCode
  ) external override {
    DataTypes.UserConfigurationMap storage userConfig = _usersConfig[onBehalfOf];

    DataTypes.FlashloanParams memory flashParams =
      DataTypes.FlashloanParams(
        receiverAddress,
        assets,
        amounts,
        modes,
        onBehalfOf,
        params,
        referralCode,
        _flashLoanPremiumToProtocol,
        _flashLoanPremiumTotal,
        DataTypes.ExecuteBorrowHelperParams(
          _maxStableRateBorrowSizePercent,
          _reservesCount,
          _addressesProvider.getPriceOracle()
        )
      );

    PoolBaseLogic.flashLoan(
      _reserves,
      _reservesList,
      _authorizedFlashBorrowers,
      userConfig,
      flashParams
    );
  }

  ///@inheritdoc IPool
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

  ///@inheritdoc IPool
  function getReserveData(address asset)
    external
    view
    override
    returns (DataTypes.ReserveData memory)
  {
    return _reserves[asset];
  }

  ///@inheritdoc IPool
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

    ) = GenericLogic.getUserAccountData(
      user,
      _reserves,
      _usersConfig[user],
      _reservesList,
      _reservesCount,
      _addressesProvider.getPriceOracle()
    );

    availableBorrowsBase = GenericLogic.calculateAvailableBorrows(
      totalCollateralBase,
      totalDebtBase,
      ltv
    );
  }

  ///@inheritdoc IPool
  function getConfiguration(address asset)
    external
    view
    override
    returns (DataTypes.ReserveConfigurationMap memory)
  {
    return _reserves[asset].configuration;
  }

  ///@inheritdoc IPool
  function getUserConfiguration(address user)
    external
    view
    override
    returns (DataTypes.UserConfigurationMap memory)
  {
    return _usersConfig[user];
  }

  ///@inheritdoc IPool
  function getReserveNormalizedIncome(address asset)
    external
    view
    virtual
    override
    returns (uint256)
  {
    return _reserves[asset].getNormalizedIncome();
  }

  ///@inheritdoc IPool
  function getReserveNormalizedVariableDebt(address asset)
    external
    view
    override
    returns (uint256)
  {
    return _reserves[asset].getNormalizedDebt();
  }

  ///@inheritdoc IPool
  function paused() external view override returns (bool) {
    return _paused;
  }

  ///@inheritdoc IPool
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

  ///@inheritdoc IPool
  function getAddressesProvider() external view override returns (IPoolAddressesProvider) {
    return _addressesProvider;
  }

  ///@inheritdoc IPool
  function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() public view override returns (uint256) {
    return _maxStableRateBorrowSizePercent;
  }

  ///@inheritdoc IPool
  function FLASHLOAN_PREMIUM_TOTAL() public view override returns (uint256) {
    return _flashLoanPremiumTotal;
  }

  ///@inheritdoc IPool
  function FLASHLOAN_PREMIUM_TO_PROTOCOL() public view override returns (uint256) {
    return _flashLoanPremiumToProtocol;
  }

  ///@inheritdoc IPool
  function MAX_NUMBER_RESERVES() public view override returns (uint256) {
    return _maxNumberOfReserves;
  }

  ///@inheritdoc IPool
  function finalizeTransfer(
    address asset,
    address from,
    address to,
    uint256 amount,
    uint256 balanceFromBefore,
    uint256 balanceToBefore
  ) external override {
    require(msg.sender == _reserves[asset].aTokenAddress, Errors.P_CALLER_MUST_BE_AN_ATOKEN);
    PoolBaseLogic.finalizeTransfer(
      _reserves,
      _reservesList,
      _usersConfig,
      DataTypes.FinalizeTransferParams(
        asset,
        from,
        to,
        amount,
        balanceFromBefore,
        balanceToBefore,
        _reservesCount,
        _addressesProvider.getPriceOracle()
      )
    );
  }

  ///@inheritdoc IPool
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

  ///@inheritdoc IPool
  function dropReserve(address asset) external override onlyPoolConfigurator {
    PoolHelperLogic.dropReserve(_reserves, _reservesList, asset);
  }

  ///@inheritdoc IPool
  function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
    external
    override
    onlyPoolConfigurator
  {
    _reserves[asset].interestRateStrategyAddress = rateStrategyAddress;
  }

  ///@inheritdoc IPool
  function setConfiguration(address asset, uint256 configuration)
    external
    override
    onlyPoolConfigurator
  {
    _reserves[asset].configuration.data = configuration;
  }

  ///@inheritdoc IPool
  function setPause(bool paused) external override onlyPoolConfigurator {
    _paused = paused;
  }

  ///@inheritdoc IPool
  function updateFlashBorrowerAuthorization(address flashBorrower, bool authorized)
    external
    override
    onlyPoolConfigurator
  {
    _authorizedFlashBorrowers[flashBorrower] = authorized;
  }

  ///@inheritdoc IPool
  function isFlashBorrowerAuthorized(address flashBorrower) external view override returns (bool) {
    return _authorizedFlashBorrowers[flashBorrower];
  }

  ///@inheritdoc IPool
  function updateFlashloanPremiums(
    uint256 flashLoanPremiumTotal,
    uint256 flashLoanPremiumToProtocol
  ) external override onlyPoolConfigurator {
    _flashLoanPremiumTotal = flashLoanPremiumTotal;
    _flashLoanPremiumToProtocol = flashLoanPremiumToProtocol;
  }

  function _executeBorrow(DataTypes.ExecuteBorrowParams memory vars) internal {
    DataTypes.UserConfigurationMap storage userConfig = _usersConfig[vars.onBehalfOf];

    PoolBaseLogic.executeBorrow(
      _reserves,
      userConfig,
      _reservesList,
      vars,
      DataTypes.ExecuteBorrowHelperParams(
        _maxStableRateBorrowSizePercent,
        _reservesCount,
        _addressesProvider.getPriceOracle()
      )
    );

    _lastBorrower = vars.user;
    _lastBorrowTimestamp = uint40(block.timestamp);
  }

  function _executeDeposit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) internal {
    DataTypes.ReserveData storage reserve = _reserves[asset];

    PoolBaseLogic.executeDeposit(
      reserve,
      _usersConfig[onBehalfOf],
      asset,
      amount,
      onBehalfOf,
      referralCode
    );
  }

  function _executeWithdraw(
    address asset,
    uint256 amount,
    address to
  ) internal returns (uint256) {
    DataTypes.UserConfigurationMap storage userConfig = _usersConfig[msg.sender];
    return
      PoolBaseLogic.executeWithdraw(
        _reserves,
        userConfig,
        _reservesList,
        DataTypes.ExecuteWithdrawParams(
          asset,
          amount,
          to,
          _reservesCount,
          _addressesProvider.getPriceOracle()
        )
      );
  }

  function _executeRepay(
    address asset,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) internal returns (uint256) {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    DataTypes.UserConfigurationMap storage userConfig = _usersConfig[msg.sender];
    return
      PoolBaseLogic.executeRepay(
        reserve,
        userConfig,
        DataTypes.ExecuteRepayParams(
          asset,
          amount,
          rateMode,
          onBehalfOf,
          _lastBorrower,
          _lastBorrowTimestamp
        )
      );
  }

  function _addReserveToList(address asset) internal returns (uint8) {
    uint256 reservesCount = _reservesCount;

    require(reservesCount < _maxNumberOfReserves, Errors.P_NO_MORE_RESERVES_ALLOWED);

    bool reserveAlreadyAdded = _reserves[asset].id != 0 || _reservesList[0] == asset;

    if (!reserveAlreadyAdded) {
      for (uint8 i = 0; i <= reservesCount; i++) {
        if (_reservesList[i] == address(0)) {
          _reserves[asset].id = i;
          _reservesList[i] = asset;
          _reservesCount = reservesCount + 1;
          return i;
        }
      }
    }
  }
}
