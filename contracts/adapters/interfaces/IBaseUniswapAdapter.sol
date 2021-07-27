// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IPriceOracleGetter} from '../../interfaces/IPriceOracleGetter.sol';
import {IUniswapV2Router02} from '../../interfaces/IUniswapV2Router02.sol';

interface IBaseUniswapAdapter {
  event Swapped(address fromAsset, address toAsset, uint256 fromAmount, uint256 receivedAmount);

  struct PermitSignature {
    uint256 amount;
    uint256 deadline;
    uint8 v;
    bytes32 r;
    bytes32 s;
  }

  struct AmountCalc {
    uint256 calculatedAmount;
    uint256 relativePrice;
    uint256 amountInUsd;
    uint256 amountOutUsd;
    address[] path;
  }

  function WETH_ADDRESS() external returns (address);

  function MAX_SLIPPAGE_PERCENT() external returns (uint256);

  function FLASHLOAN_PREMIUM_TOTAL() external returns (uint256);

  function USD_ADDRESS() external returns (address);

  function ORACLE() external returns (IPriceOracleGetter);

  function UNISWAP_ROUTER() external returns (IUniswapV2Router02);

  /**
   * @dev Given an input asset amount, returns the maximum output amount of the other asset and the prices
   * @param amountIn Amount of reserveIn
   * @param reserveIn Address of the asset to be swap from
   * @param reserveOut Address of the asset to be swap to
   * @return uint256 Amount out of the reserveOut
   * @return uint256 The price of out amount denominated in the reserveIn currency (18 decimals)
   * @return uint256 In amount of reserveIn value denominated in USD (8 decimals)
   * @return uint256 Out amount of reserveOut value denominated in USD (8 decimals)
   * @return address[] The exchange path
   */
  function getAmountsOut(
    uint256 amountIn,
    address reserveIn,
    address reserveOut
  )
    external
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256,
      address[] memory
    );

  /**
   * @dev Returns the minimum input asset amount required to buy the given output asset amount and the prices
   * @param amountOut Amount of reserveOut
   * @param reserveIn Address of the asset to be swap from
   * @param reserveOut Address of the asset to be swap to
   * @return uint256 Amount in of the reserveIn
   * @return uint256 The price of in amount denominated in the reserveOut currency (18 decimals)
   * @return uint256 In amount of reserveIn value denominated in USD (8 decimals)
   * @return uint256 Out amount of reserveOut value denominated in USD (8 decimals)
   * @return address[] The exchange path
   */
  function getAmountsIn(
    uint256 amountOut,
    address reserveIn,
    address reserveOut
  )
    external
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256,
      address[] memory
    );
}
