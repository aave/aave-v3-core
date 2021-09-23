import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { DRE, impersonateAccountsHardhat } from '../helpers/misc-utils';
import { getVariableDebtToken } from '../helpers/contracts-getters';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { formatUnits, parseUnits } from '@ethersproject/units';

makeSuite('eMode tests', (testEnv: TestEnv) => {
  const { RC_INVALID_EMODE_CATEGORY } = ProtocolErrors;

  const STABLECOINS_CATEGORY = {
    id: BigNumber.from('1'),
    ltv: BigNumber.from('9800'),
    lt: BigNumber.from('9850'),
    lb: BigNumber.from('10100'),
    oracle: ZERO_ADDRESS,
    label: 'STABLECOINS',
  };

  it('Admin adds a category with id 1 for stablecoins', async () => {
    const { configurator, pool, poolAdmin } = testEnv;

    const { id, ltv, lt, lb, oracle, label } = STABLECOINS_CATEGORY;

    expect(
      await configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    )
      .to.emit(configurator, 'EModeCategoryAdded')
      .withArgs(id, ltv, lt, lb, oracle, label);

    const categoryData = await pool.getEModeCategoryData(id);
    expect(categoryData.ltv).to.be.equal(ltv, 'invalid eMode category ltv');
    expect(categoryData.liquidationThreshold).to.be.equal(
      lt,
      'invalid eMode category liq threshold'
    );
    expect(categoryData.liquidationBonus).to.be.equal(lb, 'invalid eMode category liq bonus');
    expect(categoryData.priceSource).to.be.equal(oracle, 'invalid eMode category price source');
  });

  it('Add stables to category', async () => {
    const { configurator, poolAdmin, dai, usdc } = testEnv;

    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, 1);
    await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, 1);
  });

  it('Someone funds the DAI pool', async () => {
    const {
      pool,
      users: [daiFunder],
      dai,
    } = testEnv;
    const supplyAmount = parseUnits('1', 36);

    await dai.connect(daiFunder.signer).mint(supplyAmount);
    await dai.connect(daiFunder.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(daiFunder.signer).supply(dai.address, supplyAmount, daiFunder.address, 0);
  });

  it('Supply 5 weth', async () => {
    const {
      pool,
      users: [, user],
      weth,
    } = testEnv;

    const supplyAmount = parseUnits('5', 18);

    await weth.connect(user.signer).mint(supplyAmount);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(user.signer).supply(weth.address, supplyAmount, user.address, 0);
  });

  it('Set eMode', async () => {
    const {
      pool,
      users: [, user],
    } = testEnv;

    await pool.connect(user.signer).setUserEMode(1);
    expect(await pool.getUserEMode(user.address)).to.be.eq(1);
  });

  it('Supply 5 additional weth', async () => {
    const {
      pool,
      users: [, user],
      weth,
    } = testEnv;

    const supplyAmount = parseUnits('5', 18);

    await weth.connect(user.signer).mint(supplyAmount);
    await weth.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    await pool.connect(user.signer).supply(weth.address, supplyAmount, user.address, 0);
  });

  it('Borrow dai', async () => {
    const {
      pool,
      users: [, user],
      dai,
      oracle,
    } = testEnv;

    const userGlobalData = await pool.getUserAccountData(user.address);
    const daiPrice = await oracle.getAssetPrice(dai.address);

    const amountDAIToBorrow = await convertToCurrencyDecimals(
      dai.address,
      userGlobalData.availableBorrowsBase.div(daiPrice).toString()
    );

    await pool
      .connect(user.signer)
      .borrow(dai.address, amountDAIToBorrow, RateMode.Variable, 0, user.address);
  });

  it('User data', async () => {
    const {
      pool,
      users: [, user],
      dai,
      oracle,
    } = testEnv;

    const userGlobalData = await pool.getUserAccountData(user.address);

    console.log(`Total collateral: ${formatUnits(userGlobalData.totalCollateralBase, 18)}`);
    console.log(`Total debt      : ${formatUnits(userGlobalData.totalDebtBase, 18)}`);
  });
});
