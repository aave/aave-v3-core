// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IScaledBalanceToken} from './IScaledBalanceToken.sol';
import {IInitializableDebtToken} from './IInitializableDebtToken.sol';

/**
 * @title IVariableDebtToken
 * @author Aave
 * @notice Defines the basic interface for a variable debt token.
 **/
interface IVariableDebtToken is IScaledBalanceToken, IInitializableDebtToken {
  /**
   * @dev Emitted after the mint action
   * @param from The address performing the mint
   * @param onBehalfOf The address of the user on which behalf minting has been performed
   * @param value The amount to be minted (user entered amount + balance increase from interest)
   * @param balanceIncrease The increase in balance since the last action of the user
   * @param index The last index of the reserve
   **/
  event Mint(
    address indexed from,
    address indexed onBehalfOf,
    uint256 value,
    uint256 balanceIncrease,
    uint256 index
  );

  /**
   * @dev Emitted when variable debt is burnt
   * @param user The user which debt has been burned
   * @param amount The amount of debt being burned (user entered amount - balance increase from interest)
   * @param balanceIncrease The increase in balance since the last action of the user
   * @param index The index of the user
   **/
  event Burn(address indexed user, uint256 amount, uint256 balanceIncrease, uint256 index);

  /**
   * @notice Mints debt token to the `onBehalfOf` address
   * @param user The address receiving the borrowed underlying, being the delegatee in case
   * of credit delegate, or same as `onBehalfOf` otherwise
   * @param onBehalfOf The address receiving the debt tokens
   * @param amount The amount of debt being minted
   * @param index The variable debt index of the reserve
   * @return True if the previous balance of the user is 0, false otherwise
   * @return The scaled total debt of the reserve
   **/
  function mint(
    address user,
    address onBehalfOf,
    uint256 amount,
    uint256 index
  ) external returns (bool, uint256);

  /**
   * @notice Burns user variable debt
   * @dev In some instances, a burn transaction will emit a mint event
   * if the amount to burn is less than the interest the user earned
   * @param user The user which debt is burnt
   * @param amount The amount getting burned
   * @param index The variable debt index of the reserve
   * @return The scaled total debt of the reserve
   **/
  function burn(
    address user,
    uint256 amount,
    uint256 index
  ) external returns (uint256);

  /**
   * @notice Returns the address of the underlying asset of this debtToken (E.g. WETH for variableDebtWETH)
   * @return The address of the underlying asset
   **/
  function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}
