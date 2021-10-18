// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

/**
 * @title IPriceOracleGetter
 * @author Aave
 * @notice Interface for the Aave price oracle.
 **/
interface IPriceOracleGetter {
  /**
   * @notice Returns the base currency address
   * @return Returns the base currency address. MOCK_USD_ADDRESS if usd market
   **/
  function BASE_CURRENCY() external view returns (address);

  /**
   * @notice Returns the base currency unit
   * @return Returns the base currency unit. 1 ether if eth market and 100000000 if usd market
   **/
  function BASE_CURRENCY_UNIT() external view returns (uint256);

  /**
   * @notice Returns the asset price in the base currency
   * @param asset The address of the asset
   * @return The price of the asset
   **/
  function getAssetPrice(address asset) external view returns (uint256);
}
