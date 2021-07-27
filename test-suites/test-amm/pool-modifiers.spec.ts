// import {iATokenBase, iAssetsWithoutETH, ITestEnvWithoutInstances, RateMode} from '../utils/types';
// import {
//   LendingPoolConfiguratorInstance,
//   LendingPoolInstance,
//   ATokenInstance,
//   LendingPoolCoreInstance,
//   MintableERC20Instance,
// } from '../utils/typechain-types/truffle-contracts';
// import {testEnvProviderWithoutInstances} from '../utils/truffle/dlp-tests-env';
// import {oneEther, ETHEREUM_ADDRESS} from '../utils/constants';
// import {convertToCurrencyDecimals} from '../utils/misc-utils';

// const expectRevert = require('@openzeppelin/test-helpers').expectRevert;

// contract('LendingPool: Modifiers', async ([deployer, ...users]) => {
//   let _testEnvProvider: ITestEnvWithoutInstances;
//   let _lendingPoolConfiguratorInstance: LendingPoolConfiguratorInstance;
//   let _lendingPoolInstance: LendingPoolInstance;
//   let _lendingPoolCoreInstance: LendingPoolCoreInstance;
//   let _aTokenInstances: iATokenBase<ATokenInstance>;
//   let _tokenInstances: iAssetsWithoutETH<MintableERC20Instance>;

//   before('Initializing LendingPool test variables', async () => {
//     console.time('setup-test');
//     _testEnvProvider = await testEnvProviderWithoutInstances(artifacts, [deployer, ...users]);

//     const {
//       getAllAssetsInstances,
//       getLendingPoolInstance,
//       getLendingPoolCoreInstance,
//       getLendingPoolConfiguratorInstance,
//       getATokenInstances,
//     } = _testEnvProvider;
//     const instances = await Promise.all([
//       getLendingPoolInstance(),
//       getLendingPoolCoreInstance(),
//       getLendingPoolConfiguratorInstance(),
//       getATokenInstances(),
//       getAllAssetsInstances(),
//     ]);

//     _lendingPoolInstance = instances[0];
//     _lendingPoolCoreInstance = instances[1];
//     _lendingPoolConfiguratorInstance = instances[2];

//     _aTokenInstances = instances[3];
//     _tokenInstances = instances[4];
//     console.timeEnd('setup-test');
//   });

//   it('Tries to deposit in an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.deposit(deployer, '1', '0'),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to invoke redeemUnderlying on an reserve, from a non-aToken address', async () => {
//     await expectRevert(
//       _lendingPoolInstance.redeemUnderlying(ETHEREUM_ADDRESS, deployer, '1', '0'),
//       'The caller of this function can only be the aToken contract of this reserve'
//     );
//   });

//   it('Tries to borrow from an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.borrow(deployer, '1', '0', RateMode.Stable),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to repay in an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.repay(deployer, '1', deployer),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to swapBorrowRateMode on an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.swapBorrowRateMode(deployer),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to rebalanceStableBorrowRate on an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.rebalanceStableBorrowRate(deployer, deployer),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to setUserUseReserveAsCollateral on an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.setUserUseReserveAsCollateral(deployer, true),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to invoke liquidationCall on an inactive reserve', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.liquidationCall(ETHEREUM_ADDRESS, deployer, deployer, '1', false),
//       'Action requires an active reserve'
//     );
//   });

//   it('Tries to invoke liquidationCall on an inactive collateral', async () => {
//     //using the deployer address as a fake reserve address
//     await expectRevert(
//       _lendingPoolInstance.liquidationCall(deployer, ETHEREUM_ADDRESS, deployer, '1', false),
//       'Action requires an active reserve'
//     );
//   });

//   it('Freezes the ETH reserve', async () => {
//     await _lendingPoolConfiguratorInstance.freezeReserve(ETHEREUM_ADDRESS);
//   });

//   it('tries to deposit in a freezed reserve', async () => {
//     await expectRevert(
//       _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, '1', '0'),
//       'Action requires an unfreezed reserve'
//     );
//   });

//   it('tries to borrow from a freezed reserve', async () => {
//     await expectRevert(
//       _lendingPoolInstance.borrow(ETHEREUM_ADDRESS, '1', '0', '0'),
//       'Action requires an unfreezed reserve'
//     );
//   });

//   it('tries to swap interest rate mode in a freezed reserve', async () => {
//     await expectRevert(
//       _lendingPoolInstance.swapBorrowRateMode(ETHEREUM_ADDRESS),
//       'Action requires an unfreezed reserve'
//     );
//   });

//   it('tries to disable as collateral a freezed reserve', async () => {
//     await expectRevert(
//       _lendingPoolInstance.setUserUseReserveAsCollateral(ETHEREUM_ADDRESS, false),
//       'Action requires an unfreezed reserve'
//     );
//   });

//   it('unfreezes the reserve, user deposits 1 ETH, freezes the reserve, check that the user can redeem', async () => {
//     const {aWETH} = _aTokenInstances;

//     //unfreezes the reserve
//     await _lendingPoolConfiguratorInstance.unfreezeReserve(ETHEREUM_ADDRESS);

//     //deposit 1 ETH
//     await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, oneEther, '0', {
//       value: oneEther.toString(),
//     });

//     //freezes the reserve
//     await _lendingPoolConfiguratorInstance.freezeReserve(ETHEREUM_ADDRESS);

//     const balance = await aWETH.balanceOf(deployer);

//     await aWETH.redeem(balance);
//   });

//   it('unfreezes the reserve, user 0 deposits 100 DAI, user 1 deposits 1 ETH and borrows 50 DAI, freezes the reserve, checks that the user 1 can repay', async () => {
//     const {aWETH, aDAI} = _aTokenInstances;
//     const {DAI} = _tokenInstances;

//     //unfreezes the reserve
//     await _lendingPoolConfiguratorInstance.unfreezeReserve(ETHEREUM_ADDRESS);

//     const amountDAI = await convertToCurrencyDecimals(DAI.address, '100');

//     //user 0 deposits 100 DAI
//     await DAI.mint(amountDAI, {from: users[0]});

//     await DAI.approve(_lendingPoolCoreInstance.address, amountDAI, {from: users[0]});

//     await _lendingPoolInstance.deposit(DAI.address, amountDAI, '0', {from: users[0]});

//     //user 1 deposits 1 ETH
//     await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, oneEther, '0', {
//       from: users[1],
//       value: oneEther.toString(),
//     });

//     const amountDAIToBorrow = await convertToCurrencyDecimals(DAI.address, '10');

//     //user 1 borrows 10 DAI
//     await _lendingPoolInstance.borrow(DAI.address, amountDAIToBorrow, RateMode.Stable, '0', {
//       from: users[1],
//     });

//     //freezes the reserve
//     await _lendingPoolConfiguratorInstance.freezeReserve(ETHEREUM_ADDRESS);

//     //user 1 repays 1 DAI
//     await DAI.approve(_lendingPoolCoreInstance.address, amountDAIToBorrow, {from: users[1]});

//     await _lendingPoolInstance.repay(DAI.address, oneEther, users[1], {from: users[1]});
//   });

//   it('Check that liquidationCall can be executed on a freezed reserve', async () => {
//     const {aWETH, aDAI} = _aTokenInstances;
//     const {DAI} = _tokenInstances;

//     //user 2 tries to liquidate

//     await expectRevert(
//       _lendingPoolInstance.liquidationCall(
//         ETHEREUM_ADDRESS,
//         DAI.address,
//         users[1],
//         oneEther,
//         true,
//         {from: users[2]}
//       ),
//       'Health factor is not below the threshold'
//     );
//   });

//   it('Check that rebalanceStableBorrowRate can be executed on a freezed reserve', async () => {
//     const {aWETH, aDAI} = _aTokenInstances;
//     const {DAI} = _tokenInstances;

//     //user 2 tries to liquidate

//     await expectRevert(
//       _lendingPoolInstance.rebalanceStableBorrowRate(DAI.address, users[1]),
//       'Interest rate rebalance conditions were not met'
//     );
//   });
// });
