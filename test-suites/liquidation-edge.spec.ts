import { expect } from 'chai';
import { utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { RateMode } from '../helpers/types';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';

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
    await dai
      .connect(depositor.signer)
      .mint(await convertToCurrencyDecimals(dai.address, '1000000'));
    await dai.connect(depositor.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(depositor.signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '10000'),
        depositor.address,
        0
      );

    // Deposit eth, borrow dai
    await weth.connect(borrower.signer).mint(utils.parseEther('1'));
    await weth.connect(borrower.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(borrower.signer)
      .deposit(weth.address, utils.parseEther('1'), borrower.address, 0);

    await oracle.setAssetPrice(dai.address, utils.parseUnits('0.001', 18));

    // Borrow 500 dai stable
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '500'),
        RateMode.Stable,
        0,
        borrower.address
      );

    // Borrow 200 dai variable
    await pool
      .connect(borrower.signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '200'),
        RateMode.Variable,
        0,
        borrower.address
      );

    await oracle.setAssetPrice(dai.address, utils.parseUnits('0.002', 18));

    expect(
      await pool
        .connect(depositor.signer)
        .liquidationCall(weth.address, dai.address, borrower.address, MAX_UINT_AMOUNT, false)
    );
  });
});
