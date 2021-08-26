import { TestEnv, makeSuite } from './helpers/make-suite';
import { MAX_UINT_AMOUNT, MAX_SUPPLY_CAP } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { MintableERC20, WETH9Mocked } from '../types';
import { BigNumber, utils } from 'ethers';
import { expect } from 'chai';

makeSuite('supply Cap', (testEnv: TestEnv) => {
  const { VL_SUPPLY_CAP_EXCEEDED, RC_INVALID_SUPPLY_CAP } = ProtocolErrors;

  const unitParse = async (token: WETH9Mocked | MintableERC20, nb: string) =>
    BigNumber.from(nb).mul(BigNumber.from('10').pow((await token.decimals()) - 3));

  it('Reserves should initially have supply cap disabled (supplyCap = 0)', async () => {
    const { weth, pool, dai, usdc, helpersContract } = testEnv;

    const mintedAmount = utils.parseEther('1000000000');
    await dai.mint(mintedAmount);
    await weth.mint(mintedAmount);
    await usdc.mint(mintedAmount);

    await dai.approve(pool.address, MAX_UINT_AMOUNT);
    await weth.approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);

    let usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    let daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal('0');
    expect(daiSupplyCap).to.be.equal('0');
  });
  it('Should be able to deposit 1000 Dai, 1000 USDC and 1000 Weth', async () => {
    const { weth, pool, dai, usdc, deployer } = testEnv;

    const suppliedAmount = 1000;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();

    await pool.deposit(
      usdc.address,
      await unitParse(usdc, precisionSuppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await unitParse(dai, precisionSuppliedAmount),
      deployer.address,
      0
    );
    await pool.deposit(
      weth.address,
      await unitParse(weth, precisionSuppliedAmount),
      deployer.address,
      0
    );
  });
  it('Sets the supply cap for Weth and DAI to 1000 Unit', async () => {
    const { configurator, dai, usdc, helpersContract } = testEnv;

    const newCap = '1000';

    await configurator.setSupplyCap(usdc.address, newCap);
    await configurator.setSupplyCap(dai.address, newCap);

    const usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    const daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });
  it('should fail to supply any dai or usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const suppliedAmount = 10;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();

    await expect(
      pool.deposit(
        usdc.address,
        await unitParse(usdc, precisionSuppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(VL_SUPPLY_CAP_EXCEEDED);

    await expect(
      pool.deposit(dai.address, await unitParse(dai, precisionSuppliedAmount), deployer.address, 0)
    ).to.be.revertedWith(VL_SUPPLY_CAP_EXCEEDED);
  });
  it('Should fail to set the supply cap for usdc and DAI to max cap + 1 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = Number(MAX_SUPPLY_CAP) + 1;

    await expect(configurator.setSupplyCap(usdc.address, newCap)).to.be.revertedWith(
      RC_INVALID_SUPPLY_CAP
    );
    await expect(configurator.setSupplyCap(dai.address, newCap)).to.be.revertedWith(
      RC_INVALID_SUPPLY_CAP
    );
  });
  it('Sets the supply cap for usdc and DAI to 1110 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = '1110';

    await configurator.setSupplyCap(usdc.address, newCap);
    await configurator.setSupplyCap(dai.address, newCap);

    const usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    const daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });
  it('Should succeed to supply 10  dai and 10  usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const suppliedAmount = 10;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();
    await pool.deposit(
      usdc.address,
      await unitParse(usdc, precisionSuppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await unitParse(dai, precisionSuppliedAmount),
      deployer.address,
      0
    );
  });
  it('should fail to supply 100 dai and 100 usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const suppliedAmount = 100;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();

    await expect(
      pool.deposit(
        usdc.address,
        await unitParse(usdc, precisionSuppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(VL_SUPPLY_CAP_EXCEEDED);

    await expect(
      pool.deposit(dai.address, await unitParse(dai, precisionSuppliedAmount), deployer.address, 0)
    ).to.be.revertedWith(VL_SUPPLY_CAP_EXCEEDED);
  });
  it('Should succeed to supply 99 dai and 99 usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const suppliedAmount = 99;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();
    await pool.deposit(
      usdc.address,
      await unitParse(usdc, precisionSuppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await unitParse(dai, precisionSuppliedAmount),
      deployer.address,
      0
    );
  });
  it('Raises the supply cap for usdc and DAI to 2000 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = '2000';

    await configurator.setSupplyCap(usdc.address, newCap);
    await configurator.setSupplyCap(dai.address, newCap);

    const usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    const daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });
  it('should succeed to supply 100 dai and 100 usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const suppliedAmount = 100;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();
    await pool.deposit(
      usdc.address,
      await unitParse(usdc, precisionSuppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await unitParse(dai, precisionSuppliedAmount),
      deployer.address,
      0
    );
  });
  it('Lowers the supply cap for usdc and DAI to 1200 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = '1200';
    let usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    let daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    await configurator.setSupplyCap(usdc.address, newCap);
    await configurator.setSupplyCap(dai.address, newCap);

    usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });
  it('should fail to supply 100 dai and 100 usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const suppliedAmount = 100;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();

    await expect(
      pool.deposit(
        usdc.address,
        await unitParse(usdc, precisionSuppliedAmount),
        deployer.address,
        0
      )
    ).to.be.revertedWith(VL_SUPPLY_CAP_EXCEEDED);

    await expect(
      pool.deposit(dai.address, await unitParse(dai, precisionSuppliedAmount), deployer.address, 0)
    ).to.be.revertedWith(VL_SUPPLY_CAP_EXCEEDED);
  });
  it('Raises the supply cap for usdc and DAI to max cap Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = MAX_SUPPLY_CAP;
    let usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    let daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    await configurator.setSupplyCap(usdc.address, newCap);
    await configurator.setSupplyCap(dai.address, newCap);

    usdcSupplyCap = (await helpersContract.getReserveCaps(usdc.address)).supplyCap;
    daiSupplyCap = (await helpersContract.getReserveCaps(dai.address)).supplyCap;

    expect(usdcSupplyCap).to.be.equal(newCap);
    expect(daiSupplyCap).to.be.equal(newCap);
  });
  it('should succeed to supply 100 dai and 100 usdc', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const suppliedAmount = 100;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();
    await pool.deposit(
      usdc.address,
      await unitParse(usdc, precisionSuppliedAmount),
      deployer.address,
      0
    );

    await pool.deposit(
      dai.address,
      await unitParse(dai, precisionSuppliedAmount),
      deployer.address,
      0
    );
  });
});
