import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { DRE, impersonateAccountsHardhat } from '../helpers/misc-utils';
import { getVariableDebtToken } from '../helpers/contracts-getters';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';

makeSuite('eMode tests', (testEnv: TestEnv) => {
  const { RC_INVALID_EMODE_CATEGORY } = ProtocolErrors;

  const STABLECOINS_CATEGORY = {
    id: BigNumber.from('1'),
    ltv: BigNumber.from('9800'),
    lt: BigNumber.from('9800'),
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
});
