// import { makeSuite, TestEnv } from './helpers/make-suite';
// import {
//   convertToCurrencyDecimals,
//   getContract,
//   buildPermitParams,
//   getSignatureFromTypedData,
//   buildLiquiditySwapParams,
// } from '../../helpers/contracts-helpers';
// import { getMockUniswapRouter } from '../../helpers/contracts-getters';
// import { deployUniswapLiquiditySwapAdapter } from '../../helpers/contracts-deployments';
// import { MockUniswapV2Router02 } from '../../types/MockUniswapV2Router02';
// import { Zero } from '@ethersproject/constants';
// import BigNumber from 'bignumber.js';
// import { DRE, evmRevert, evmSnapshot } from '../../helpers/misc-utils';
// import { ethers } from 'ethers';
// import { eContractid } from '../../helpers/types';
// import { AToken } from '../../types/AToken';
// import { BUIDLEREVM_CHAINID } from '../../helpers/buidler-constants';
// import { MAX_UINT_AMOUNT } from '../../helpers/constants';
// const { parseEther } = ethers.utils;

// const { expect } = require('chai');

// makeSuite('Uniswap adapters', (testEnv: TestEnv) => {
//   let mockUniswapRouter: MockUniswapV2Router02;
//   let evmSnapshotId: string;

//   before(async () => {
//     mockUniswapRouter = await getMockUniswapRouter();
//   });

//   beforeEach(async () => {
//     evmSnapshotId = await evmSnapshot();
//   });

//   afterEach(async () => {
//     await evmRevert(evmSnapshotId);
//   });

//   describe('UniswapLiquiditySwapAdapter', () => {
//     describe('constructor', () => {
//       it('should deploy with correct parameters', async () => {
//         const { addressesProvider, weth } = testEnv;
//         await deployUniswapLiquiditySwapAdapter([
//           addressesProvider.address,
//           mockUniswapRouter.address,
//           weth.address,
//         ]);
//       });

//       it('should revert if not valid addresses provider', async () => {
//         const { weth } = testEnv;
//         expect(
//           deployUniswapLiquiditySwapAdapter([
//             mockUniswapRouter.address,
//             mockUniswapRouter.address,
//             weth.address,
//           ])
//         ).to.be.reverted;
//       });
//     });

//     describe('executeOperation', () => {
//       beforeEach(async () => {
//         const { users, weth, dai, usdc, pool, deployer } = testEnv;
//         const userAddress = users[0].address;

//         // Provide liquidity
//         await dai.mint(parseEther('20000'));
//         await dai.approve(pool.address, parseEther('20000'));
//         await pool.deposit(dai.address, parseEther('20000'), deployer.address, 0);

//         const usdcAmount = await convertToCurrencyDecimals(usdc.address, '10');
//         await usdc.mint(usdcAmount);
//         await usdc.approve(pool.address, usdcAmount);
//         await pool.deposit(usdc.address, usdcAmount, deployer.address, 0);

//         // Make a deposit for user
//         await weth.mint(parseEther('100'));
//         await weth.approve(pool.address, parseEther('100'));
//         await pool.deposit(weth.address, parseEther('100'), userAddress, 0);
//       });

//       it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
//         const {
//           users,
//           weth,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, flashloanAmount.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap and deposit multiple tokens', async () => {
//         const {
//           users,
//           weth,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           usdc,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmountForEth = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await dai.decimals()).toString();

//         const expectedDaiAmountForUsdc = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedDaiAmountForUsdc);

//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountWETHtoSwap);
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);
//         await aUsdc.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountUSDCtoSwap);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const wethFlashloanAmount = new BigNumber(amountWETHtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);
//         const usdcFlashloanAmount = new BigNumber(amountUSDCtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [dai.address, dai.address],
//           [expectedDaiAmountForEth, expectedDaiAmountForUsdc],
//           [0, 0],
//           [0, 0],
//           [0, 0],
//           [0, 0],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           [false, false]
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapLiquiditySwapAdapter.address,
//             [weth.address, usdc.address],
//             [wethFlashloanAmount.toString(), usdcFlashloanAmount.toString()],
//             [0, 0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmountForEth.add(expectedDaiAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWETHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap and deposit multiple tokens using permit', async () => {
//         const {
//           users,
//           weth,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           usdc,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;
//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmountForEth = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await dai.decimals()).toString();

//         const expectedDaiAmountForUsdc = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedDaiAmountForUsdc);

//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         const wethFlashloanAmount = new BigNumber(amountWETHtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);

//         const usdcFlashloanAmount = new BigNumber(amountUSDCtoSwap.toString())
//           .div(1.0009)
//           .toFixed(0);

//         const aWethNonce = (await aWETH._nonces(userAddress)).toNumber();
//         const aWethMsgParams = buildPermitParams(
//           chainId,
//           aWETH.address,
//           '1',
//           await aWETH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aWethNonce,
//           deadline,
//           amountWETHtoSwap.toString()
//         );
//         const { v: aWETHv, r: aWETHr, s: aWETHs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aWethMsgParams
//         );

//         const aUsdcNonce = (await aUsdc._nonces(userAddress)).toNumber();
//         const aUsdcMsgParams = buildPermitParams(
//           chainId,
//           aUsdc.address,
//           '1',
//           await aUsdc.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aUsdcNonce,
//           deadline,
//           amountUSDCtoSwap.toString()
//         );
//         const { v: aUsdcv, r: aUsdcr, s: aUsdcs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aUsdcMsgParams
//         );
//         const params = buildLiquiditySwapParams(
//           [dai.address, dai.address],
//           [expectedDaiAmountForEth, expectedDaiAmountForUsdc],
//           [0, 0],
//           [amountWETHtoSwap, amountUSDCtoSwap],
//           [deadline, deadline],
//           [aWETHv, aUsdcv],
//           [aWETHr, aUsdcr],
//           [aWETHs, aUsdcs],
//           [false, false]
//         );

//         await pool
//           .connect(user)
//           .flashLoan(
//             uniswapLiquiditySwapAdapter.address,
//             [weth.address, usdc.address],
//             [wethFlashloanAmount.toString(), usdcFlashloanAmount.toString()],
//             [0, 0],
//             userAddress,
//             params,
//             0
//           );

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmountForEth.add(expectedDaiAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWETHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap tokens with permit', async () => {
//         const {
//           users,
//           weth,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWETH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWETH.address,
//           '1',
//           await aWETH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0],
//           [liquidityToSwap],
//           [deadline],
//           [v],
//           [r],
//           [s],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, flashloanAmount.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should revert if inconsistent params', async () => {
//         const { users, weth, oracle, dai, aWETH, pool, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [dai.address, weth.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params2 = buildLiquiditySwapParams(
//           [dai.address, weth.address],
//           [expectedDaiAmount],
//           [0, 0],
//           [0, 0],
//           [0, 0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params2,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params3 = buildLiquiditySwapParams(
//           [dai.address, weth.address],
//           [expectedDaiAmount],
//           [0, 0],
//           [0],
//           [0, 0],
//           [0, 0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params3,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params4 = buildLiquiditySwapParams(
//           [dai.address, weth.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params4,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params5 = buildLiquiditySwapParams(
//           [dai.address, weth.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//             '0x0000000000000000000000000000000000000000000000000000000000000000',
//           ],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params5,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params6 = buildLiquiditySwapParams(
//           [dai.address, weth.address],
//           [expectedDaiAmount, expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params6,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params7 = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0, 0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params7,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params8 = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0],
//           [0, 0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params8,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         const params9 = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false, false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params9,
//               0
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');
//       });

//       it('should revert if caller not lending pool', async () => {
//         const { users, weth, oracle, dai, aWETH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           uniswapLiquiditySwapAdapter
//             .connect(user)
//             .executeOperation(
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params
//             )
//         ).to.be.revertedWith('CALLER_MUST_BE_LENDING_POOL');
//       });

//       it('should work correctly with tokens of different decimals', async () => {
//         const {
//           users,
//           usdc,
//           oracle,
//           dai,
//           aDai,
//           uniswapLiquiditySwapAdapter,
//           pool,
//           deployer,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const liquidity = await convertToCurrencyDecimals(usdc.address, '20000');

//         // Provide liquidity
//         await usdc.mint(liquidity);
//         await usdc.approve(pool.address, liquidity);
//         await pool.deposit(usdc.address, liquidity, deployer.address, 0);

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const usdcPrice = await oracle.getAssetPrice(usdc.address);
//         const daiPrice = await oracle.getAssetPrice(dai.address);

//         // usdc 6
//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await dai.decimals()).toString();

//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         await mockUniswapRouter.connect(user).setAmountToReturn(usdc.address, expectedDaiAmount);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);
//         const aUsdcBalance = await aUsdc.balanceOf(userAddress);
//         await aUsdc.connect(user).approve(uniswapLiquiditySwapAdapter.address, aUsdcBalance);
//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(amountUSDCtoSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [usdc.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(usdc.address, dai.address, flashloanAmount.toString(), expectedDaiAmount);

//         const adapterUsdcBalance = await usdc.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const aDaiBalance = await aDai.balanceOf(userAddress);

//         expect(adapterUsdcBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(aDaiBalance).to.be.eq(expectedDaiAmount);
//       });

//       it('should revert when min amount to receive exceeds the max slippage amount', async () => {
//         const { users, weth, oracle, dai, aWETH, pool, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);
//         const smallExpectedDaiAmount = expectedDaiAmount.div(2);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Subtract the FL fee from the amount to be swapped 0,09%
//         const flashloanAmount = new BigNumber(liquidityToSwap.toString()).div(1.0009).toFixed(0);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [smallExpectedDaiAmount],
//           [0],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [flashloanAmount.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         ).to.be.revertedWith('minAmountOut exceed max slippage');
//       });

//       it('should correctly swap tokens all the balance', async () => {
//         const {
//           users,
//           weth,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // Remove other balance
//         await aWETH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [1],
//           [0],
//           [0],
//           [0],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           ['0x0000000000000000000000000000000000000000000000000000000000000000'],
//           [false]
//         );

//         // Flashloan + premium > aToken balance. Then it will only swap the balance - premium
//         const flashloanFee = liquidityToSwap.mul(9).div(10000);
//         const swappedAmount = liquidityToSwap.sub(flashloanFee);

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [liquidityToSwap.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, swappedAmount.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWETH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });

//       it('should correctly swap tokens all the balance using permit', async () => {
//         const {
//           users,
//           weth,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           pool,
//           uniswapLiquiditySwapAdapter,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // Remove other balance
//         await aWETH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWETH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWETH.address,
//           '1',
//           await aWETH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         const params = buildLiquiditySwapParams(
//           [dai.address],
//           [expectedDaiAmount],
//           [1],
//           [liquidityToSwap],
//           [deadline],
//           [v],
//           [r],
//           [s],
//           [false]
//         );

//         // Flashloan + premium > aToken balance. Then it will only swap the balance - premium
//         const flashloanFee = liquidityToSwap.mul(9).div(10000);
//         const swappedAmount = liquidityToSwap.sub(flashloanFee);

//         await expect(
//           pool
//             .connect(user)
//             .flashLoan(
//               uniswapLiquiditySwapAdapter.address,
//               [weth.address],
//               [liquidityToSwap.toString()],
//               [0],
//               userAddress,
//               params,
//               0
//             )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, swappedAmount.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWETH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });
//     });

//     describe('swapAndDeposit', () => {
//       beforeEach(async () => {
//         const { users, weth, dai, pool, deployer } = testEnv;
//         const userAddress = users[0].address;

//         // Provide liquidity
//         await dai.mint(parseEther('20000'));
//         await dai.approve(pool.address, parseEther('20000'));
//         await pool.deposit(dai.address, parseEther('20000'), deployer.address, 0);

//         // Make a deposit for user
//         await weth.mint(parseEther('100'));
//         await weth.approve(pool.address, parseEther('100'));
//         await pool.deposit(weth.address, parseEther('100'), userAddress, 0);
//       });

//       it('should correctly swap tokens and deposit the out tokens in the pool', async () => {
//         const { users, weth, oracle, dai, aDai, aWETH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [amountWETHtoSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, amountWETHtoSwap.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should correctly swap tokens using permit', async () => {
//         const { users, weth, oracle, dai, aDai, aWETH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;
//         const nonce = (await aWETH._nonces(userAddress)).toNumber();
//         const msgParams = buildPermitParams(
//           chainId,
//           aWETH.address,
//           '1',
//           await aWETH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           nonce,
//           deadline,
//           liquidityToSwap.toString()
//         );

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [amountWETHtoSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: liquidityToSwap,
//                 deadline,
//                 v,
//                 r,
//                 s,
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, amountWETHtoSwap.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(liquidityToSwap));
//       });

//       it('should revert if inconsistent params', async () => {
//         const { users, weth, dai, uniswapLiquiditySwapAdapter, oracle } = testEnv;
//         const user = users[0].signer;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');
//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address, dai.address],
//             [dai.address],
//             [amountWETHtoSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address, weth.address],
//             [amountWETHtoSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [amountWETHtoSwap, amountWETHtoSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter
//             .connect(user)
//             .swapAndDeposit(
//               [weth.address],
//               [dai.address],
//               [amountWETHtoSwap],
//               [expectedDaiAmount],
//               [],
//               [false]
//             )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [amountWETHtoSwap],
//             [expectedDaiAmount, expectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('INCONSISTENT_PARAMS');
//       });

//       it('should revert when min amount to receive exceeds the max slippage amount', async () => {
//         const { users, weth, oracle, dai, aWETH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);
//         const smallExpectedDaiAmount = expectedDaiAmount.div(2);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [amountWETHtoSwap],
//             [smallExpectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         ).to.be.revertedWith('minAmountOut exceed max slippage');
//       });

//       it('should correctly swap tokens and deposit multiple tokens', async () => {
//         const {
//           users,
//           weth,
//           usdc,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           uniswapLiquiditySwapAdapter,
//           pool,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmountForEth = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await dai.decimals()).toString();

//         const expectedDaiAmountForUsdc = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedDaiAmountForUsdc);

//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountWETHtoSwap);
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);
//         await aUsdc.connect(user).approve(uniswapLiquiditySwapAdapter.address, amountUSDCtoSwap);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         await uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//           [weth.address, usdc.address],
//           [dai.address, dai.address],
//           [amountWETHtoSwap, amountUSDCtoSwap],
//           [expectedDaiAmountForEth, expectedDaiAmountForUsdc],
//           [
//             {
//               amount: 0,
//               deadline: 0,
//               v: 0,
//               r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             },
//             {
//               amount: 0,
//               deadline: 0,
//               v: 0,
//               r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//             },
//           ],
//           [false, false]
//         );

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmountForEth.add(expectedDaiAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWETHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap tokens and deposit multiple tokens using permit', async () => {
//         const {
//           users,
//           weth,
//           usdc,
//           oracle,
//           dai,
//           aDai,
//           aWETH,
//           uniswapLiquiditySwapAdapter,
//           pool,
//         } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;
//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmountForEth = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         const amountUSDCtoSwap = await convertToCurrencyDecimals(usdc.address, '10');
//         const usdcPrice = await oracle.getAssetPrice(usdc.address);

//         const collateralDecimals = (await usdc.decimals()).toString();
//         const principalDecimals = (await dai.decimals()).toString();

//         const expectedDaiAmountForUsdc = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountUSDCtoSwap.toString())
//             .times(
//               new BigNumber(usdcPrice.toString()).times(new BigNumber(10).pow(principalDecimals))
//             )
//             .div(
//               new BigNumber(daiPrice.toString()).times(new BigNumber(10).pow(collateralDecimals))
//             )
//             .toFixed(0)
//         );

//         // Make a deposit for user
//         await usdc.connect(user).mint(amountUSDCtoSwap);
//         await usdc.connect(user).approve(pool.address, amountUSDCtoSwap);
//         await pool.connect(user).deposit(usdc.address, amountUSDCtoSwap, userAddress, 0);

//         const aUsdcData = await pool.getReserveData(usdc.address);
//         const aUsdc = await getContract<AToken>(eContractid.AToken, aUsdcData.aTokenAddress);

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmountForEth);
//         await mockUniswapRouter.setAmountToReturn(usdc.address, expectedDaiAmountForUsdc);

//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);
//         const userAUsdcBalanceBefore = await aUsdc.balanceOf(userAddress);

//         const aWethNonce = (await aWETH._nonces(userAddress)).toNumber();
//         const aWethMsgParams = buildPermitParams(
//           chainId,
//           aWETH.address,
//           '1',
//           await aWETH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aWethNonce,
//           deadline,
//           amountWETHtoSwap.toString()
//         );
//         const { v: aWETHv, r: aWETHr, s: aWETHs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aWethMsgParams
//         );

//         const aUsdcNonce = (await aUsdc._nonces(userAddress)).toNumber();
//         const aUsdcMsgParams = buildPermitParams(
//           chainId,
//           aUsdc.address,
//           '1',
//           await aUsdc.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aUsdcNonce,
//           deadline,
//           amountUSDCtoSwap.toString()
//         );
//         const { v: aUsdcv, r: aUsdcr, s: aUsdcs } = getSignatureFromTypedData(
//           ownerPrivateKey,
//           aUsdcMsgParams
//         );

//         await uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//           [weth.address, usdc.address],
//           [dai.address, dai.address],
//           [amountWETHtoSwap, amountUSDCtoSwap],
//           [expectedDaiAmountForEth, expectedDaiAmountForUsdc],
//           [
//             {
//               amount: amountWETHtoSwap,
//               deadline,
//               v: aWETHv,
//               r: aWETHr,
//               s: aWETHs,
//             },
//             {
//               amount: amountUSDCtoSwap,
//               deadline,
//               v: aUsdcv,
//               r: aUsdcr,
//               s: aUsdcs,
//             },
//           ],
//           [false, false]
//         );

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const userAUsdcBalance = await aUsdc.balanceOf(userAddress);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmountForEth.add(expectedDaiAmountForUsdc));
//         expect(userAEthBalance).to.be.lt(userAEthBalanceBefore);
//         expect(userAEthBalance).to.be.gte(userAEthBalanceBefore.sub(amountWETHtoSwap));
//         expect(userAUsdcBalance).to.be.lt(userAUsdcBalanceBefore);
//         expect(userAUsdcBalance).to.be.gte(userAUsdcBalanceBefore.sub(amountUSDCtoSwap));
//       });

//       it('should correctly swap all the balance when using a bigger amount', async () => {
//         const { users, weth, oracle, dai, aDai, aWETH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // Remove other balance
//         await aWETH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);

//         // User will swap liquidity 10 aEth to aDai
//         await aWETH.connect(user).approve(uniswapLiquiditySwapAdapter.address, liquidityToSwap);

//         // Only has 10 atokens, so all the balance will be swapped
//         const bigAmountToSwap = parseEther('100');

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [bigAmountToSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: 0,
//                 deadline: 0,
//                 v: 0,
//                 r: '0x0000000000000000000000000000000000000000000000000000000000000000',
//                 s: '0x0000000000000000000000000000000000000000000000000000000000000000',
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, amountWETHtoSwap.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWETH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });

//       it('should correctly swap all the balance when using permit', async () => {
//         const { users, weth, oracle, dai, aDai, aWETH, uniswapLiquiditySwapAdapter } = testEnv;
//         const user = users[0].signer;
//         const userAddress = users[0].address;

//         const amountWETHtoSwap = await convertToCurrencyDecimals(weth.address, '10');

//         const daiPrice = await oracle.getAssetPrice(dai.address);
//         const expectedDaiAmount = await convertToCurrencyDecimals(
//           dai.address,
//           new BigNumber(amountWETHtoSwap.toString()).div(daiPrice.toString()).toFixed(0)
//         );

//         await mockUniswapRouter.setAmountToReturn(weth.address, expectedDaiAmount);

//         // Remove other balance
//         await aWETH.connect(user).transfer(users[1].address, parseEther('90'));
//         const userAEthBalanceBefore = await aWETH.balanceOf(userAddress);

//         // User will swap liquidity 10 aEth to aDai
//         const liquidityToSwap = parseEther('10');
//         expect(userAEthBalanceBefore).to.be.eq(liquidityToSwap);

//         // Only has 10 atokens, so all the balance will be swapped
//         const bigAmountToSwap = parseEther('100');

//         const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
//         const deadline = MAX_UINT_AMOUNT;

//         const ownerPrivateKey = require('../../test-wallets.js').accounts[1].secretKey;
//         if (!ownerPrivateKey) {
//           throw new Error('INVALID_OWNER_PK');
//         }
//         const aWethNonce = (await aWETH._nonces(userAddress)).toNumber();
//         const aWethMsgParams = buildPermitParams(
//           chainId,
//           aWETH.address,
//           '1',
//           await aWETH.name(),
//           userAddress,
//           uniswapLiquiditySwapAdapter.address,
//           aWethNonce,
//           deadline,
//           bigAmountToSwap.toString()
//         );
//         const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, aWethMsgParams);

//         await expect(
//           uniswapLiquiditySwapAdapter.connect(user).swapAndDeposit(
//             [weth.address],
//             [dai.address],
//             [bigAmountToSwap],
//             [expectedDaiAmount],
//             [
//               {
//                 amount: bigAmountToSwap,
//                 deadline,
//                 v,
//                 r,
//                 s,
//               },
//             ],
//             [false]
//           )
//         )
//           .to.emit(uniswapLiquiditySwapAdapter, 'Swapped')
//           .withArgs(weth.address, dai.address, amountWETHtoSwap.toString(), expectedDaiAmount);

//         const adapterWethBalance = await weth.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiBalance = await dai.balanceOf(uniswapLiquiditySwapAdapter.address);
//         const adapterDaiAllowance = await dai.allowance(
//           uniswapLiquiditySwapAdapter.address,
//           userAddress
//         );
//         const userADaiBalance = await aDai.balanceOf(userAddress);
//         const userAEthBalance = await aWETH.balanceOf(userAddress);
//         const adapterAEthBalance = await aWETH.balanceOf(uniswapLiquiditySwapAdapter.address);

//         expect(adapterWethBalance).to.be.eq(Zero);
//         expect(adapterDaiBalance).to.be.eq(Zero);
//         expect(adapterDaiAllowance).to.be.eq(Zero);
//         expect(userADaiBalance).to.be.eq(expectedDaiAmount);
//         expect(userAEthBalance).to.be.eq(Zero);
//         expect(adapterAEthBalance).to.be.eq(Zero);
//       });
//     });
//   });
// });
