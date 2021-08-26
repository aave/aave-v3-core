import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { RateMode, ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { utils } from 'ethers';

makeSuite('Validation-logic: reverting edge cases', (testEnv: TestEnv) => {
  const {
    VL_NO_ACTIVE_RESERVE,
    VL_RESERVE_FROZEN,
    VL_INVALID_AMOUNT,
    VL_BORROWING_NOT_ENABLED,
    VL_STABLE_BORROWING_NOT_ENABLED,
    VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY,
    VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE,
    VL_NO_DEBT_OF_SELECTED_TYPE,
    VL_SAME_BLOCK_BORROW_REPAY,
    VL_HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
    VL_INVALID_INTEREST_RATE_MODE_SELECTED,
    VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0,
    VL_INCONSISTENT_FLASHLOAN_PARAMS,
    VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD,
  } = ProtocolErrors;

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('executeLiquidationCall() 0 < vars.userVariableDebt < vars.actualDebtToLiquidate', async () => {
    const { pool, users, dai, weth, oracle } = testEnv;

    const depositor = users[0];
    const borrower = users[1];

    // Deposit 1000 dai
    await dai.connect(depositor.signer).mint(utils.parseUnits('1000000', 18));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(dai.address, utils.parseUnits('10000', 18), depositor.address, 0);

    // Deposit eth, borrow dai
    await weth.connect(borrower.signer).mint(utils.parseUnits('1', 18));
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(weth.address, utils.parseUnits('1', 18), borrower.address, 0);

    await oracle.setAssetPrice(dai.address, utils.parseUnits('0.001', 18));

    // Borrow 500 dai stable
    await pool
      .connect(borrower.signer)
      .borrow(dai.address, utils.parseUnits('500', 18), RateMode.Stable, 0, borrower.address);

    // Borrow 200 dai variable
    await pool
      .connect(borrower.signer)
      .borrow(dai.address, utils.parseUnits('200', 18), RateMode.Variable, 0, borrower.address);

    await oracle.setAssetPrice(dai.address, utils.parseUnits('0.002', 18));

    await pool
      .connect(depositor.signer)
      .liquidationCall(weth.address, dai.address, borrower.address, MAX_UINT_AMOUNT, false);
  });
});
