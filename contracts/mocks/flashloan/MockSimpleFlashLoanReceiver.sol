// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {SafeMath} from '../../dependencies/openzeppelin/contracts/SafeMath.sol';
import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {SafeMath} from '../../dependencies/openzeppelin/contracts/SafeMath.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {FlashLoanSimpleReceiverBase} from '../../flashloan/base/FlashLoanSimpleReceiverBase.sol';
import {MintableERC20} from '../tokens/MintableERC20.sol';

contract MockFlashLoanSimpleReceiver is FlashLoanSimpleReceiverBase {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  IPoolAddressesProvider internal _provider;

  event ExecutedWithFail(address _asset, uint256 _amount, uint256 _premium);
  event ExecutedWithSuccess(address _asset, uint256 _amount, uint256 _premium);

  bool _failExecution;
  uint256 _amountToApprove;
  bool _simulateEOA;

  constructor(IPoolAddressesProvider provider) FlashLoanSimpleReceiverBase(provider) {}

  function setFailExecutionTransfer(bool fail) public {
    _failExecution = fail;
  }

  function setAmountToApprove(uint256 amountToApprove) public {
    _amountToApprove = amountToApprove;
  }

  function setSimulateEOA(bool flag) public {
    _simulateEOA = flag;
  }

  function amountToApprove() public view returns (uint256) {
    return _amountToApprove;
  }

  function simulateEOA() public view returns (bool) {
    return _simulateEOA;
  }

  function executeOperation(
    address asset,
    uint256 amount,
    uint256 premium,
    address initiator,
    bytes memory params
  ) public override returns (bool) {
    params;
    initiator;

    if (_failExecution) {
      emit ExecutedWithFail(asset, amount, premium);
      return !_simulateEOA;
    }

    //mint to this contract the specific amount
    MintableERC20 token = MintableERC20(asset);

    //check the contract has the specified balance
    require(amount <= IERC20(asset).balanceOf(address(this)), 'Invalid balance for the contract');

    uint256 amountToReturn = (_amountToApprove != 0) ? _amountToApprove : amount.add(premium);
    //execution does not fail - mint tokens and return them to the _destination

    token.mint(premium);

    IERC20(asset).approve(address(POOL), amountToReturn);

    emit ExecutedWithSuccess(asset, amount, premium);

    return true;
  }
}
