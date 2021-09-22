import { expect } from 'chai';
import { evmRevert, evmSnapshot } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { AaveProtocolDataProvider } from '../types';
import { ProtocolErrors, RateMode, tEthereumAddress } from '../helpers/types';

makeSuite('Pool: Supply edge cases', (testEnv: TestEnv) => {
  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  let daiAmount;
  let usdcAmount;
  let wethAmount;

  let { VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD } = ProtocolErrors;

  const isUsingAsCollateral = async (
    helpersContract: AaveProtocolDataProvider,
    asset: tEthereumAddress,
    user: tEthereumAddress
  ) => {
    return (await helpersContract.getUserReserveData(asset, user)).usageAsCollateralEnabled;
  };

  before(async () => {
    const {
      pool,
      dai,
      usdc,
      weth,
      users: [user1, user2],
    } = testEnv;

    daiAmount = await convertToCurrencyDecimals(dai.address, '10');
    usdcAmount = await convertToCurrencyDecimals(usdc.address, '5');
    wethAmount = await convertToCurrencyDecimals(weth.address, '1');

    // mint to main user
    const mintAmount = '1000';
    expect(
      await dai.connect(user1.signer).mint(await convertToCurrencyDecimals(dai.address, mintAmount))
    );
    expect(
      await usdc
        .connect(user1.signer)
        .mint(await convertToCurrencyDecimals(usdc.address, mintAmount))
    );
    expect(
      await weth
        .connect(user1.signer)
        .mint(await convertToCurrencyDecimals(weth.address, mintAmount))
    );
    expect(
      await dai.connect(user2.signer).mint(await convertToCurrencyDecimals(dai.address, mintAmount))
    );
    expect(
      await usdc
        .connect(user2.signer)
        .mint(await convertToCurrencyDecimals(usdc.address, mintAmount))
    );

    // approve to pool
    expect(await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await dai.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user2.signer).approve(pool.address, MAX_UINT_AMOUNT));

    // Give USDC liquidity to reserve
    expect(
      await pool
        .connect(user2.signer)
        .supply(
          usdc.address,
          await convertToCurrencyDecimals(usdc.address, mintAmount),
          user2.address,
          0,
          false
        )
    );
  });

  context('Deposit', () => {
    it('User 1 deposits 10 DAI, set useAsCollateral to false and deposits again not changing useAsCollateral', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user1.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user1.address, daiAmount, 0, true)
        .to.emit(pool, 'ReserveUsedAsCollateralEnabled')
        .withArgs(dai.address, user1.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;

      expect(await pool.connect(user1.signer).setUserUseReserveAsCollateral(dai.address, false))
        .to.emit(pool, 'ReserveUsedAsCollateralDisabled')
        .withArgs(dai.address, user1.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user1.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user1.address, daiAmount, 0, true);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;
    });

    it('User 1 deposits 10 DAI on behalf of 2, setting useAsCollateral to true by default', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user2.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user2.address, daiAmount, 0, true)
        .to.emit(pool, 'ReserveUsedAsCollateralEnabled')
        .withArgs(dai.address, user2.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
    });

    it('User 1 deposits 10 DAI on behalf of 2, user 2 set useAsCollateral to false and user 1 deposits again not changing useAsCollateral', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user2.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user2.address, daiAmount, 0, true)
        .to.emit(pool, 'ReserveUsedAsCollateralEnabled')
        .withArgs(dai.address, user2.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;

      expect(await pool.connect(user2.signer).setUserUseReserveAsCollateral(dai.address, false))
        .to.emit(pool, 'ReserveUsedAsCollateralDisabled')
        .withArgs(dai.address, user2.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user2.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user2.address, daiAmount, 0, true);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;
    });

    it('User 2 deposits 10 DAI, user 2 set useAsCollateral to false and user 1 deposits on behalf of 2 not changing useAsCollateral', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(await pool.connect(user2.signer).deposit(dai.address, daiAmount, user2.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user2.address, user2.address, daiAmount, 0, true)
        .to.emit(pool, 'ReserveUsedAsCollateralEnabled')
        .withArgs(dai.address, user2.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;

      expect(await pool.connect(user2.signer).setUserUseReserveAsCollateral(dai.address, false))
        .to.emit(pool, 'ReserveUsedAsCollateralDisabled')
        .withArgs(dai.address, user2.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user2.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user2.address, daiAmount, 0, true);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;
    });

    it('User 1 deposits 10 DAI, set useAsCollateral to false and receives aTokens', async () => {
      const {
        pool,
        helpersContract,
        dai,
        aDai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(await pool.connect(user1.signer).deposit(dai.address, daiAmount, user1.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user1.address, user1.address, daiAmount, 0, true)
        .to.emit(pool, 'ReserveUsedAsCollateralEnabled')
        .withArgs(dai.address, user1.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;

      expect(await pool.connect(user1.signer).setUserUseReserveAsCollateral(dai.address, false))
        .to.emit(pool, 'ReserveUsedAsCollateralDisabled')
        .withArgs(dai.address, user1.address);

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(await pool.connect(user2.signer).deposit(dai.address, daiAmount, user2.address, 0))
        .to.emit(pool, 'Supply')
        .withArgs(dai.address, user2.address, user2.address, daiAmount, 0, true)
        .to.emit(pool, 'ReserveUsedAsCollateralEnabled')
        .withArgs(dai.address, user2.address);

      expect(await aDai.connect(user2.signer).transfer(user1.address, daiAmount));

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
    });
  });

  context('Supply', () => {
    it('User 1 supplies 10 DAI (not as collateral), and supplies again (as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, false)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI (as collateral) and supplies again (as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI (as collateral) and supplies again (not as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, false)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
    });

    it('User 1 supplies 10 DAI (as collateral), borrows 5 USDC and supplies 10 DAI (as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        usdc,
        users: [user1],
      } = testEnv;

      // Supply 10 DAI as collateral
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;

      // Borrows 5 USDC
      expect(
        await pool
          .connect(user1.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user1.address)
      );

      // Supply 10 DAI not as collateral
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI and 1 WETH (as collateral), borrows 1 USDC and supplies 10 DAI (not as collateral) (HF > 1)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        usdc,
        weth,
        users: [user1],
      } = testEnv;

      // Supply 10 DAI and 1 WETH as collateral
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );
      expect(
        await pool.connect(user1.signer).supply(weth.address, wethAmount, user1.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;
      expect(await isUsingAsCollateral(helpersContract, weth.address, user1.address)).to.be.true;

      // Borrows 1 USDC
      expect(
        await pool
          .connect(user1.signer)
          .borrow(
            usdc.address,
            await convertToCurrencyDecimals(usdc.address, '1'),
            RateMode.Variable,
            0,
            user1.address
          )
      );

      // Supply 10 DAI not as collateral
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, false)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, weth.address, user1.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI (as collateral), borrows 5 USDC and tries to supply 10 DAI (not as collateral) (HF < 1) (revert expected)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        usdc,
        users: [user1],
      } = testEnv;

      // Supply 10 DAI as collateral
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.true;

      // Borrows 5 USDC
      expect(
        await pool
          .connect(user1.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user1.address)
      );

      // Supply 10 DAI not as collateral
      await expect(
        pool.connect(user1.signer).supply(dai.address, daiAmount, user1.address, 0, false)
      ).to.be.revertedWith(VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD);
    });
  });

  context('Supply onBehalfOf', () => {
    it('User 1 supplies 10 DAI (not as collateral) for user 2, and supplies again (as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, false)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;
    });

    it('User 1 supplies 10 DAI (as collateral) and supplies again (as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI (as collateral) and supplies again (not as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        users: [user1, user2],
      } = testEnv;

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.false;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;

      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, false)
      );

      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI (as collateral), user 2 borrows 5 USDC and user 1 supplies 10 DAI (as collateral)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        usdc,
        users: [user1, user2],
      } = testEnv;

      // User 1 supplies 10 DAI as collateral on behalf of user 2
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;

      // User 1 tries to borrow 5 USDC (revert expected)
      await expect(
        pool
          .connect(user1.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user1.address)
      ).to.be.reverted;

      // User 2 borrows 5 USDC
      expect(
        await pool
          .connect(user2.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user2.address)
      );

      // User 1 supplies 10 DAI not as collateral on behalf of user 2
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI and 1 WETH (as collateral), borrows 1 USDC and supplies 10 DAI (not as collateral) (HF > 1)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        usdc,
        weth,
        users: [user1, user2],
      } = testEnv;

      // User 1 supplies 10 DAI and 1 WETH as collateral on behalf of user 2
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );
      expect(
        await pool.connect(user1.signer).supply(weth.address, wethAmount, user2.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, weth.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
      expect(await isUsingAsCollateral(helpersContract, weth.address, user2.address)).to.be.true;

      // User 1 tries to borrow 5 USDC (revert expected)
      await expect(
        pool
          .connect(user1.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user1.address)
      ).to.be.reverted;

      // User 2 borrows 1 USDC
      expect(
        await pool
          .connect(user2.signer)
          .borrow(
            usdc.address,
            await convertToCurrencyDecimals(usdc.address, '1'),
            RateMode.Variable,
            0,
            user2.address
          )
      );

      // User 1 supplies 10 DAI not as collateral on behalf of user 2
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, false)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, weth.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
      expect(await isUsingAsCollateral(helpersContract, weth.address, user2.address)).to.be.true;
    });

    it('User 1 supplies 10 DAI (as collateral), borrows 5 USDC and tries to supply 10 DAI (not as collateral) (HF < 1) (revert expected)', async () => {
      const {
        pool,
        helpersContract,
        dai,
        usdc,
        users: [user1, user2],
      } = testEnv;

      // User 1 supplies 10 DAI as collateral on behalf of user 2
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, true)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;

      // User 1 tries to borrow 5 USDC (revert expected)
      await expect(
        pool
          .connect(user1.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user1.address)
      ).to.be.reverted;

      // User 2 borrows 5 USDC
      expect(
        await pool
          .connect(user2.signer)
          .borrow(usdc.address, usdcAmount, RateMode.Variable, 0, user2.address)
      );

      // User 1 tries to supply 10 DAI not as collateral on behalf of user 2
      expect(
        await pool.connect(user1.signer).supply(dai.address, daiAmount, user2.address, 0, false)
      );
      expect(await isUsingAsCollateral(helpersContract, dai.address, user1.address)).to.be.false;
      expect(await isUsingAsCollateral(helpersContract, dai.address, user2.address)).to.be.true;
    });
  });
});
