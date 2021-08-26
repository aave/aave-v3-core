import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { expect } from 'chai';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { DRE, impersonateAccountsHardhat } from '../helpers/misc-utils';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { SelfdestructTransfer, SelfdestructTransferFactory } from '../types';

makeSuite('Atoken-logic: edge cases', (testEnv: TestEnv) => {
  const { VL_NO_ACTIVE_RESERVE, CT_INVALID_MINT_AMOUNT, CT_INVALID_BURN_AMOUNT } = ProtocolErrors;

  it('approve()', async () => {
    const { users, aDai } = testEnv;
    await aDai.connect(users[0].signer).approve(users[1].address, MAX_UINT_AMOUNT);
    expect(await aDai.allowance(users[0].address, users[1].address)).to.be.eq(MAX_UINT_AMOUNT);
  });

  it('approve() spender == address(0)', async () => {
    const { users, aDai } = testEnv;
    await expect(
      aDai.connect(users[0].signer).approve(ZERO_ADDRESS, MAX_UINT_AMOUNT)
    ).to.be.revertedWith('ERC20: approve to the zero address');
  });

  it('transferFrom()', async () => {
    const { users, aDai } = testEnv;
    await aDai.connect(users[1].signer).transferFrom(users[0].address, users[1].address, 0);
  });

  it('increaseAllowance()', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(0);
    await aDai.connect(users[1].signer).increaseAllowance(users[0].address, parseUnits('1', 18));
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(parseUnits('1', 18));
  });

  it('decreaseAllowance()', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(parseUnits('1', 18));
    await aDai.connect(users[1].signer).decreaseAllowance(users[0].address, parseUnits('1', 18));
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(0);
  });

  it('transfer() to == address(0)', async () => {
    const { users, aDai } = testEnv;
    await expect(aDai.connect(users[1].signer).transfer(ZERO_ADDRESS, 0)).to.be.revertedWith(
      'ERC20: transfer to the zero address'
    );
  });

  it('transfer() from == address(0)', async () => {
    const { users, aDai } = testEnv;
    await expect(
      aDai.connect(users[1].signer).transferFrom(ZERO_ADDRESS, users[1].address, 0)
    ).to.be.revertedWith('ERC20: transfer from the zero address');
  });

  it('mint() amountScaled == 0', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai.connect(poolSigner).mint(users[0].address, 0, parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_MINT_AMOUNT);
  });

  it('mint() account == address(0)', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai.connect(poolSigner).mint(ZERO_ADDRESS, parseUnits('100', 18), parseUnits('1', 27))
    ).to.be.revertedWith('ERC20: mint to the zero address');
  });

  it('burn() amountScaled == 0', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai.connect(poolSigner).burn(users[0].address, users[0].address, 0, parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_BURN_AMOUNT);
  });

  it('burn() account == address(0)', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai
        .connect(poolSigner)
        .burn(ZERO_ADDRESS, users[0].address, parseUnits('100', 18), parseUnits('1', 27))
    ).to.be.revertedWith('ERC20: burn from the zero address');
  });

  it('mintToTreasury() amount == 0', async () => {
    const { deployer, pool, weth, dai, aDai, helpersContract, users } = testEnv;
    // We can impersonate
    const sdtFactory = new SelfdestructTransferFactory(deployer.signer); // DRE.ethers.getContractFactory('SelfDestructTransfer', deployer.signer);
    const sdt = (await sdtFactory.deploy()) as SelfdestructTransfer;
    await sdt.deployed();

    await sdt.destroyAndTransfer(pool.address, { value: parseEther('1') });

    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await aDai.connect(poolSigner).mintToTreasury(0, parseUnits('1', 27));
  });

  it('Check getters', async () => {
    const { pool, users, dai, aDai, weth, oracle } = testEnv;

    expect(await aDai.decimals()).to.be.eq(await dai.decimals());
    expect(await aDai.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await aDai.POOL()).to.be.eq(pool.address);
    expect(await aDai.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    const scaledUserBalanceAndSupplyBefore = await aDai.getScaledUserBalanceAndSupply(
      users[0].address
    );
    expect(scaledUserBalanceAndSupplyBefore[0].toString()).to.be.eq('0');
    expect(scaledUserBalanceAndSupplyBefore[1].toString()).to.be.eq('0');

    await dai.connect(users[0].signer).mint(parseUnits('1000', 18));
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, parseUnits('1000', 18), users[0].address, 0);

    const scaledUserBalanceAndSupplyAfter = await aDai.getScaledUserBalanceAndSupply(
      users[0].address
    );
    expect(scaledUserBalanceAndSupplyAfter[0].toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
    expect(scaledUserBalanceAndSupplyAfter[1].toString()).to.be.eq(
      parseUnits('1000', 18).toString()
    );
  });
});
