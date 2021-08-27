import { expect } from 'chai';
import { utils } from 'ethers';
import { DRE, impersonateAccountsHardhat } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';

makeSuite('AToken: Edge cases', (testEnv: TestEnv) => {
  const { CT_INVALID_MINT_AMOUNT, CT_INVALID_BURN_AMOUNT } = ProtocolErrors;

  it('approve()', async () => {
    const { users, aDai } = testEnv;
    await aDai.connect(users[0].signer).approve(users[1].address, MAX_UINT_AMOUNT);
    expect(await aDai.allowance(users[0].address, users[1].address)).to.be.eq(MAX_UINT_AMOUNT);
  });

  it('approve() with a ZERO_ADDRESS spender and reverts', async () => {
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
    await aDai
      .connect(users[1].signer)
      .increaseAllowance(users[0].address, utils.parseUnits('1', 18));
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(
      utils.parseUnits('1', 18)
    );
  });

  it('decreaseAllowance()', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(
      utils.parseUnits('1', 18)
    );
    await aDai
      .connect(users[1].signer)
      .decreaseAllowance(users[0].address, utils.parseUnits('1', 18));
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(0);
  });

  it('transfer() with a ZERO_ADDRESS recipient and reverts', async () => {
    const { users, aDai } = testEnv;
    await expect(aDai.connect(users[1].signer).transfer(ZERO_ADDRESS, 0)).to.be.revertedWith(
      'ERC20: transfer to the zero address'
    );
  });

  it('transfer() with a ZERO_ADDRESS origin and reverts', async () => {
    const { users, aDai } = testEnv;
    await expect(
      aDai.connect(users[1].signer).transferFrom(ZERO_ADDRESS, users[1].address, 0)
    ).to.be.revertedWith('ERC20: transfer from the zero address');
  });

  it('mint() when amountScaled == 0 and reverts', async () => {
    const { deployer, pool, aDai, users } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai.connect(poolSigner).mint(users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_MINT_AMOUNT);
  });

  it('mint() with ZERO_ADDRESS account and reverts', async () => {
    const { deployer, pool, aDai } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai
        .connect(poolSigner)
        .mint(ZERO_ADDRESS, utils.parseUnits('100', 18), utils.parseUnits('1', 27))
    ).to.be.revertedWith('ERC20: mint to the zero address');
  });

  it('burn() when amountScaled == 0 and reverts', async () => {
    const { deployer, pool, aDai, users } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai
        .connect(poolSigner)
        .burn(users[0].address, users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_BURN_AMOUNT);
  });

  it('burn() account == address(0)', async () => {
    const { deployer, pool, aDai, users } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    await expect(
      aDai
        .connect(poolSigner)
        .burn(
          ZERO_ADDRESS,
          users[0].address,
          utils.parseUnits('100', 18),
          utils.parseUnits('1', 27)
        )
    ).to.be.revertedWith('ERC20: burn from the zero address');
  });

  it('mintToTreasury() with amount == 0', async () => {
    const { deployer, pool, aDai } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await DRE.ethers.getSigner(pool.address);

    expect(await aDai.connect(poolSigner).mintToTreasury(0, utils.parseUnits('1', 27)));
  });

  it('Check getters', async () => {
    const { pool, users, dai, aDai } = testEnv;

    expect(await aDai.decimals()).to.be.eq(await dai.decimals());
    expect(await aDai.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await aDai.POOL()).to.be.eq(pool.address);
    expect(await aDai.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    const scaledUserBalanceAndSupplyBefore = await aDai.getScaledUserBalanceAndSupply(
      users[0].address
    );
    expect(scaledUserBalanceAndSupplyBefore[0].toString()).to.be.eq('0');
    expect(scaledUserBalanceAndSupplyBefore[1].toString()).to.be.eq('0');

    await dai.connect(users[0].signer).mint(utils.parseUnits('1000', 18));
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(dai.address, utils.parseUnits('1000', 18), users[0].address, 0);

    const scaledUserBalanceAndSupplyAfter = await aDai.getScaledUserBalanceAndSupply(
      users[0].address
    );
    expect(scaledUserBalanceAndSupplyAfter[0].toString()).to.be.eq(
      utils.parseUnits('1000', 18).toString()
    );
    expect(scaledUserBalanceAndSupplyAfter[1].toString()).to.be.eq(
      utils.parseUnits('1000', 18).toString()
    );
  });
});
