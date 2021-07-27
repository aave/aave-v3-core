pragma solidity 0.6.12;

import {StableDebtToken} from '../../contracts/protocol/tokenization/StableDebtToken.sol';
import {IncentivizedERC20} from '../../contracts/protocol/tokenization/IncentivizedERC20.sol';

contract StableDebtTokenHarness is StableDebtToken {
  constructor(
    address pool,
    address underlyingAsset,
    string memory name,
    string memory symbol,
    address incentivesController
  ) public StableDebtToken(pool, underlyingAsset, name, symbol, incentivesController) {}

  /**
   Simplification: The user accumulates no interest (the balance increase is always 0).
   **/
  function balanceOf(address account) public view override returns (uint256) {
    return IncentivizedERC20.balanceOf(account);
  }

  function _calcTotalSupply(uint256 avgRate) internal view override returns (uint256) {
    return IncentivizedERC20.totalSupply();
  }

  function getIncentivesController() public view returns (address) {
    return address(_incentivesController);
  }

  function rayWadMul(uint256 aRay, uint256 bWad) external view returns (uint256) {
    return aRay.rayMul(bWad.wadToRay());
  }
}
