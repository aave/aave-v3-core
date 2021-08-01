import { makeSuite, TestEnv } from './helpers/make-suite';
import { ProtocolErrors, RateMode } from '../../helpers/types';
import { APPROVAL_AMOUNT_POOL, MAX_UINT_AMOUNT, oneEther } from '../../helpers/constants';
import { convertToCurrencyDecimals } from '../../helpers/contracts-helpers';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { BigNumber } from 'bignumber.js';
import { MockFlashLoanReceiver } from '../../types/MockFlashLoanReceiver';
import { getMockFlashLoanReceiver } from '../../helpers/contracts-getters';
import { domainToUnicode } from 'url';

const { expect } = require('chai');

makeSuite('Drop Reserve', (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;

  const { RL_ATOKEN_SUPPLY_NOT_ZERO, RL_STABLE_DEBT_NOT_ZERO, RL_VARIABLE_DEBT_SUPPLY_NOT_ZERO } =
    ProtocolErrors;

  before(async () => {
    _mockFlashLoanReceiver = await getMockFlashLoanReceiver();
  });

  it('User 1 deposits Dai, User 2 borrow Dai stable and variable, should fail to drop Dai reserve', async () => {
    const {
      deployer,
      users: [user1],
      pool,
      dai,
      aDai,
      weth,
      configurator,
    } = testEnv;

    const depositedAmount = parseEther('1000');
    const borrowedAmount = parseEther('100');
    // setting reserve factor to 0 to ease tests, no aToken accrued in reserve
    await configurator.setReserveFactor(dai.address, 0);

    await dai.mint(depositedAmount);
    await dai.approve(pool.address, depositedAmount);
    await dai.connect(user1.signer).mint(depositedAmount);
    await dai.connect(user1.signer).approve(pool.address, depositedAmount);

    await weth.connect(user1.signer).mint(depositedAmount);
    await weth.connect(user1.signer).approve(pool.address, depositedAmount);

    await pool.deposit(dai.address, depositedAmount, deployer.address, 0);

    await expect(configurator.dropReserve(dai.address)).to.be.revertedWith(
      RL_ATOKEN_SUPPLY_NOT_ZERO
    );

    await pool.connect(user1.signer).deposit(weth.address, depositedAmount, user1.address, 0);

    await pool.connect(user1.signer).borrow(dai.address, borrowedAmount, 2, 0, user1.address);
    await expect(configurator.dropReserve(dai.address)).to.be.revertedWith(
      RL_VARIABLE_DEBT_SUPPLY_NOT_ZERO
    );
    await pool.connect(user1.signer).borrow(dai.address, borrowedAmount, 1, 0, user1.address);
    await expect(configurator.dropReserve(dai.address)).to.be.revertedWith(RL_STABLE_DEBT_NOT_ZERO);
  });
  it('User 2 repays debts, drop Dai reserve should fail', async () => {
    const {
      deployer,
      users: [user1],
      pool,
      dai,
      weth,
      configurator,
    } = testEnv;
    await pool.connect(user1.signer).repay(dai.address, MAX_UINT_AMOUNT, 1, user1.address);
    await expect(configurator.dropReserve(dai.address)).to.be.revertedWith(
      RL_VARIABLE_DEBT_SUPPLY_NOT_ZERO
    );

    await pool.connect(user1.signer).repay(dai.address, MAX_UINT_AMOUNT, 2, user1.address);
    await expect(configurator.dropReserve(dai.address)).to.be.revertedWith(
      RL_ATOKEN_SUPPLY_NOT_ZERO
    );
  });
  it('User 1 withdraw Dai, drop Dai reserve should succeed', async () => {
    const {
      deployer,
      users: [user1],
      pool,
      dai,
      aDai,
      weth,
      configurator,
      helpersContract,
    } = testEnv;

    await pool.withdraw(dai.address, MAX_UINT_AMOUNT, deployer.address);
    await configurator.dropReserve(dai.address);

    const tokens = await pool.getReservesList();

    expect(tokens.includes(dai.address)).to.be.false;

    const { isActive } = await helpersContract.getReserveConfigurationData(dai.address);

    expect(isActive).to.be.false;
  });
});
