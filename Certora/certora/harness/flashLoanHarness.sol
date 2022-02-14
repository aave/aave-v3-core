pragma solidity 0.8.10;
import {SafeERC20} from '../../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IAToken} from '../../../interfaces/IAToken.sol';
import {IFlashLoanReceiver} from '../../../flashloan/interfaces/IFlashLoanReceiver.sol';
import {IFlashLoanSimpleReceiver} from '../../../flashloan/interfaces/IFlashLoanSimpleReceiver.sol';
import {IPoolAddressesProvider} from '../../../interfaces/IPoolAddressesProvider.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {Helpers} from '../helpers/Helpers.sol';
import {Errors} from '../helpers/Errors.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {BorrowLogic} from './BorrowLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {FlashLoanLogic} from '.FlashLoanLogic.sol';
contract FlashLoanLogicHarness {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  struct FlashLoanSimpleLocalVars {
    IFlashLoanSimpleReceiver receiver;
    uint256 totalPremium;
    uint256 premiumToLP;
    uint256 premiumToProtocol;
    uint256 amountPlusPremium;
  }
  function wrapper(uint256 data,uint128 liquidityIndex,uint128 currentLiquidityRate,uint128 variableBorrowIndex,
  uint128 currentVariableBorrowRate,
  uint128 currentStableBorrowRate,
  uint40 lastUpdateTimestamp,
  address aTokenAddress,
  address stableDebtTokenAddress,
  address variableDebtTokenAddress,
  address interestRateStrategyAddress,
  uint8 id,
  uint128 accruedToTreasury,
  uint128 unbacked,
  uint128 isolationModeTotalDebt,
  address receiverAddress,
    address asset,
    uint256 amount,
    bytes params,
    uint16 referralCode,
    uint256 flashLoanPremiumToProtocol,
    uint256 flashLoanPremiumTotal,
    ) public{
      DataTypes.ReserveData reserve;
      DataTypes.ReserveConfigurationMap configuration;
      configuration.data=data;
      reserve.configuration =configuration;
      reserve.liquidityIndex=liquidityIndex;
      reserve.currentLiquidityRate=currentLiquidityRate;
      reserve.variableBorrowIndex=variableBorrowIndex;
      reserve.currentVariableBorrowRate=currentVariableBorrowRate;
      reserve.lastUpdateTimestam=lastUpdateTimestam;
      reserve.aTokenAddress=aTokenAddress;
      reserve.stableDebtTokenAddress=stableDebtTokenAddress;
      reserve.variableDebtTokenAddress=variableDebtTokenAddress;
      reserve.interestRateStrategyAddress=interestRateStrategyAddress;
      reserve.id=id;
      reserve.accruedToTreasury=accruedToTreasury;
      reserve.unbacked=unbacked;
      reserve.isolationModeTotalDebt=isolationModeTotalDebt;
      DataTypes.FlashloanSimpleParams params;
      params.receiverAddress=receiverAddress;
      params.asset=asset;
      params.amount=amount;
      params.params=params;
      params.referralCode=referralCode;
      params.flashLoanPremiumToProtocol=flashLoanPremiumToProtocol;
      params.flashLoanPremiumTotal=flashLoanPremiumTotal;
      FlashLoanLogic.executeFlashLoanSimple(reserve,params);
      
      



      

  }
}
  
  