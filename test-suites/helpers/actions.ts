import {
  calcExpectedReserveDataAfterBorrow,
  calcExpectedReserveDataAfterDeposit,
  calcExpectedReserveDataAfterRepay,
  calcExpectedReserveDataAfterStableRateRebalance,
  calcExpectedReserveDataAfterSwapRateMode,
  calcExpectedReserveDataAfterWithdraw,
  calcExpectedUserDataAfterBorrow,
  calcExpectedUserDataAfterDeposit,
  calcExpectedUserDataAfterRepay,
  calcExpectedUserDataAfterSetUseAsCollateral,
  calcExpectedUserDataAfterStableRateRebalance,
  calcExpectedUserDataAfterSwapRateMode,
  calcExpectedUserDataAfterWithdraw,
} from './utils/calculations';
import { getReserveData, getUserData } from './utils/helpers';
import { buildPermitParams, getSignatureFromTypedData } from '../../helpers/contracts-helpers';

import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import {
  getAToken,
  getMintableERC20,
  getStableDebtToken,
  getVariableDebtToken,
  getTestnetReserveAddressFromSymbol,
} from '@aave/deploy-v3/dist/helpers/contract-getters';
import { MAX_UINT_AMOUNT, ONE_YEAR } from '../../helpers/constants';
import { SignerWithAddress, TestEnv } from './make-suite';
import chai from 'chai';
import { ReserveData, UserReserveData } from './utils/interfaces';
import { BigNumber, ContractReceipt, Wallet } from 'ethers';
import { AToken } from '../../types/AToken';
import { RateMode, tEthereumAddress } from '../../helpers/types';
import { MintableERC20__factory } from '../../types';
import { waitForTx, advanceTimeAndBlock } from '@aave/deploy-v3';
import { getChainId } from 'hardhat';
import { timeLatest } from '../../helpers/misc-utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

declare var hre: HardhatRuntimeEnvironment;

const { expect } = chai;

const almostEqualOrEqual = function (
  this: any,
  expected: ReserveData | UserReserveData,
  actual: ReserveData | UserReserveData
) {
  const keys = Object.keys(actual);

  keys.forEach((key) => {
    if (
      key === 'lastUpdateTimestamp' ||
      key === 'marketStableRate' ||
      key === 'symbol' ||
      key === 'aTokenAddress' ||
      key === 'decimals' ||
      key === 'totalStableDebtLastUpdated'
    ) {
      // skipping consistency check on accessory data
      return;
    }

    this.assert(actual[key] != undefined, `Property ${key} is undefined in the actual data`);
    expect(expected[key] != undefined, `Property ${key} is undefined in the expected data`);

    if (expected[key] == null || actual[key] == null) {
      console.log('Found a undefined value for Key ', key, ' value ', expected[key], actual[key]);
    }

    if (actual[key] instanceof BigNumber) {
      const actualValue = <BigNumber>actual[key];
      const expectedValue = <BigNumber>expected[key];

      this.assert(
        actualValue.eq(expectedValue) ||
          actualValue.add(1).eq(expectedValue) ||
          actualValue.eq(expectedValue.add(1)) ||
          actualValue.add(2).eq(expectedValue) ||
          actualValue.eq(expectedValue.add(2)) ||
          actualValue.add(3).eq(expectedValue) ||
          actualValue.eq(expectedValue.add(3)),
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        expectedValue.toString(),
        actualValue.toString()
      );
    } else {
      this.assert(
        actual[key] !== null &&
          expected[key] !== null &&
          actual[key].toString() === expected[key].toString(),
        `expected #{act} to be equal #{exp} for property ${key}`,
        `expected #{act} to be equal #{exp} for property ${key}`,
        expected[key],
        actual[key]
      );
    }
  });
};

chai.use(function (chai: any, utils: any) {
  chai.Assertion.overwriteMethod('almostEqualOrEqual', function (original: any) {
    return function (this: any, expected: ReserveData | UserReserveData) {
      const actual = (expected as ReserveData)
        ? <ReserveData>this._obj
        : <UserReserveData>this._obj;

      almostEqualOrEqual.apply(this, [expected, actual]);
    };
  });
});

interface ActionsConfig {
  skipIntegrityCheck: boolean;
}

export const configuration: ActionsConfig = <ActionsConfig>{};

export const mint = async (reserveSymbol: string, amount: string, user: SignerWithAddress) => {
  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const token = await getMintableERC20(reserve);

  await waitForTx(
    await token
      .connect(user.signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(reserve, amount))
  );
};

export const approve = async (reserveSymbol: string, user: SignerWithAddress, testEnv: TestEnv) => {
  const { pool } = testEnv;
  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const token = await getMintableERC20(reserve);

  await waitForTx(
    await token.connect(user.signer).approve(pool.address, '100000000000000000000000000000')
  );
};

export const deposit = async (
  reserveSymbol: string,
  amount: string,
  sender: SignerWithAddress,
  onBehalfOf: tEthereumAddress,
  sendValue: string,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const amountToDeposit = await convertToCurrencyDecimals(reserve, amount);

  const txOptions: any = {};

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    onBehalfOf,
    testEnv,
    sender.address
  );

  if (sendValue) {
    txOptions.value = await convertToCurrencyDecimals(reserve, sendValue);
  }

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool
        .connect(sender.signer)
        .deposit(reserve, amountToDeposit, onBehalfOf, '0', txOptions)
    );

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, onBehalfOf, testEnv, sender.address);

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const expectedReserveData = calcExpectedReserveDataAfterDeposit(
      amountToDeposit.toString(),
      reserveDataBefore,
      txTimestamp
    );

    const expectedUserReserveData = calcExpectedUserDataAfterDeposit(
      amountToDeposit.toString(),
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp,
      txCost
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserReserveData);

    // truffleAssert.eventEmitted(txResult, "Deposit", (ev: any) => {
    //   const {_reserve, _user, _amount} = ev;
    //   return (
    //     _reserve === reserve &&
    //     _user === user &&
    //     new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(
      pool.connect(sender.signer).deposit(reserve, amountToDeposit, onBehalfOf, '0', txOptions),
      revertMessage
    ).to.be.reverted;
  }
};

export const withdraw = async (
  reserveSymbol: string,
  amount: string,
  user: SignerWithAddress,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const {
    aTokenInstance,
    reserve,
    userData: userDataBefore,
    reserveData: reserveDataBefore,
  } = await getDataBeforeAction(reserveSymbol, user.address, testEnv);

  let amountToWithdraw = '0';

  if (amount !== '-1') {
    amountToWithdraw = (await convertToCurrencyDecimals(reserve, amount)).toString();
  } else {
    amountToWithdraw = MAX_UINT_AMOUNT;
  }

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool.connect(user.signer).withdraw(reserve, amountToWithdraw, user.address)
    );

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, user.address, testEnv);

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const expectedReserveData = calcExpectedReserveDataAfterWithdraw(
      amountToWithdraw,
      reserveDataBefore,
      userDataBefore,
      txTimestamp
    );

    const expectedUserData = calcExpectedUserDataAfterWithdraw(
      amountToWithdraw,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp,
      txCost
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    // truffleAssert.eventEmitted(txResult, "Redeem", (ev: any) => {
    //   const {_from, _value} = ev;
    //   return (
    //     _from === user && new BigNumber(_value).isEqualTo(actualAmountRedeemed)
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(
      pool.connect(user.signer).withdraw(reserve, amountToWithdraw, user.address),
      revertMessage
    ).to.be.reverted;
  }
};

export const delegateBorrowAllowance = async (
  reserve: string,
  amount: string,
  interestRateMode: string,
  user: SignerWithAddress,
  receiver: tEthereumAddress,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const reserveAddress: tEthereumAddress = await getTestnetReserveAddressFromSymbol(reserve);

  const amountToDelegate: string = await (
    await convertToCurrencyDecimals(reserveAddress, amount)
  ).toString();

  const reserveData = await pool.getReserveData(reserveAddress);

  const debtToken =
    interestRateMode === '1'
      ? await getStableDebtToken(reserveData.stableDebtTokenAddress)
      : await getVariableDebtToken(reserveData.variableDebtTokenAddress);

  const delegateAllowancePromise = debtToken
    .connect(user.signer)
    .approveDelegation(receiver, amountToDelegate);

  if (expectedResult === 'revert' && revertMessage) {
    await expect(delegateAllowancePromise, revertMessage).to.be.revertedWith(revertMessage);
    return;
  } else {
    await waitForTx(await delegateAllowancePromise);
    const allowance = await debtToken.borrowAllowance(user.address, receiver);
    expect(allowance.toString()).to.be.equal(
      amountToDelegate,
      'borrowAllowance is set incorrectly'
    );
  }
};

export const borrow = async (
  reserveSymbol: string,
  amount: string,
  interestRateMode: string,
  user: SignerWithAddress,
  onBehalfOf: tEthereumAddress,
  timeTravel: string,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool, helpersContract } = testEnv;

  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    onBehalfOf,
    testEnv,
    user.address
  );

  const reserveTokens = await helpersContract.getReserveTokensAddresses(reserve);
  const debtToken =
    interestRateMode === '1'
      ? await getStableDebtToken(reserveTokens.stableDebtTokenAddress)
      : await getVariableDebtToken(reserveTokens.variableDebtTokenAddress);

  const borrowAllowanceBefore = await debtToken.borrowAllowance(onBehalfOf, user.address);

  const amountToBorrow = await convertToCurrencyDecimals(reserve, amount);

  const tx = pool
    .connect(user.signer)
    .borrow(reserve, amountToBorrow, interestRateMode, '0', onBehalfOf);

  if (expectedResult === 'success') {
    const txResult = await waitForTx(await tx);

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    if (timeTravel) {
      const secondsToTravel = BigNumber.from(timeTravel).mul(ONE_YEAR).div(365).toNumber();

      await advanceTimeAndBlock(secondsToTravel);
    }

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, onBehalfOf, testEnv, user.address);

    const expectedReserveData = calcExpectedReserveDataAfterBorrow(
      amountToBorrow.toString(),
      interestRateMode,
      reserveDataBefore,
      userDataBefore,
      txTimestamp,
      timestamp
    );

    const expectedUserData = calcExpectedUserDataAfterBorrow(
      amountToBorrow.toString(),
      interestRateMode,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    if (user.address !== onBehalfOf) {
      const borrowAllowanceAfter = await debtToken.borrowAllowance(onBehalfOf, user.address);
      expect(borrowAllowanceAfter).to.be.equal(
        borrowAllowanceBefore.sub(amountToBorrow),
        'borrowAllowance is updated incorrectly'
      );
    }

    // truffleAssert.eventEmitted(txResult, "Borrow", (ev: any) => {
    //   const {
    //     _reserve,
    //     _user,
    //     _amount,
    //     _borrowRateMode,
    //     _borrowRate,
    //     _originationFee,
    //   } = ev;
    //   return (
    //     _reserve.toLowerCase() === reserve.toLowerCase() &&
    //     _user.toLowerCase() === user.toLowerCase() &&
    //     new BigNumber(_amount).eq(amountToBorrow) &&
    //     new BigNumber(_borrowRateMode).eq(expectedUserData.borrowRateMode) &&
    //     new BigNumber(_borrowRate).eq(expectedUserData.borrowRate) &&
    //     new BigNumber(_originationFee).eq(
    //       expectedUserData.originationFee.minus(userDataBefore.originationFee)
    //     )
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(tx, revertMessage).to.be.reverted;
  }
};

export const repay = async (
  reserveSymbol: string,
  amount: string,
  rateMode: string,
  user: SignerWithAddress,
  onBehalfOf: SignerWithAddress,
  sendValue: string,
  expectedResult: string,
  testEnv: TestEnv,
  timeTravel: string,
  revertMessage?: string
) => {
  const { pool } = testEnv;
  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    onBehalfOf.address,
    testEnv
  );

  let amountToRepay = '0';

  if (amount !== '-1') {
    amountToRepay = (await convertToCurrencyDecimals(reserve, amount)).toString();
  } else {
    amountToRepay = MAX_UINT_AMOUNT;
  }
  amountToRepay = BigNumber.from(amountToRepay).toHexString();

  const txOptions: any = {};

  if (sendValue) {
    const valueToSend = await convertToCurrencyDecimals(reserve, sendValue);
    txOptions.value = valueToSend.toHexString(); // '0x' + BigNumber.from(valueToSend.toString()).toString(16);
  }

  if (timeTravel) {
    const secondsToTravel = BigNumber.from(timeTravel).mul(ONE_YEAR).div(365).toNumber();
    await advanceTimeAndBlock(secondsToTravel);
  }

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool
        .connect(user.signer)
        .repay(reserve, amountToRepay, rateMode, onBehalfOf.address, txOptions)
    );

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, onBehalfOf.address, testEnv);

    const expectedReserveData = calcExpectedReserveDataAfterRepay(
      amountToRepay,
      <RateMode>rateMode,
      reserveDataBefore,
      userDataBefore,
      txTimestamp,
      timestamp
    );

    const expectedUserData = calcExpectedUserDataAfterRepay(
      amountToRepay,
      <RateMode>rateMode,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      user.address,
      onBehalfOf.address,
      txTimestamp,
      timestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    // truffleAssert.eventEmitted(txResult, "Repay", (ev: any) => {
    //   const {_reserve, _user, _repayer} = ev;

    //   return (
    //     _reserve.toLowerCase() === reserve.toLowerCase() &&
    //     _user.toLowerCase() === onBehalfOf.toLowerCase() &&
    //     _repayer.toLowerCase() === user.toLowerCase()
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(
      pool
        .connect(user.signer)
        .repay(reserve, amountToRepay, rateMode, onBehalfOf.address, txOptions),
      revertMessage
    ).to.be.reverted;
  }
};

export const supplyWithPermit = async (
  reserveSymbol: string,
  amount: string,
  sender: SignerWithAddress,
  senderPk: string,
  onBehalfOf: tEthereumAddress,
  useAsCollateral: boolean,
  sendValue: string,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);
  const amountToDeposit = await convertToCurrencyDecimals(reserve, amount);

  const chainId = Number(await getChainId());
  const token = new MintableERC20__factory(sender.signer).attach(reserve);
  const highDeadline = '100000000000000000000000000';
  const nonce = await token.nonces(sender.address);

  const msgParams = buildPermitParams(
    chainId,
    reserve,
    '1',
    reserveSymbol,
    sender.address,
    pool.address,
    nonce.toNumber(),
    highDeadline,
    amountToDeposit.toString()
  );
  const { v, r, s } = getSignatureFromTypedData(senderPk, msgParams);

  const txOptions: any = {};

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    onBehalfOf,
    testEnv,
    sender.address
  );

  if (sendValue) {
    txOptions.value = await convertToCurrencyDecimals(reserve, sendValue);
  }

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool
        .connect(sender.signer)
        .supplyWithPermit(
          reserve,
          amountToDeposit,
          onBehalfOf,
          '0',
          highDeadline,
          v,
          r,
          s,
          txOptions
        )
    );

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, onBehalfOf, testEnv, sender.address);

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const expectedReserveData = calcExpectedReserveDataAfterDeposit(
      amountToDeposit.toString(),
      reserveDataBefore,
      txTimestamp
    );

    const expectedUserReserveData = calcExpectedUserDataAfterDeposit(
      amountToDeposit.toString(),
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp,
      txCost
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserReserveData);

    // truffleAssert.eventEmitted(txResult, "Deposit", (ev: any) => {
    //   const {_reserve, _user, _amount} = ev;
    //   return (
    //     _reserve === reserve &&
    //     _user === user &&
    //     new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(
      pool
        .connect(sender.signer)
        .supplyWithPermit(
          reserve,
          amountToDeposit,
          onBehalfOf,
          '0',
          highDeadline,
          v,
          r,
          s,
          txOptions
        ),
      revertMessage
    ).to.be.reverted;
  }
};

export const repayWithPermit = async (
  reserveSymbol: string,
  amount: string,
  rateMode: string,
  user: SignerWithAddress,
  userPk: string,
  onBehalfOf: SignerWithAddress,
  sendValue: string,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;
  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);
  const highDeadline = '100000000000000000000000000';

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    onBehalfOf.address,
    testEnv
  );

  let amountToRepay = '0';

  if (amount !== '-1') {
    amountToRepay = (await convertToCurrencyDecimals(reserve, amount)).toString();
  } else {
    amountToRepay = MAX_UINT_AMOUNT;
  }
  amountToRepay = BigNumber.from(amountToRepay).toHexString();

  const chainId = Number(await getChainId());
  const token = new MintableERC20__factory(user.signer).attach(reserve);
  const nonce = await token.nonces(user.address);

  const msgParams = buildPermitParams(
    chainId,
    reserve,
    '1',
    reserveSymbol,
    user.address,
    pool.address,
    nonce.toNumber(),
    highDeadline,
    amountToRepay
  );
  const { v, r, s } = getSignatureFromTypedData(userPk, msgParams);
  const txOptions: any = {};

  if (sendValue) {
    const valueToSend = await convertToCurrencyDecimals(reserve, sendValue);
    txOptions.value = valueToSend.toHexString();
  }

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool
        .connect(user.signer)
        .repayWithPermit(
          reserve,
          amountToRepay,
          rateMode,
          onBehalfOf.address,
          highDeadline,
          v,
          r,
          s,
          txOptions
        )
    );

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, onBehalfOf.address, testEnv);

    const expectedReserveData = calcExpectedReserveDataAfterRepay(
      amountToRepay,
      <RateMode>rateMode,
      reserveDataBefore,
      userDataBefore,
      txTimestamp,
      timestamp
    );

    const expectedUserData = calcExpectedUserDataAfterRepay(
      amountToRepay,
      <RateMode>rateMode,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      user.address,
      onBehalfOf.address,
      txTimestamp,
      timestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    // truffleAssert.eventEmitted(txResult, "Repay", (ev: any) => {
    //   const {_reserve, _user, _repayer} = ev;

    //   return (
    //     _reserve.toLowerCase() === reserve.toLowerCase() &&
    //     _user.toLowerCase() === onBehalfOf.toLowerCase() &&
    //     _repayer.toLowerCase() === user.toLowerCase()
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(
      pool
        .connect(user.signer)
        .repayWithPermit(
          reserve,
          amountToRepay,
          rateMode,
          onBehalfOf.address,
          highDeadline,
          v,
          r,
          s,
          txOptions
        ),
      revertMessage
    ).to.be.reverted;
  }
};

export const setUseAsCollateral = async (
  reserveSymbol: string,
  user: SignerWithAddress,
  useAsCollateral: string,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    user.address,
    testEnv
  );

  const useAsCollateralBool = useAsCollateral.toLowerCase() === 'true';

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool.connect(user.signer).setUserUseReserveAsCollateral(reserve, useAsCollateralBool)
    );

    const { txCost } = await getTxCostAndTimestamp(txResult);

    const { userData: userDataAfter } = await getContractsData(reserve, user.address, testEnv);

    const expectedUserData = calcExpectedUserDataAfterSetUseAsCollateral(
      useAsCollateral.toLocaleLowerCase() === 'true',
      reserveDataBefore,
      userDataBefore,
      txCost
    );

    expectEqual(userDataAfter, expectedUserData);
    // if (useAsCollateralBool) {
    //   truffleAssert.eventEmitted(txResult, 'ReserveUsedAsCollateralEnabled', (ev: any) => {
    //     const {_reserve, _user} = ev;
    //     return _reserve === reserve && _user === user;
    //   });
    // } else {
    //   truffleAssert.eventEmitted(txResult, 'ReserveUsedAsCollateralDisabled', (ev: any) => {
    //     const {_reserve, _user} = ev;
    //     return _reserve === reserve && _user === user;
    //   });
    // }
  } else if (expectedResult === 'revert') {
    await expect(
      pool.connect(user.signer).setUserUseReserveAsCollateral(reserve, useAsCollateralBool),
      revertMessage
    ).to.be.reverted;
  }
};

export const swapBorrowRateMode = async (
  reserveSymbol: string,
  user: SignerWithAddress,
  rateMode: string,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    user.address,
    testEnv
  );

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool.connect(user.signer).swapBorrowRateMode(reserve, rateMode)
    );

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const { reserveData: reserveDataAfter, userData: userDataAfter } = await getContractsData(
      reserve,
      user.address,
      testEnv
    );

    const expectedReserveData = calcExpectedReserveDataAfterSwapRateMode(
      reserveDataBefore,
      userDataBefore,
      rateMode,
      txTimestamp
    );

    const expectedUserData = calcExpectedUserDataAfterSwapRateMode(
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      rateMode,
      txCost,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    // truffleAssert.eventEmitted(txResult, "Swap", (ev: any) => {
    //   const {_user, _reserve, _newRateMode, _newRate} = ev;
    //   return (
    //     _user === user &&
    //     _reserve == reserve &&
    //     new BigNumber(_newRateMode).eq(expectedUserData.borrowRateMode) &&
    //     new BigNumber(_newRate).eq(expectedUserData.borrowRate)
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(pool.connect(user.signer).swapBorrowRateMode(reserve, rateMode), revertMessage).to
      .be.reverted;
  }
};

export const rebalanceStableBorrowRate = async (
  reserveSymbol: string,
  user: SignerWithAddress,
  target: SignerWithAddress,
  expectedResult: string,
  testEnv: TestEnv,
  revertMessage?: string
) => {
  const { pool } = testEnv;

  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const { reserveData: reserveDataBefore, userData: userDataBefore } = await getContractsData(
    reserve,
    target.address,
    testEnv
  );

  if (expectedResult === 'success') {
    const txResult = await waitForTx(
      await pool.connect(user.signer).rebalanceStableBorrowRate(reserve, target.address)
    );

    const { txCost, txTimestamp } = await getTxCostAndTimestamp(txResult);

    const { reserveData: reserveDataAfter, userData: userDataAfter } = await getContractsData(
      reserve,
      target.address,
      testEnv
    );

    const expectedReserveData = calcExpectedReserveDataAfterStableRateRebalance(
      reserveDataBefore,
      userDataBefore,
      txTimestamp
    );

    const expectedUserData = calcExpectedUserDataAfterStableRateRebalance(
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txCost,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    // truffleAssert.eventEmitted(txResult, 'RebalanceStableBorrowRate', (ev: any) => {
    //   const {_user, _reserve, _newStableRate} = ev;
    //   return (
    //     _user.toLowerCase() === target.toLowerCase() &&
    //     _reserve.toLowerCase() === reserve.toLowerCase() &&
    //     new BigNumber(_newStableRate).eq(expectedUserData.borrowRate)
    //   );
    // });
  } else if (expectedResult === 'revert') {
    await expect(
      pool.connect(user.signer).rebalanceStableBorrowRate(reserve, target.address),
      revertMessage
    ).to.be.reverted;
  }
};

const expectEqual = (
  actual: UserReserveData | ReserveData,
  expected: UserReserveData | ReserveData
) => {
  if (!configuration.skipIntegrityCheck) {
    // @ts-ignore
    expect(actual).to.be.almostEqualOrEqual(expected);
  }
};

interface ActionData {
  reserve: string;
  reserveData: ReserveData;
  userData: UserReserveData;
  aTokenInstance: AToken;
}

const getDataBeforeAction = async (
  reserveSymbol: string,
  user: tEthereumAddress,
  testEnv: TestEnv
): Promise<ActionData> => {
  const reserve = await getTestnetReserveAddressFromSymbol(reserveSymbol);

  const { reserveData, userData } = await getContractsData(reserve, user, testEnv);
  const aTokenInstance = await getAToken(reserveData.aTokenAddress);
  return {
    reserve,
    reserveData,
    userData,
    aTokenInstance,
  };
};

export const getTxCostAndTimestamp = async (tx: ContractReceipt) => {
  if (!tx.blockNumber || !tx.transactionHash || !tx.cumulativeGasUsed) {
    throw new Error('No tx blocknumber');
  }
  const txTimestamp = BigNumber.from(
    (await hre.ethers.provider.getBlock(tx.blockNumber)).timestamp
  );

  const txInfo = await hre.ethers.provider.getTransaction(tx.transactionHash);
  const gasPrice = txInfo.gasPrice ? txInfo.gasPrice : tx.effectiveGasPrice;
  const txCost = BigNumber.from(tx.cumulativeGasUsed).mul(gasPrice);

  return { txCost, txTimestamp };
};

export const getContractsData = async (
  reserve: string,
  user: string,
  testEnv: TestEnv,
  sender?: string
) => {
  const { pool, helpersContract } = testEnv;

  const [userData, reserveData, timestamp] = await Promise.all([
    getUserData(pool, helpersContract, reserve, user, sender || user),
    getReserveData(helpersContract, reserve),
    timeLatest(),
  ]);

  return {
    reserveData,
    userData,
    timestamp,
  };
};
