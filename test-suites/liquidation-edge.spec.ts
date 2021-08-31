import { utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { RateMode } from '../helpers/types';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('Pool Liquidation: Edge cases', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('ValidationLogic `executeLiquidationCall` where user has variable and stable debt, but variable debt is insufficient to cover the full liquidation amount', async () => {
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
