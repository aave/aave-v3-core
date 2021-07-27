pragma solidity 0.6.12;

import {ILendingPool} from '../../interfaces/ILendingPool.sol';
import {MintableERC20} from '../tokens/MintableERC20.sol';

contract BorrowRepayTestMock {
  ILendingPool _pool;
  address _weth;
  address _dai;

  constructor(ILendingPool pool, address weth, address dai) public {
    _pool = pool;
    _weth = weth;
    _dai = dai;
  }

  function executeBorrowRepayVariable() external {
    //mints 1 eth
    MintableERC20(_weth).mint(1e18);
    //deposits weth in the protocol
    MintableERC20(_weth).approve(address(_pool),type(uint256).max);
    _pool.deposit(_weth, 1e18, address(this),0);
    //borrow 1 wei of weth at variable
    _pool.borrow(_weth, 1, 2, 0, address(this));
    //repay 1 wei of weth (expected to fail)
    _pool.repay(_weth, 1, 2, address(this));
  }

    function executeBorrowRepayStable() external {
    //mints 1 eth
    MintableERC20(_weth).mint(1e18);
    //mints 1 dai
    MintableERC20(_dai).mint(1e18);
    //deposits weth in the protocol
    MintableERC20(_weth).approve(address(_pool),type(uint256).max);
    _pool.deposit(_weth, 1e18, address(this),0);

    //deposits dai in the protocol
    MintableERC20(_dai).approve(address(_pool),type(uint256).max);
    _pool.deposit(_dai, 1e18, address(this),0);

    //disabling dai as collateral so it can be borrowed at stable
    _pool.setUserUseReserveAsCollateral(_dai, false);
    //borrow 1 wei of dai at stable
    _pool.borrow(_dai, 1, 1, 0, address(this));

    //repay 1 wei of dai (expected to fail)
    _pool.repay(_dai, 1, 1, address(this));
  }

}
