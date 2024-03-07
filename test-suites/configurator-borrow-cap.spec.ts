import { expect } from 'chai';
import { utils } from 'ethers';
import { advanceTimeAndBlock } from '@aave/deploy-v3';
import { MAX_UINT_AMOUNT, MAX_BORROW_CAP } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('PoolConfigurator: Borrow Cap', (testEnv: TestEnv) => {
  const { BORROW_CAP_EXCEEDED, INVALID_BORROW_CAP } = ProtocolErrors;

  before(async () => {
    const {
      weth,
      pool,
      dai,
      usdc,
      users: [user1],
      deployer,
    } = testEnv;

    const mintedAmount = utils.parseEther('1000000000');
    // minting for main user
    expect(await dai['mint(uint256)'](mintedAmount));
    expect(await weth['mint(address,uint256)'](deployer.address, mintedAmount));
    expect(await usdc['mint(uint256)'](mintedAmount));

    // minting for lp user
    expect(await dai.connect(user1.signer)['mint(uint256)'](mintedAmount));
    expect(await weth.connect(user1.signer)['mint(address,uint256)'](user1.address, mintedAmount));
    expect(await usdc.connect(user1.signer)['mint(uint256)'](mintedAmount));

    expect(await dai.approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.approve(pool.address, MAX_UINT_AMOUNT));
    expect(await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
  });

  it('Reserves should initially have borrow cap disabled (borrowCap = 0)', async () => {
    const { dai, usdc, helpersContract } = testEnv;

    const { borrowCap: usdcBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcBorrowCap).to.be.equal('0');
    expect(daiBorrowCap).to.be.equal('0');
  });

  it('Borrows 10 stable DAI, 10 variable USDC', async () => {
    const {
      weth,
      pool,
      dai,
      usdc,
      deployer,
      users: [user1],
    } = testEnv;

    const suppliedAmount = '1000';
    const borrowedAmount = '10';

    // Deposit collateral
    expect(
      await pool.deposit(
        weth.address,
        await convertToCurrencyDecimals(weth.address, suppliedAmount),
        deployer.address,
        0
      )
    );
    // User 1 deposit more DAI and USDC to be able to borrow
    expect(
      await pool
        .connect(user1.signer)
        .deposit(
          dai.address,
          await convertToCurrencyDecimals(dai.address, suppliedAmount),
          user1.address,
          0
        )
    );

    expect(
      await pool
        .connect(user1.signer)
        .deposit(
          usdc.address,
          await convertToCurrencyDecimals(dai.address, suppliedAmount),
          user1.address,
          0
        )
    );

    // Borrow
    expect(
      await pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        1,
        0,
        deployer.address
      )
    );
  });

  it('Sets the borrow cap for DAI and USDC to 10 Units', async () => {
    const { configurator, dai, usdc, helpersContract } = testEnv;

    const { borrowCap: usdcOldBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiOldBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = 10;
    await expect(configurator.setBorrowCap(usdc.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(usdc.address, daiOldBorrowCap, newCap);
    await expect(configurator.setBorrowCap(dai.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(dai.address, usdcOldBorrowCap, newCap);

    const { borrowCap: usdcBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });

  it('Tries to borrow any DAI or USDC, stable or variable, (> BORROW_CAP) (revert expected)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const borrowedAmount = '10';

    await expect(
      pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(BORROW_CAP_EXCEEDED);

    await expect(
      pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(BORROW_CAP_EXCEEDED);
  });

  it('Tries to set the borrow cap for USDC and DAI to > MAX_BORROW_CAP (revert expected)', async () => {
    const { configurator, usdc, dai } = testEnv;
    const newCap = Number(MAX_BORROW_CAP) + 1;

    await expect(configurator.setBorrowCap(usdc.address, newCap)).to.be.revertedWith(
      INVALID_BORROW_CAP
    );
    await expect(configurator.setBorrowCap(dai.address, newCap)).to.be.revertedWith(
      INVALID_BORROW_CAP
    );
  });

  it('Sets the borrow cap for DAI and USDC to 120 Units', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;
    const newCap = '120';

    const { borrowCap: usdcOldBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiOldBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    await expect(configurator.setBorrowCap(usdc.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(usdc.address, usdcOldBorrowCap, newCap);
    await expect(configurator.setBorrowCap(dai.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(dai.address, daiOldBorrowCap, newCap);

    const { borrowCap: usdcBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });

  it('Borrows 10 stable DAI and 10 variable USDC', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const borrowedAmount = '10';
    expect(
      await pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        1,
        0,
        deployer.address
      )
    );
  });

  it('Sets the borrow cap for WETH to 2 Units', async () => {
    const { configurator, weth, helpersContract } = testEnv;

    const { borrowCap: wethOldBorrowCap } = await helpersContract.getReserveCaps(weth.address);

    const newCap = 2;
    await expect(configurator.setBorrowCap(weth.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(weth.address, wethOldBorrowCap, newCap);

    const wethBorrowCap = (await helpersContract.getReserveCaps(weth.address)).borrowCap;

    expect(wethBorrowCap).to.be.equal(newCap);
  });

  it('Borrows 2 variable WETH (= BORROW_CAP)', async () => {
    const { weth, pool, deployer, helpersContract } = testEnv;

    const borrowedAmount = '2';

    await pool.borrow(
      weth.address,
      await convertToCurrencyDecimals(weth.address, borrowedAmount),
      RateMode.Variable,
      0,
      deployer.address
    );
  });

  it('Time flies and ETH debt amount goes above the limit due to accrued interests', async () => {
    const { weth, helpersContract } = testEnv;

    // Advance blocks
    await advanceTimeAndBlock(3600);

    const wethData = await helpersContract.getReserveData(weth.address);
    const totalDebt = wethData.totalVariableDebt.add(wethData.totalStableDebt);
    const wethCaps = await helpersContract.getReserveCaps(weth.address);

    expect(totalDebt).gt(wethCaps.borrowCap);
  });

  it('Tries to borrow any variable ETH (> BORROW_CAP) (revert expected)', async () => {
    const { weth, pool, deployer } = testEnv;

    const borrowedAmount = '1';
    await expect(
      pool.borrow(
        weth.address,
        await convertToCurrencyDecimals(weth.address, borrowedAmount),
        RateMode.Variable,
        0,
        deployer.address
      )
    ).to.be.revertedWith(BORROW_CAP_EXCEEDED);
  });

  it('Borrows 99 variable DAI and 99 stable USDC (< BORROW_CAP)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const borrowedAmount = '99';
    expect(
      await pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        1,
        0,
        deployer.address
      )
    );
  });

  it('Raises the borrow cap for USDC and DAI to 1000 Units', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { borrowCap: usdcOldBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiOldBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = '1000';
    await expect(configurator.setBorrowCap(usdc.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(usdc.address, usdcOldBorrowCap, newCap);
    await expect(configurator.setBorrowCap(dai.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(dai.address, daiOldBorrowCap, newCap);

    const { borrowCap: usdcBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });

  it('Borrows 100 variable DAI and 100 stable USDC (< BORROW_CAP)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const borrowedAmount = '100';
    expect(
      await pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        1,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    );
  });

  it('Lowers the borrow cap for USDC and DAI to 200 Units', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { borrowCap: usdcOldBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiOldBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = '200';
    await expect(configurator.setBorrowCap(usdc.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(usdc.address, usdcOldBorrowCap, newCap);
    await expect(configurator.setBorrowCap(dai.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(dai.address, daiOldBorrowCap, newCap);

    const { borrowCap: usdcBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });

  it('Tries to borrows 100 variable DAI and 100 stable USDC (> BORROW_CAP) (revert expected)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const borrowedAmount = '100';
    await expect(
      pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        1,
        0,
        deployer.address
      )
    ).to.be.revertedWith(BORROW_CAP_EXCEEDED);

    await expect(
      pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(BORROW_CAP_EXCEEDED);
  });

  it('Raises the borrow cap for USDC and DAI to MAX_BORROW_CAP', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { borrowCap: usdcOldBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiOldBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = MAX_BORROW_CAP;
    await expect(configurator.setBorrowCap(usdc.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(usdc.address, usdcOldBorrowCap, newCap);
    await expect(configurator.setBorrowCap(dai.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(dai.address, daiOldBorrowCap, newCap);

    const { borrowCap: usdcBorrowCap } = await helpersContract.getReserveCaps(usdc.address);
    const { borrowCap: daiBorrowCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });

  it('Borrows 100 variable DAI and 100 stable USDC (< BORROW_CAP)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const borrowedAmount = '100';
    expect(
      await pool.borrow(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, borrowedAmount),
        1,
        0,
        deployer.address
      )
    );
    expect(
      await pool.borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, borrowedAmount),
        2,
        0,
        deployer.address
      )
    );
  });
});
