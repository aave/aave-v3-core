// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import {IUniswapV2Router02} from '../../interfaces/IUniswapV2Router02.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {MintableERC20} from '../tokens/MintableERC20.sol';

contract MockUniswapV2Router02 is IUniswapV2Router02 {
  mapping(address => uint256) internal _amountToReturn;
  mapping(address => uint256) internal _amountToSwap;
  mapping(address => mapping(address => mapping(uint256 => uint256))) internal _amountsIn;
  mapping(address => mapping(address => mapping(uint256 => uint256))) internal _amountsOut;
  uint256 internal defaultMockValue;

  function setAmountToReturn(address reserve, uint256 amount) public {
    _amountToReturn[reserve] = amount;
  }

  function setAmountToSwap(address reserve, uint256 amount) public {
    _amountToSwap[reserve] = amount;
  }

  function swapExactTokensForTokens(
    uint256 amountIn,
    uint256, /* amountOutMin */
    address[] calldata path,
    address to,
    uint256 /* deadline */
  ) external override returns (uint256[] memory amounts) {
    IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

    MintableERC20(path[1]).mint(_amountToReturn[path[0]]);
    IERC20(path[1]).transfer(to, _amountToReturn[path[0]]);

    amounts = new uint256[](path.length);
    amounts[0] = amountIn;
    amounts[1] = _amountToReturn[path[0]];
  }

  function swapTokensForExactTokens(
    uint256 amountOut,
    uint256, /* amountInMax */
    address[] calldata path,
    address to,
    uint256 /* deadline */
  ) external override returns (uint256[] memory amounts) {
    IERC20(path[0]).transferFrom(msg.sender, address(this), _amountToSwap[path[0]]);

    MintableERC20(path[1]).mint(amountOut);
    IERC20(path[1]).transfer(to, amountOut);

    amounts = new uint256[](path.length);
    amounts[0] = _amountToSwap[path[0]];
    amounts[1] = amountOut;
  }

  function setAmountOut(
    uint256 amountIn,
    address reserveIn,
    address reserveOut,
    uint256 amountOut
  ) public {
    _amountsOut[reserveIn][reserveOut][amountIn] = amountOut;
  }

  function setAmountIn(
    uint256 amountOut,
    address reserveIn,
    address reserveOut,
    uint256 amountIn
  ) public {
    _amountsIn[reserveIn][reserveOut][amountOut] = amountIn;
  }

  function setDefaultMockValue(uint256 value) public {
    defaultMockValue = value;
  }

  function getAmountsOut(uint256 amountIn, address[] calldata path)
    external
    view
    override
    returns (uint256[] memory)
  {
    uint256[] memory amounts = new uint256[](path.length);
    amounts[0] = amountIn;
    amounts[1] = _amountsOut[path[0]][path[1]][amountIn] > 0
      ? _amountsOut[path[0]][path[1]][amountIn]
      : defaultMockValue;
    return amounts;
  }

  function getAmountsIn(uint256 amountOut, address[] calldata path)
    external
    view
    override
    returns (uint256[] memory)
  {
    uint256[] memory amounts = new uint256[](path.length);
    amounts[0] = _amountsIn[path[0]][path[1]][amountOut] > 0
      ? _amountsIn[path[0]][path[1]][amountOut]
      : defaultMockValue;
    amounts[1] = amountOut;
    return amounts;
  }
}
