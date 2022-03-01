// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

import {IPriceOracle} from '../../interfaces/IPriceOracle.sol';

contract PriceOracle is IPriceOracle {
  // Map of asset prices (asset => price)
  mapping(address => uint256) internal prices;

  uint256 internal ethPriceUsd;

  event AssetPriceUpdated(address asset, uint256 price, uint256 timestamp);
  event EthPriceUpdated(uint256 price, uint256 timestamp);

  function getAssetPrice(address asset) external view override returns (uint256) {
    return prices[asset];
  }

  function setAssetPrice(address asset, uint256 price) external override {
    prices[asset] = price;
    emit AssetPriceUpdated(asset, price, block.timestamp);
  }

  function getEthUsdPrice() external view returns (uint256) {
    return ethPriceUsd;
  }

  function setEthUsdPrice(uint256 price) external {
    ethPriceUsd = price;
    emit EthPriceUpdated(price, block.timestamp);
  }
}
