// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

interface IUniswapExchange {
  event TokenPurchase(
    address indexed buyer,
    uint256 indexed eth_sold,
    uint256 indexed tokens_bought
  );
  event EthPurchase(address indexed buyer, uint256 indexed tokens_sold, uint256 indexed eth_bought);
  event AddLiquidity(
    address indexed provider,
    uint256 indexed eth_amount,
    uint256 indexed token_amount
  );
  event RemoveLiquidity(
    address indexed provider,
    uint256 indexed eth_amount,
    uint256 indexed token_amount
  );
}
