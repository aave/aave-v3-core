import { advanceTimeAndBlock } from '@aave/deploy-v3';
import { expect } from 'chai';
import { utils } from 'ethers';
import { MAX_UINT_AMOUNT, MAX_SUPPLY_CAP } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('PoolConfigurator: Supply Cap', (testEnv: TestEnv) => {
  const { SUPPLY_CAP_EXCEEDED, INVALID_SUPPLY_CAP } = ProtocolErrors;

  before(async () => {
    const { weth, pool, dai, usdc } = testEnv;

    const mintedAmount = utils.parseEther('1000000000');
    await dai['mint(uint256)'](mintedAmount);
    await weth['mint(uint256)'](mintedAmount);
    await usdc['mint(uint256)'](mintedAmount);

    await dai.approve(pool.address, MAX_UINT_AMOUNT);
    await weth.approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);
  });

  it('Reserves should initially have supply cap disabled (supplyCap = 0)', async () => {
    const { dai, usdc, helpersContract } = testEnv;

    let usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    let daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal('0');
    expect(daiSupplyCap).to.be.equal('0');
  });

  it('Supply 1000 Dai, 1000 USDC and 1000 WETH', async () => {
    const { weth, pool, dai, usdc, deployer } = testEnv;

    const suppliedAmount = '1000';

    await pool.deposit(
      usdc.address,
      await convertToCurrencyDecimals(usdc.address, suppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await convertToCurrencyDecimals(dai.address, suppliedAmount),
      deployer.address,
      0
    );
    await pool.deposit(
      weth.address,
      await convertToCurrencyDecimals(weth.address, suppliedAmount),
      deployer.address,
      0
    );
  });

  it('Sets the supply cap for DAI and USDC to 1000 Unit, leaving 0 Units to reach the limit', async () => {
    const { configurator, dai, usdc, helpersContract } = testEnv;

    const { supplyCap: oldUsdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: oldDaiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = '1000';

    expect(await configurator.setSupplyCap(usdc.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(usdc.address, oldUsdcSupplyCap, newCap);
    expect(await configurator.setSupplyCap(dai.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(dai.address, oldDaiSupplyCap, newCap);

    const { supplyCap: usdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: daiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });

  it('Tries to supply any DAI or USDC (> SUPPLY_CAP) (revert expected)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const suppliedAmount = '10';

    await expect(
      pool.deposit(usdc.address, suppliedAmount, deployer.address, 0)
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);

    await expect(
      pool.deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, suppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);
  });

  it('Tries to set the supply cap for USDC and DAI to > MAX_SUPPLY_CAP (revert expected)', async () => {
    const { configurator, usdc, dai } = testEnv;
    const newCap = Number(MAX_SUPPLY_CAP) + 1;

    await expect(configurator.setSupplyCap(usdc.address, newCap)).to.be.revertedWith(
      INVALID_SUPPLY_CAP
    );
    await expect(configurator.setSupplyCap(dai.address, newCap)).to.be.revertedWith(
      INVALID_SUPPLY_CAP
    );
  });

  it('Sets the supply cap for usdc and DAI to 1110 Units, leaving 110 Units to reach the limit', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { supplyCap: oldUsdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: oldDaiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = '1110';
    expect(await configurator.setSupplyCap(usdc.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(usdc.address, oldUsdcSupplyCap, newCap);
    expect(await configurator.setSupplyCap(dai.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(dai.address, oldDaiSupplyCap, newCap);

    const { supplyCap: usdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: daiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });

  it('Supply 10 DAI and 10 USDC, leaving 100 Units to reach the limit', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '10';
    await pool.deposit(
      usdc.address,
      await convertToCurrencyDecimals(usdc.address, suppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await convertToCurrencyDecimals(dai.address, suppliedAmount),
      deployer.address,
      0
    );
  });

  it('Tries to supply 101 DAI and 101 USDC (> SUPPLY_CAP) 1 unit above the limit (revert expected)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '101';

    await expect(
      pool.deposit(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, suppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);

    await expect(
      pool.deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, suppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);
  });

  it('Supply 99 DAI and 99 USDC (< SUPPLY_CAP), leaving 1 Units to reach the limit', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '99';
    await pool.deposit(
      usdc.address,
      await convertToCurrencyDecimals(usdc.address, suppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await convertToCurrencyDecimals(dai.address, suppliedAmount),
      deployer.address,
      0
    );
  });

  it('Supply 1 DAI and 1 USDC (= SUPPLY_CAP), reaching the limit', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '1';
    await pool.deposit(
      usdc.address,
      await convertToCurrencyDecimals(usdc.address, suppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await convertToCurrencyDecimals(dai.address, suppliedAmount),
      deployer.address,
      0
    );
  });

  it('Time flies and DAI and USDC supply amount goes above the limit due to accrued interests', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;

    // Advance blocks
    await advanceTimeAndBlock(3600);

    const daiData = await helpersContract.getReserveData(dai.address);
    const daiCaps = await helpersContract.getReserveCaps(dai.address);
    const usdcData = await helpersContract.getReserveData(usdc.address);
    const usdcCaps = await helpersContract.getReserveCaps(usdc.address);

    expect(daiData.totalAToken).gt(daiCaps.supplyCap);
    expect(usdcData.totalAToken).gt(usdcCaps.supplyCap);
  });

  it('Raises the supply cap for USDC and DAI to 2000 Units, leaving 800 Units to reach the limit', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { supplyCap: oldUsdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: oldDaiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = '2000';
    expect(await configurator.setSupplyCap(usdc.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(usdc.address, oldUsdcSupplyCap, newCap);
    expect(await configurator.setSupplyCap(dai.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(dai.address, oldDaiSupplyCap, newCap);

    const { supplyCap: usdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: daiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });

  it('Supply 100 DAI and 100 USDC, leaving 700 Units to reach the limit', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '100';
    await pool.deposit(
      usdc.address,
      await convertToCurrencyDecimals(usdc.address, suppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await convertToCurrencyDecimals(dai.address, suppliedAmount),
      deployer.address,
      0
    );
  });

  it('Lowers the supply cap for USDC and DAI to 1200 Units (suppliedAmount > supplyCap)', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { supplyCap: oldUsdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: oldDaiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = '1200';
    expect(await configurator.setSupplyCap(usdc.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(usdc.address, oldUsdcSupplyCap, newCap);
    expect(await configurator.setSupplyCap(dai.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(dai.address, oldDaiSupplyCap, newCap);

    const { supplyCap: usdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: daiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });

  it('Tries to supply 100 DAI and 100 USDC (> SUPPLY_CAP) (revert expected)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '100';

    await expect(
      pool.deposit(
        usdc.address,
        await convertToCurrencyDecimals(usdc.address, suppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);

    await expect(
      pool.deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, suppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(SUPPLY_CAP_EXCEEDED);
  });

  it('Raises the supply cap for USDC and DAI to MAX_SUPPLY_CAP', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;

    const { supplyCap: oldUsdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: oldDaiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    const newCap = MAX_SUPPLY_CAP;
    expect(await configurator.setSupplyCap(usdc.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(usdc.address, oldUsdcSupplyCap, newCap);
    expect(await configurator.setSupplyCap(dai.address, newCap))
      .to.emit(configurator, 'SupplyCapChanged')
      .withArgs(dai.address, oldDaiSupplyCap, newCap);

    const { supplyCap: usdcSupplyCap } = await helpersContract.getReserveCaps(usdc.address);
    const { supplyCap: daiSupplyCap } = await helpersContract.getReserveCaps(dai.address);

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });

  it('Supply 100 DAI and 100 USDC', async () => {
    const { usdc, pool, dai, deployer } = testEnv;

    const suppliedAmount = '100';
    await pool.deposit(
      usdc.address,
      await convertToCurrencyDecimals(usdc.address, suppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await convertToCurrencyDecimals(dai.address, suppliedAmount),
      deployer.address,
      0
    );
  });
});
