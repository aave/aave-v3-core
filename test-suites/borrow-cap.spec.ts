import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { MAX_UINT_AMOUNT, MAX_BORROW_CAP } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { MintableERC20, WETH9Mocked } from '../types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('Borrow Cap', (testEnv: TestEnv) => {
  const { VL_BORROW_CAP_EXCEEDED, RC_INVALID_BORROW_CAP } = ProtocolErrors;

  const unitParse = async (token: WETH9Mocked | MintableERC20, nb: string) =>
    BigNumber.from(nb).mul(BigNumber.from('10').pow((await token.decimals()) - 3));

  before(async () => {
    const {
      weth,
      pool,
      dai,
      usdc,
      users: [user1],
    } = testEnv;

    const mintedAmount = utils.parseEther('1000000000');
    // minting for main user
    expect(await dai.mint(mintedAmount));
    expect(await weth.mint(mintedAmount));
    expect(await usdc.mint(mintedAmount));

    // minting for lp user
    expect(await dai.connect(user1.signer).mint(mintedAmount));
    expect(await weth.connect(user1.signer).mint(mintedAmount));
    expect(await usdc.connect(user1.signer).mint(mintedAmount));

    expect(await dai.approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.approve(pool.address, MAX_UINT_AMOUNT));
    expect(await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
    expect(await usdc.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT));
  });
  
  it('Reserves should initially have borrow cap disabled (borrowCap = 0)', async () => {
    const { dai, usdc, helpersContract } = testEnv;

    const usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    const daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal('0');
    expect(daiBorrowCap).to.be.equal('0');
  });

  it('Borrows 10 Dai stable, 10 USDC variable', async () => {
    const {
      weth,
      pool,
      dai,
      usdc,
      deployer,
      users: [user1],
    } = testEnv;

    const suppliedAmount = 1000;
    const precisionSuppliedAmount = (suppliedAmount * 1000).toString();

    const borrowedAmount = 10;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    // Deposit collateral
    expect(
      await pool.deposit(
        weth.address,
        await unitParse(weth, precisionSuppliedAmount),
        deployer.address,
        0
      )
    );
    // User 1 deposit more DAI and USDC to be able to borrow
    expect(
      await pool
        .connect(user1.signer)
        .deposit(dai.address, await unitParse(dai, precisionSuppliedAmount), user1.address, 0)
    );

    expect(
      await pool
        .connect(user1.signer)
        .deposit(usdc.address, await unitParse(usdc, precisionSuppliedAmount), user1.address, 0)
    );

    // Borrow
    expect(
      await pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    );
  });
  it('Sets the borrow cap for WETH and DAI to 10 Units', async () => {
    const { configurator, dai, usdc, helpersContract } = testEnv;

    const newCap = 10;
    expect(await configurator.setBorrowCap(usdc.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(usdc.address, newCap);
    expect(await configurator.setBorrowCap(dai.address, newCap))
      .to.emit(configurator, 'BorrowCapChanged')
      .withArgs(dai.address, newCap);

    const usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    const daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(10);
    expect(daiBorrowCap).to.be.equal(10);
  });

  it('Tries to borrow any DAI or usdc, stable or variable, (> BORROW_CAP) and reverts', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
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

  it('Tries to set the borrow cap for USDC and DAI to > MAX_BORROW_CAP and reverts', async () => {
    const { configurator, usdc, dai } = testEnv;
    const newCap = Number(MAX_BORROW_CAP) + 1;

    await expect(configurator.setBorrowCap(usdc.address, newCap)).to.be.revertedWith(
      RC_INVALID_BORROW_CAP
    );
    await expect(configurator.setBorrowCap(dai.address, newCap)).to.be.revertedWith(
      RC_INVALID_BORROW_CAP
    );
  });

  it('Sets the borrow cap for USDC and DAI to 120 Units', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;
    const newCap = '120';

    expect(await configurator.setBorrowCap(usdc.address, newCap));
    expect(await configurator.setBorrowCap(dai.address, newCap));

    const usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    const daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('Borrows 10 stable DAI and 10 variable USDC', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const borrowedAmount = 10;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();
    expect(
      await pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    );
  });
  it('Tries to borrow 100 variable DAI and 100 stable USDC (= BORROW_CAP) and reverts', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
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
  it('Borrows 99 variable DAI and 99 stable USDC (< BORROW_CAP)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const borrowedAmount = 99;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();
    expect(
      await pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    );
  });
  it('Raises the borrow cap for USDC and DAI to 1000 Units', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;
    const newCap = '1000';
    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(await configurator.setBorrowCap(usdc.address, newCap));
    expect(await configurator.setBorrowCap(dai.address, newCap));

    usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });

  it('Borrows 100 variable DAI and 100 stable USDC (< BORROW_CAP)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const borrowedAmount = 100;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    expect(
      await pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    );
  });

  it('Lowers the borrow cap for USDC and DAI to 200 Units', async () => {
    const { configurator, usdc, dai, helpersContract } = testEnv;
    const newCap = '200';
    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(await configurator.setBorrowCap(usdc.address, newCap));
    expect(await configurator.setBorrowCap(dai.address, newCap));

    usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('Tries to borrows 100 variable DAI and 100 stable USDC (> BORROW_CAP) and reverts', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
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

  it('Raises the borrow cap for USDC and DAI to MAX_BORROW_CAP', async () => {
    const { configurator, usdc, pool, dai, deployer, helpersContract } = testEnv;
    const newCap = MAX_BORROW_CAP;
    let usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    let daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(await configurator.setBorrowCap(usdc.address, newCap));
    expect(await configurator.setBorrowCap(dai.address, newCap));

    usdcBorrowCap = (await helpersContract.getReserveCaps(usdc.address)).borrowCap;
    daiBorrowCap = (await helpersContract.getReserveCaps(dai.address)).borrowCap;

    expect(usdcBorrowCap).to.be.equal(newCap);
    expect(daiBorrowCap).to.be.equal(newCap);
  });
  it('Borrows 100 variable DAI and 100 stable USDC (< BORROW_CAP)', async () => {
    const { usdc, pool, dai, deployer } = testEnv;
    const borrowedAmount = 100;
    const precisionBorrowedAmount = (borrowedAmount * 1000).toString();

    expect(
      await pool.borrow(
        usdc.address,
        await unitParse(usdc, precisionBorrowedAmount),
        1,
        0,
        deployer.address
      )
    );

    expect(
      await pool.borrow(
        dai.address,
        await unitParse(dai, precisionBorrowedAmount),
        2,
        0,
        deployer.address
      )
    );
  });
});
