import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('eMode tests', (testEnv: TestEnv) => {
  const { VL_INCONSISTENT_EMODE_CATEGORY, VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD } =
    ProtocolErrors;

  const CATEGORIES = {
    STABLECOINS: {
      id: BigNumber.from('1'),
      ltv: BigNumber.from('9800'),
      lt: BigNumber.from('9800'),
      lb: BigNumber.from('10100'),
      oracle: ZERO_ADDRESS,
      label: 'STABLECOINS',
    },
    ETHEREUM: {
      id: BigNumber.from('2'),
      ltv: BigNumber.from('9800'),
      lt: BigNumber.from('9800'),
      lb: BigNumber.from('10100'),
      oracle: ZERO_ADDRESS,
      label: 'ETHEREUM',
    },
  };

  before(async () => {
    const {
      pool,
      dai,
      usdc,
      weth,
      users: [user0, user1],
    } = testEnv;
    const mintAmount = utils.parseEther('10000');

    await dai.connect(user0.signer).mint(mintAmount);
    await usdc.connect(user0.signer).mint(mintAmount);
    await weth.connect(user0.signer).mint(mintAmount);
    await usdc.connect(user1.signer).mint(mintAmount);
    await weth.connect(user1.signer).mint(mintAmount);

    await dai.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user0.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
  });

  it('Admin adds a category for stablecoins with DAI and USDC', async () => {
    const { configurator, pool, dai, usdc, poolAdmin } = testEnv;

    const { id, ltv, lt, lb, oracle, label } = CATEGORIES.STABLECOINS;

    expect(
      await configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    );
    expect(await configurator.connect(poolAdmin.signer).setAssetEModeCategory(dai.address, id));
    expect(await configurator.connect(poolAdmin.signer).setAssetEModeCategory(usdc.address, id));

    expect(await pool.getAssetEMode(dai.address)).to.be.eq(id);
    expect(await pool.getAssetEMode(usdc.address)).to.be.eq(id);
  });

  it('Admin adds a category for ethereum with WETH', async () => {
    const { configurator, pool, weth, poolAdmin } = testEnv;

    const { id, ltv, lt, lb, oracle, label } = CATEGORIES.ETHEREUM;

    expect(
      await configurator.connect(poolAdmin.signer).setEModeCategory(id, ltv, lt, lb, oracle, label)
    );
    expect(await configurator.connect(poolAdmin.signer).setAssetEModeCategory(weth.address, id));

    expect(await pool.getAssetEMode(weth.address)).to.be.eq(id);
  });

  it('User 0 activates eMode for stablecoins category', async () => {
    const {
      pool,
      users: [user0],
    } = testEnv;

    expect(await pool.connect(user0.signer).setUserEMode(CATEGORIES.STABLECOINS.id))
      .to.emit(pool, 'UserEModeSet')
      .withArgs(user0.address, CATEGORIES.STABLECOINS.id);

    expect(await pool.getUserEMode(user0.address)).to.be.eq(CATEGORIES.STABLECOINS.id);
  });

  it('User 0 supplies 100 DAI, user 1 supplies 100 USDC', async () => {
    const {
      pool,
      dai,
      usdc,
      helpersContract,
      users: [user0, user1],
    } = testEnv;

    expect(
      await pool
        .connect(user0.signer)
        .supply(dai.address, await convertToCurrencyDecimals(dai.address, '100'), user0.address, 0)
    );
    const { usageAsCollateralEnabled: user0UseAsCollateral } =
      await helpersContract.getUserReserveData(dai.address, user0.address);
    expect(user0UseAsCollateral).to.be.true;

    await expect(
      await pool
        .connect(user1.signer)
        .supply(
          usdc.address,
          await convertToCurrencyDecimals(usdc.address, '100'),
          user1.address,
          0
        )
    );
    const { usageAsCollateralEnabled: user1UseAsCollateral } =
      await helpersContract.getUserReserveData(usdc.address, user1.address);
    expect(user1UseAsCollateral).to.be.true;
  });

  it('User 0 borrows 98 USDC and tries to deactivate eMode (revert expected)', async () => {
    const {
      pool,
      dai,
      usdc,
      users: [user0, user1],
    } = testEnv;
    expect(
      await pool
        .connect(user0.signer)
        .borrow(
          usdc.address,
          await convertToCurrencyDecimals(usdc.address, '98'),
          RateMode.Variable,
          0,
          user0.address
        )
    );

    const userCategory = await pool.getUserEMode(user0.address);
    await expect(pool.connect(user0.signer).setUserEMode(0)).to.be.revertedWith(
      VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );
    expect(await pool.getUserEMode(user0.address)).to.be.eq(userCategory);
  });

  it('User 0 repays 50 USDC and withdraws 10 DAI', async () => {
    const {
      pool,
      dai,
      usdc,
      users: [user0, user1],
    } = testEnv;
    expect(
      await pool
        .connect(user0.signer)
        .repay(
          usdc.address,
          await convertToCurrencyDecimals(usdc.address, '50'),
          RateMode.Variable,
          user0.address
        )
    );
    expect(
      await pool
        .connect(user0.signer)
        .withdraw(dai.address, await convertToCurrencyDecimals(dai.address, '10'), user0.address)
    );
  });

  it('User 0 supplies WETH (non-category asset), increasing borrowing power', async () => {
    const {
      pool,
      helpersContract,
      weth,
      users: [user0, user1],
    } = testEnv;
    const userDataBefore = await pool.getUserAccountData(user0.address);

    expect(
      await pool
        .connect(user0.signer)
        .supply(weth.address, await convertToCurrencyDecimals(weth.address, '1'), user0.address, 0)
    );
    const { usageAsCollateralEnabled } = await helpersContract.getUserReserveData(
      weth.address,
      user0.address
    );
    expect(usageAsCollateralEnabled).to.be.true;

    const userDataAfter = await pool.getUserAccountData(user0.address);
    expect(userDataBefore.availableBorrowsBase).to.be.lt(userDataAfter.availableBorrowsBase);
    expect(userDataBefore.totalCollateralBase).to.be.lt(userDataAfter.totalCollateralBase);
    expect(userDataBefore.totalDebtBase).to.be.eq(userDataAfter.totalDebtBase);
    expect(userDataBefore.healthFactor).to.be.lt(userDataAfter.healthFactor);
  });

  it('User 1 supplies 1 WETH and activates eMode for ethereum category', async () => {
    const {
      pool,
      helpersContract,
      weth,
      users: [, user1],
    } = testEnv;

    const userDataBeforeSupply = await pool.getUserAccountData(user1.address);

    // Supply 1 WETH, increasing totalCollateralBase
    const wethToSupply = await convertToCurrencyDecimals(weth.address, '1');
    expect(await pool.connect(user1.signer).supply(weth.address, wethToSupply, user1.address, 0));
    const { usageAsCollateralEnabled } = await helpersContract.getUserReserveData(
      weth.address,
      user1.address
    );
    expect(usageAsCollateralEnabled).to.be.true;
    const userDataAfterSupply = await pool.getUserAccountData(user1.address);
    expect(userDataBeforeSupply.totalCollateralBase).to.be.eq(
      userDataAfterSupply.totalCollateralBase.sub(wethToSupply)
    );

    // Activate EMode, increasing availableBorrowsBase
    expect(await pool.connect(user1.signer).setUserEMode(CATEGORIES.ETHEREUM.id))
      .to.emit(pool, 'UserEModeSet')
      .withArgs(user1.address, CATEGORIES.ETHEREUM.id);
    expect(await pool.getUserEMode(user1.address)).to.be.eq(CATEGORIES.ETHEREUM.id);

    const userDataAfterEMode = await pool.getUserAccountData(user1.address);
    expect(userDataAfterSupply.totalCollateralBase).to.be.eq(
      userDataAfterEMode.totalCollateralBase
    );
    expect(userDataAfterSupply.availableBorrowsBase).to.be.lt(
      userDataAfterEMode.availableBorrowsBase
    );
  });

  it('User 0 tries to activate eMode for ethereum category (revert expected)', async () => {
    const {
      pool,
      helpersContract,
      weth,
      users: [user0],
    } = testEnv;

    const userCategory = await pool.getUserEMode(user0.address);
    await expect(
      pool.connect(user0.signer).setUserEMode(CATEGORIES.ETHEREUM.id)
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
    expect(await pool.getUserEMode(user0.address)).to.be.eq(userCategory);
  });

  it('User 0 tries to borrow (non-category asset) WETH (revert expected)', async () => {
    const {
      pool,
      helpersContract,
      dai,
      weth,
      users: [user0, user1],
    } = testEnv;

    await expect(
      pool
        .connect(user0.signer)
        .borrow(
          weth.address,
          await convertToCurrencyDecimals(weth.address, '0.0001'),
          RateMode.Variable,
          0,
          user0.address
        )
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });
  it('User 1 tries to borrow (non-category asset) DAI (revert expected)', async () => {
    const {
      pool,
      helpersContract,
      dai,
      weth,
      users: [, user1],
    } = testEnv;

    await expect(
      pool
        .connect(user1.signer)
        .borrow(
          dai.address,
          await convertToCurrencyDecimals(dai.address, '10'),
          RateMode.Variable,
          0,
          user1.address
        )
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });

  it('User 0 repays USDC debt and activate eMode for ethereum category', async () => {
    const {
      pool,
      helpersContract,
      dai,
      usdc,
      weth,
      users: [user0, user1],
    } = testEnv;

    expect(
      await pool
        .connect(user0.signer)
        .repay(usdc.address, MAX_UINT_AMOUNT, RateMode.Variable, user0.address)
    );

    expect(await pool.connect(user0.signer).setUserEMode(CATEGORIES.ETHEREUM.id));
    expect(await pool.getUserEMode(user0.address)).to.be.eq(CATEGORIES.ETHEREUM.id);
  });

  it('User 0 tries to borrow (non-category asset) USDC (revert expected)', async () => {
    const {
      pool,
      helpersContract,
      dai,
      usdc,
      weth,
      users: [user0, user1],
    } = testEnv;

    await expect(
      pool
        .connect(user0.signer)
        .borrow(
          usdc.address,
          await convertToCurrencyDecimals(usdc.address, '5'),
          RateMode.Stable,
          0,
          user0.address
        )
    ).to.be.revertedWith(VL_INCONSISTENT_EMODE_CATEGORY);
  });
});
