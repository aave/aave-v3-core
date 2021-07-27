// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {BaseUniswapAdapter} from './BaseUniswapAdapter.sol';
import {ILendingPoolAddressesProvider} from '../interfaces/ILendingPoolAddressesProvider.sol';
import {IUniswapV2Router02} from '../interfaces/IUniswapV2Router02.sol';
import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';

/**
 * @title UniswapLiquiditySwapAdapter
 * @notice Uniswap V2 Adapter to swap liquidity.
 * @author Aave
 **/
contract UniswapLiquiditySwapAdapter is BaseUniswapAdapter {
  struct PermitParams {
    uint256[] amount;
    uint256[] deadline;
    uint8[] v;
    bytes32[] r;
    bytes32[] s;
  }

  struct SwapParams {
    address[] assetToSwapToList;
    uint256[] minAmountsToReceive;
    bool[] swapAllBalance;
    PermitParams permitParams;
    bool[] useEthPath;
  }

  constructor(
    ILendingPoolAddressesProvider addressesProvider,
    IUniswapV2Router02 uniswapRouter,
    address wethAddress
  ) public BaseUniswapAdapter(addressesProvider, uniswapRouter, wethAddress) {}

  /**
   * @dev Swaps the received reserve amount from the flash loan into the asset specified in the params.
   * The received funds from the swap are then deposited into the protocol on behalf of the user.
   * The user should give this contract allowance to pull the ATokens in order to withdraw the underlying asset and
   * repay the flash loan.
   * @param assets Address of asset to be swapped
   * @param amounts Amount of the asset to be swapped
   * @param premiums Fee of the flash loan
   * @param initiator Address of the user
   * @param params Additional variadic field to include extra params. Expected parameters:
   *   address[] assetToSwapToList List of the addresses of the reserve to be swapped to and deposited
   *   uint256[] minAmountsToReceive List of min amounts to be received from the swap
   *   bool[] swapAllBalance Flag indicating if all the user balance should be swapped
   *   uint256[] permitAmount List of amounts for the permit signature
   *   uint256[] deadline List of deadlines for the permit signature
   *   uint8[] v List of v param for the permit signature
   *   bytes32[] r List of r param for the permit signature
   *   bytes32[] s List of s param for the permit signature
   */
  function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
  ) external override returns (bool) {
    require(msg.sender == address(LENDING_POOL), 'CALLER_MUST_BE_LENDING_POOL');

    SwapParams memory decodedParams = _decodeParams(params);

    require(
      assets.length == decodedParams.assetToSwapToList.length &&
        assets.length == decodedParams.minAmountsToReceive.length &&
        assets.length == decodedParams.swapAllBalance.length &&
        assets.length == decodedParams.permitParams.amount.length &&
        assets.length == decodedParams.permitParams.deadline.length &&
        assets.length == decodedParams.permitParams.v.length &&
        assets.length == decodedParams.permitParams.r.length &&
        assets.length == decodedParams.permitParams.s.length &&
        assets.length == decodedParams.useEthPath.length,
      'INCONSISTENT_PARAMS'
    );

    for (uint256 i = 0; i < assets.length; i++) {
      _swapLiquidity(
        assets[i],
        decodedParams.assetToSwapToList[i],
        amounts[i],
        premiums[i],
        initiator,
        decodedParams.minAmountsToReceive[i],
        decodedParams.swapAllBalance[i],
        PermitSignature(
          decodedParams.permitParams.amount[i],
          decodedParams.permitParams.deadline[i],
          decodedParams.permitParams.v[i],
          decodedParams.permitParams.r[i],
          decodedParams.permitParams.s[i]
        ),
        decodedParams.useEthPath[i]
      );
    }

    return true;
  }

  struct SwapAndDepositLocalVars {
    uint256 i;
    uint256 aTokenInitiatorBalance;
    uint256 amountToSwap;
    uint256 receivedAmount;
    address aToken;
  }

  /**
   * @dev Swaps an amount of an asset to another and deposits the new asset amount on behalf of the user without using
   * a flash loan. This method can be used when the temporary transfer of the collateral asset to this contract
   * does not affect the user position.
   * The user should give this contract allowance to pull the ATokens in order to withdraw the underlying asset and
   * perform the swap.
   * @param assetToSwapFromList List of addresses of the underlying asset to be swap from
   * @param assetToSwapToList List of addresses of the underlying asset to be swap to and deposited
   * @param amountToSwapList List of amounts to be swapped. If the amount exceeds the balance, the total balance is used for the swap
   * @param minAmountsToReceive List of min amounts to be received from the swap
   * @param permitParams List of struct containing the permit signatures
   *   uint256 permitAmount Amount for the permit signature
   *   uint256 deadline Deadline for the permit signature
   *   uint8 v param for the permit signature
   *   bytes32 r param for the permit signature
   *   bytes32 s param for the permit signature
   * @param useEthPath true if the swap needs to occur using ETH in the routing, false otherwise
   */
  function swapAndDeposit(
    address[] calldata assetToSwapFromList,
    address[] calldata assetToSwapToList,
    uint256[] calldata amountToSwapList,
    uint256[] calldata minAmountsToReceive,
    PermitSignature[] calldata permitParams,
    bool[] calldata useEthPath
  ) external {
    require(
      assetToSwapFromList.length == assetToSwapToList.length &&
        assetToSwapFromList.length == amountToSwapList.length &&
        assetToSwapFromList.length == minAmountsToReceive.length &&
        assetToSwapFromList.length == permitParams.length,
      'INCONSISTENT_PARAMS'
    );

    SwapAndDepositLocalVars memory vars;

    for (vars.i = 0; vars.i < assetToSwapFromList.length; vars.i++) {
      vars.aToken = _getReserveData(assetToSwapFromList[vars.i]).aTokenAddress;

      vars.aTokenInitiatorBalance = IERC20(vars.aToken).balanceOf(msg.sender);
      vars.amountToSwap = amountToSwapList[vars.i] > vars.aTokenInitiatorBalance
        ? vars.aTokenInitiatorBalance
        : amountToSwapList[vars.i];

      _pullAToken(
        assetToSwapFromList[vars.i],
        vars.aToken,
        msg.sender,
        vars.amountToSwap,
        permitParams[vars.i]
      );

      vars.receivedAmount = _swapExactTokensForTokens(
        assetToSwapFromList[vars.i],
        assetToSwapToList[vars.i],
        vars.amountToSwap,
        minAmountsToReceive[vars.i],
        useEthPath[vars.i]
      );

      // Deposit new reserve
      IERC20(assetToSwapToList[vars.i]).safeApprove(address(LENDING_POOL), 0);
      IERC20(assetToSwapToList[vars.i]).safeApprove(address(LENDING_POOL), vars.receivedAmount);
      LENDING_POOL.deposit(assetToSwapToList[vars.i], vars.receivedAmount, msg.sender, 0);
    }
  }

  /**
   * @dev Swaps an `amountToSwap` of an asset to another and deposits the funds on behalf of the initiator.
   * @param assetFrom Address of the underlying asset to be swap from
   * @param assetTo Address of the underlying asset to be swap to and deposited
   * @param amount Amount from flash loan
   * @param premium Premium of the flash loan
   * @param minAmountToReceive Min amount to be received from the swap
   * @param swapAllBalance Flag indicating if all the user balance should be swapped
   * @param permitSignature List of struct containing the permit signature
   * @param useEthPath true if the swap needs to occur using ETH in the routing, false otherwise
   */

  struct SwapLiquidityLocalVars {
    address aToken;
    uint256 aTokenInitiatorBalance;
    uint256 amountToSwap;
    uint256 receivedAmount;
    uint256 flashLoanDebt;
    uint256 amountToPull;
  }

  function _swapLiquidity(
    address assetFrom,
    address assetTo,
    uint256 amount,
    uint256 premium,
    address initiator,
    uint256 minAmountToReceive,
    bool swapAllBalance,
    PermitSignature memory permitSignature,
    bool useEthPath
  ) internal {
    SwapLiquidityLocalVars memory vars;

    vars.aToken = _getReserveData(assetFrom).aTokenAddress;

    vars.aTokenInitiatorBalance = IERC20(vars.aToken).balanceOf(initiator);
    vars.amountToSwap = swapAllBalance && vars.aTokenInitiatorBalance.sub(premium) <= amount
      ? vars.aTokenInitiatorBalance.sub(premium)
      : amount;

    vars.receivedAmount = _swapExactTokensForTokens(
      assetFrom,
      assetTo,
      vars.amountToSwap,
      minAmountToReceive,
      useEthPath
    );

    // Deposit new reserve
    IERC20(assetTo).safeApprove(address(LENDING_POOL), 0);
    IERC20(assetTo).safeApprove(address(LENDING_POOL), vars.receivedAmount);
    LENDING_POOL.deposit(assetTo, vars.receivedAmount, initiator, 0);

    vars.flashLoanDebt = amount.add(premium);
    vars.amountToPull = vars.amountToSwap.add(premium);

    _pullAToken(assetFrom, vars.aToken, initiator, vars.amountToPull, permitSignature);

    // Repay flash loan
    IERC20(assetFrom).safeApprove(address(LENDING_POOL), 0);
    IERC20(assetFrom).safeApprove(address(LENDING_POOL), vars.flashLoanDebt);
  }

  /**
   * @dev Decodes the information encoded in the flash loan params
   * @param params Additional variadic field to include extra params. Expected parameters:
   *   address[] assetToSwapToList List of the addresses of the reserve to be swapped to and deposited
   *   uint256[] minAmountsToReceive List of min amounts to be received from the swap
   *   bool[] swapAllBalance Flag indicating if all the user balance should be swapped
   *   uint256[] permitAmount List of amounts for the permit signature
   *   uint256[] deadline List of deadlines for the permit signature
   *   uint8[] v List of v param for the permit signature
   *   bytes32[] r List of r param for the permit signature
   *   bytes32[] s List of s param for the permit signature
   *   bool[] useEthPath true if the swap needs to occur using ETH in the routing, false otherwise
   * @return SwapParams struct containing decoded params
   */
  function _decodeParams(bytes memory params) internal pure returns (SwapParams memory) {
    (
      address[] memory assetToSwapToList,
      uint256[] memory minAmountsToReceive,
      bool[] memory swapAllBalance,
      uint256[] memory permitAmount,
      uint256[] memory deadline,
      uint8[] memory v,
      bytes32[] memory r,
      bytes32[] memory s,
      bool[] memory useEthPath
    ) =
      abi.decode(
        params,
        (address[], uint256[], bool[], uint256[], uint256[], uint8[], bytes32[], bytes32[], bool[])
      );

    return
      SwapParams(
        assetToSwapToList,
        minAmountsToReceive,
        swapAllBalance,
        PermitParams(permitAmount, deadline, v, r, s),
        useEthPath
      );
  }
}
