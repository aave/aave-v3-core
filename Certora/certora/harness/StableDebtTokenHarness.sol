pragma solidity 0.8.10;

import {StableDebtToken} from '../../contracts/protocol/tokenization/StableDebtToken.sol';
import {IncentivizedERC20} from '../../contracts/protocol/tokenization/base/IncentivizedERC20.sol';
import {IPool} from '../../contracts/interfaces/IPool.sol';
// import {IAaveIncentivesController} from '../../contracts/interfaces/IAaveIncentivesController.sol';

contract StableDebtTokenHarness is StableDebtToken {
  constructor(
    IPool pool
    // address underlyingAsset,
    // string memory name,
    // string memory symbol,
    // address incentivesController
  ) public StableDebtToken(pool) {}

  /**
   Simplification: The user accumulates no interest (the balance increase is always 0).
   **/
  function balanceOf(address account) public view override returns (uint256) {
    return IncentivizedERC20.balanceOf(account);
  }

  function _calcTotalSupply(uint256 avgRate) internal view override returns (uint256) {
    return IncentivizedERC20.totalSupply();
  }

  function additionalData(address user) public view returns (uint128) {
    return _userState[user].additionalData;
  }

  // function burn(address user, uint256 amount) external override onlyPool returns (uint256, uint256) {
  //   require (amount > 0);
  //   return super.burn(user, amount);
  // }

  // function getIncentivesController() external view override returns (IAaveIncentivesController) {
  //   return address(_incentivesController);
  // }

  // function rayWadMul(uint256 aRay, uint256 bWad) external view returns (uint256) {
  //   return aRay.rayMul(bWad.wadToRay());
  // }



}
