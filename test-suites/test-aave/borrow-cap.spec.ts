import { TestEnv, makeSuite } from './helpers/make-suite';
import {
  APPROVAL_AMOUNT_LENDING_POOL,
  MAX_UINT_AMOUNT,
  RAY,
  MAX_BORROW_CAP,
  MAX_SUPPLY_CAP,
} from '../../helpers/constants';
import { ProtocolErrors } from '../../helpers/types';
import { MintableERC20, WETH9, WETH9Mocked } from '../../types';
import { parseEther } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';

const { expect } = require('chai');

makeSuite('Borrow Cap', (testEnv: TestEnv) => {
  const { VL_BORROW_CAP_EXCEEDED, RC_INVALID_BORROW_CAP } = ProtocolErrors;

  const unitParse = async (token: WETH9Mocked | MintableERC20, nb: string) =>
    BigNumber.from(nb).mul(BigNumber.from('10').pow((await token.decimals()) - 3));
  it('Reserves should initially have borrow cap disabled (borrowCap = 0)', async () => {
    const {
      configurator,
      weth,
      pool,
      dai,
      usdc,
      deployer,
      helpersContract,
      users: [user1],
    } = testEnv;

    const mintedAmount = parseEther('1000000000');
    // minting for main user
    await dai.mint(mintedAmount);
    await weth.mint(mintedAmount);
    await usdc.mint(mintedAmount);
    // minting for lp user
    await dai.connect(user1.signer).mint(mintedAmount);
    await weth.connect(user1.signer).mint(mintedAmount);
    await usdc.connect(user1.signer).mint(mintedAmount);

    await dai.approve(pool.address, MAX_UINT_AMOUNT);
    await weth.approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);
    await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);

    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal('0');
    expect(daiBorrowCap).to.be.equal('0');
  });
  it('Should be able to borrow 10 Dai stable, 10 USDC variable', async () => {
    const {
      configurator,
      weth,
      pool,
      dai,
      usdc,
      deployer,
      helpersContract,
      users: [user1],
    } = testEnv;

    const suppliedAmount = 1000;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();

    const borrowedAmount = 10;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    // deposit collateral
    await pool.deposit(
      weth.address,
      await unitParse(weth, precisionSuppliedAmount),
      deployer.address,
      0
    );
    // user 1 deposit more dai and usdc to be able to borrow
    await pool
      .connect(user1.signer)
      .deposit(dai.address, await unitParse(dai, precisionSuppliedAmount), user1.address, 0);

    await pool
      .connect(user1.signer)
      .deposit(usdc.address, await unitParse(usdc, precisionSuppliedAmount), user1.address, 0);

    // borrow
    await pool.borrow(
      usdc.address,
      await unitParse(usdc, precisionBorrowedAmount),
      2,
      0,
      deployer.address
    );

    await pool.borrow(
      dai.address,
      await unitParse(dai, precisionBorrowedAmount),
      1,
      0,
      deployer.address
    );
  });
  it('Sets the borrow cap for Weth and DAI to 10 Units', async () => {
    const {
      configurator,
      weth,
      pool,
      dai,
      usdc,
      deployer,
      helpersContract,
      users: [user1],
    } = testEnv;

    await configurator.setBorrowCap(usdc.address, 10);
    await configurator.setBorrowCap(dai.address, 10);

    const usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    const daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(10);
    expect(daiBorrowCap).to.be.equal(10);
  });
  it('should fail to borrow any dai or usdc, stable or variable', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 10;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    await expect(
      pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(VL_BORROW_CAP_EXCEEDED);

    await expect(
      pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(VL_BORROW_CAP_EXCEEDED);
  });
  it('Should fail to set the borrow cap for usdc and DAI to max cap + 1 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = Number(MAX_BORROW_CAP) + 1;

    await expect(configurator.setBorrowCap(usdc.address, newCap)).to.be.revertedWith(
      RC_INVALID_BORROW_CAP
    );
    await expect(configurator.setBorrowCap(dai.address, newCap)).to.be.revertedWith(
      RC_INVALID_BORROW_CAP
    );
  });
  it('Sets the borrow cap for usdc and DAI to 120 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = '120';

    await configurator.setBorrowCap(usdc.address, newCap);
    await configurator.setBorrowCap(dai.address, newCap);

    const usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    const daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('Should succeed to borrow 10 stable dai and 10 variable usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 10;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();
    await pool.borrow(
      usdc.address,
      await unitParse(usdc, precisionBorrowedAmount),
      2,
      0,
      deployer.address
    );

    await pool.borrow(
      dai.address,
      await unitParse(dai, precisionBorrowedAmount),
      1,
      0,
      deployer.address
    );
  });
  it('should fail to borrow 100 variable dai and 100 stable usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 100;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    await expect(
      pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    ).to.be.revertedWith(VL_BORROW_CAP_EXCEEDED);

    await expect(
      pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(VL_BORROW_CAP_EXCEEDED);
  });
  it('Should succeed to borrow 99 variable dai and 99 stable usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 99;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();
    await pool.borrow(
      usdc.address,
      await unitParse(usdc, precisionBorrowedAmount),
      2,
      0,
      deployer.address
    );

    await pool.borrow(
      dai.address,
      await unitParse(dai, precisionBorrowedAmount),
      1,
      0,
      deployer.address
    );
  });
  it('Raises the borrow cap for usdc and DAI to 1000 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = '1000';
    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    await configurator.setBorrowCap(usdc.address, newCap);
    await configurator.setBorrowCap(dai.address, newCap);

    usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('should succeed to borrow 100 variable dai and 100 stable usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 100;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    await pool.borrow(
      usdc.address,
      await unitParse(usdc, precisionBorrowedAmount),
      1,
      0,
      deployer.address
    );

    await pool.borrow(
      dai.address,
      await unitParse(dai, precisionBorrowedAmount),
      2,
      0,
      deployer.address
    );
  });
  it('Lowers the borrow cap for usdc and DAI to 200 Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = '200';
    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    await configurator.setBorrowCap(usdc.address, newCap);
    await configurator.setBorrowCap(dai.address, newCap);

    usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('should fail to borrow 100 variable dai and 100 stable usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 100;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    await expect(
      pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    ).to.be.revertedWith(VL_BORROW_CAP_EXCEEDED);

    await expect(
      pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    ).to.be.revertedWith(VL_BORROW_CAP_EXCEEDED);
  });
  it('Raises the borrow cap for usdc and DAI to max cap Units', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = MAX_BORROW_CAP;
    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    await configurator.setBorrowCap(usdc.address, newCap);
    await configurator.setBorrowCap(dai.address, newCap);

    usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('should succeed to borrow 100 variable dai and 100 stable usdc', async () => {
    const { usdc, pool, dai, deployer, helpersContract } = testEnv;
    const borrowedAmount = 100;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    await pool.borrow(
      usdc.address,
      await unitParse(usdc, precisionBorrowedAmount),
      1,
      0,
      deployer.address
    );

    await pool.borrow(
      dai.address,
      await unitParse(dai, precisionBorrowedAmount),
      2,
      0,
      deployer.address
    );
  });
});
