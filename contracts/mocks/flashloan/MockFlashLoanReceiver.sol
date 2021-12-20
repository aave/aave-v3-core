// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {SafeERC20} from '../../dependencies/openzeppelin/contracts/SafeERC20.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {FlashLoanReceiverBase} from '../../flashloan/base/FlashLoanReceiverBase.sol';
import {MintableERC20} from '../tokens/MintableERC20.sol';

contract MockFlashLoanReceiver is FlashLoanReceiverBase {
  using SafeERC20 for IERC20;

  event ExecutedWithFail(address[] _assets, uint256[] _amounts, uint256[] _premiums);
  event ExecutedWithSuccess(address[] _assets, uint256[] _amounts, uint256[] _premiums);

  bool _failExecution;
  uint256 _amountToApprove;
  bool _simulateEOA;

  constructor(IPoolAddressesProvider provider) FlashLoanReceiverBase(provider) {}

  function setFailExecutionTransfer(bool fail) public {
    _failExecution = fail;
  }

  function setAmountToApprove(uint256 amountToApprove) public {
    _amountToApprove = amountToApprove;
  }

  function setSimulateEOA(bool flag) public {
    _simulateEOA = flag;
  }

  function getAmountToApprove() public view returns (uint256) {
    return _amountToApprove;
  }

  function simulateEOA() public view returns (bool) {
    return _simulateEOA;
  }

  function executeOperation(
    address[] memory assets,
    uint256[] memory amounts,
    uint256[] memory premiums,
    address, // initiator
    bytes memory // params
  ) public override returns (bool) {
    if (_failExecution) {
      emit ExecutedWithFail(assets, amounts, premiums);
      return !_simulateEOA;
    }

    for (uint256 i = 0; i < assets.length; i++) {
      //mint to this contract the specific amount
      MintableERC20 token = MintableERC20(assets[i]);

      //check the contract has the specified balance
      require(
        amounts[i] <= IERC20(assets[i]).balanceOf(address(this)),
        'Invalid balance for the contract'
      );

      uint256 amountToReturn = (_amountToApprove != 0)
        ? _amountToApprove
        : amounts[i] + premiums[i];
      //execution does not fail - mint tokens and return them to the _destination

      token.mint(premiums[i]);

      IERC20(assets[i]).approve(address(POOL), amountToReturn);
    }

    emit ExecutedWithSuccess(assets, amounts, premiums);

    return true;
  }
}
