// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.6;

/**
 * @title IReserveInterestRateStrategy
 * @author Aave
 * @notice Interface for the calculation of the interest rates
 */
interface IReserveInterestRateStrategy {
  /**
   * @notice Returns the base variable borrow rate
   * @return The base variable borrow rate
   **/
  function baseVariableBorrowRate() external view returns (uint256);

  /**
   * @notice Returns the maximum variable borrow rate
   * @return The maximum variable borrow rate
   **/
  function getMaxVariableBorrowRate() external view returns (uint256);

  /**
   * @notice Calculates the interest rates depending on the reserve's state and configurations.
   * @dev Deprecated: This function is kept for compatibility with previous DefaultInterestRateStrategy interfaces.
   * @param reserve The address of the reserve
   * @param availableLiquidity The liquidity available in the corresponding aToken
   * @param totalStableDebt The total borrowed from the reserve at a stable rate
   * @param totalVariableDebt The total borrowed from the reserve at a variable rate
   * @param averageStableBorrowRate The weighted average of all the stable rate borrowings
   * @param reserveFactor The reserve portion of the interest that goes to the treasury of the market
   * @return The liquidity rate
   * @return The stable borrow rate
   * @return The variable borrow rate
   **/
  function calculateInterestRates(
    address reserve,
    uint256 availableLiquidity,
    uint256 totalStableDebt,
    uint256 totalVariableDebt,
    uint256 averageStableBorrowRate,
    uint256 reserveFactor
  )
    external
    view
    returns (
      uint256,
      uint256,
      uint256
    );

  /**
   * @notice Calculates the interest rates depending on the reserve's state and configurations
   * @param reserve The address of the reserve
   * @param liquidityAdded The liquidity added during the operation
   * @param liquidityTaken The liquidity taken during the operation
   * @param totalStableDebt The total borrowed from the reserve at a stable rate
   * @param totalVariableDebt The total borrowed from the reserve at a variable rate
   * @param averageStableBorrowRate The weighted average of all the stable rate borrowings
   * @param reserveFactor The reserve portion of the interest that goes to the treasury of the market
   * @return The liquidity rate
   * @return The stable borrow rate
   * @return The variable borrow rate
   **/
  function calculateInterestRates(
    address reserve,
    address aToken,
    uint256 liquidityAdded,
    uint256 liquidityTaken,
    uint256 totalStableDebt,
    uint256 totalVariableDebt,
    uint256 averageStableBorrowRate,
    uint256 reserveFactor
  )
    external
    view
    returns (
      uint256,
      uint256,
      uint256
    );
}
