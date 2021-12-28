import { expect } from 'chai';
import { utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { evmRevert, evmSnapshot, waitForTx } from '@aave/deploy-v3';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('AToken: Edge cases', (testEnv: TestEnv) => {
  const {
    INVALID_MINT_AMOUNT,
    INVALID_BURN_AMOUNT,
    SAFECAST_UINT128_OVERFLOW,
    CALLER_NOT_POOL_ADMIN,
  } = ProtocolErrors;

  it('Check getters', async () => {
    const { pool, users, dai, aDai } = testEnv;

    expect(await aDai.decimals()).to.be.eq(await dai.decimals());
    expect(await aDai.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await aDai.POOL()).to.be.eq(pool.address);
    expect(await aDai.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    const scaledUserBalanceAndSupplyBefore = await aDai.getScaledUserBalanceAndSupply(
      users[0].address
    );
    expect(scaledUserBalanceAndSupplyBefore[0]).to.be.eq(0);
    expect(scaledUserBalanceAndSupplyBefore[1]).to.be.eq(0);

    await waitForTx(
      await dai
        .connect(users[0].signer)
        ['mint(address,uint256)'](
          users[0].address,
          await convertToCurrencyDecimals(dai.address, '1000')
        )
    );
    await waitForTx(await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT));
    await waitForTx(
      await pool
        .connect(users[0].signer)
        .deposit(
          dai.address,
          await convertToCurrencyDecimals(dai.address, '1000'),
          users[0].address,
          0
        )
    );
    const scaledUserBalanceAndSupplyAfter = await aDai.getScaledUserBalanceAndSupply(
      users[0].address
    );
    expect(scaledUserBalanceAndSupplyAfter[0]).to.be.eq(
      await convertToCurrencyDecimals(aDai.address, '1000')
    );
    expect(scaledUserBalanceAndSupplyAfter[1]).to.be.eq(
      await convertToCurrencyDecimals(aDai.address, '1000')
    );
  });

  it('approve()', async () => {
    const { users, aDai } = testEnv;
    await aDai.connect(users[0].signer).approve(users[1].address, MAX_UINT_AMOUNT);
    expect(await aDai.allowance(users[0].address, users[1].address)).to.be.eq(MAX_UINT_AMOUNT);
  });

  it('approve() with a ZERO_ADDRESS spender', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.connect(users[0].signer).approve(ZERO_ADDRESS, MAX_UINT_AMOUNT))
      .to.emit(aDai, 'Approval')
      .withArgs(users[0].address, ZERO_ADDRESS, MAX_UINT_AMOUNT);
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
      .increaseAllowance(users[0].address, await convertToCurrencyDecimals(aDai.address, '1'));
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(
      await convertToCurrencyDecimals(aDai.address, '1')
    );
  });

  it('decreaseAllowance()', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(
      await convertToCurrencyDecimals(aDai.address, '1')
    );
    await aDai
      .connect(users[1].signer)
      .decreaseAllowance(users[0].address, await convertToCurrencyDecimals(aDai.address, '1'));
    expect(await aDai.allowance(users[1].address, users[0].address)).to.be.eq(0);
  });

  it('transfer() with a ZERO_ADDRESS recipient', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.connect(users[1].signer).transfer(ZERO_ADDRESS, 0))
      .to.emit(aDai, 'Transfer')
      .withArgs(users[1].address, ZERO_ADDRESS, 0);
  });

  it('transfer() with a ZERO_ADDRESS origin', async () => {
    const { users, aDai } = testEnv;
    expect(await aDai.connect(users[1].signer).transferFrom(ZERO_ADDRESS, users[1].address, 0))
      .to.emit(aDai, 'Transfer')
      .withArgs(ZERO_ADDRESS, users[1].address, 0);
  });

  it('mint() when amountScaled == 0 (revert expected)', async () => {
    const { deployer, pool, aDai, users } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    await expect(
      aDai
        .connect(poolSigner)
        .mint(users[0].address, users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(INVALID_MINT_AMOUNT);
  });

  it('mint() to a ZERO_ADDRESS account', async () => {
    const { deployer, pool, aDai } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const mintingAmount = await convertToCurrencyDecimals(aDai.address, '100');
    expect(
      aDai
        .connect(poolSigner)
        .mint(ZERO_ADDRESS, ZERO_ADDRESS, mintingAmount, utils.parseUnits('1', 27))
    )
      .to.emit(aDai, 'Transfer')
      .withArgs(ZERO_ADDRESS, ZERO_ADDRESS, mintingAmount);
  });

  it('burn() when amountScaled == 0 (revert expected)', async () => {
    const { deployer, pool, aDai, users } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    await expect(
      aDai
        .connect(poolSigner)
        .burn(users[0].address, users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(INVALID_BURN_AMOUNT);
  });

  it('burn() of a ZERO_ADDRESS account (revert expected)', async () => {
    const { deployer, pool, aDai, users } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const burnAmount = await convertToCurrencyDecimals(aDai.address, '100');
    expect(
      await aDai
        .connect(poolSigner)
        .burn(ZERO_ADDRESS, users[0].address, burnAmount, utils.parseUnits('1', 27))
    )
      .to.emit(aDai, 'Transfer')
      .withArgs(ZERO_ADDRESS, ZERO_ADDRESS, burnAmount);
  });

  it('mintToTreasury() with amount == 0', async () => {
    const { deployer, pool, aDai } = testEnv;

    // Impersonate Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    expect(await aDai.connect(poolSigner).mintToTreasury(0, utils.parseUnits('1', 27)));
  });

  it('setIncentivesController() ', async () => {
    const snapshot = await evmSnapshot();
    const { deployer, poolAdmin, aWETH, aclManager } = testEnv;

    expect(await aclManager.connect(deployer.signer).addPoolAdmin(poolAdmin.address));

    expect(await aWETH.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);
    expect(await aWETH.connect(poolAdmin.signer).setIncentivesController(ZERO_ADDRESS));
    expect(await aWETH.getIncentivesController()).to.be.eq(ZERO_ADDRESS);

    await evmRevert(snapshot);
  });

  it('setIncentivesController() from not pool admin (revert expected)', async () => {
    const {
      users: [user],
      aWETH,
    } = testEnv;

    expect(await aWETH.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    await expect(
      aWETH.connect(user.signer).setIncentivesController(ZERO_ADDRESS)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('transfer() amount > MAX_UINT_128', async () => {
    const {
      aDai,
      users: [depositor, borrower],
    } = testEnv;

    expect(aDai.transfer(borrower.address, MAX_UINT_AMOUNT)).to.be.revertedWith(
      SAFECAST_UINT128_OVERFLOW
    );
  });

  it('setIncentivesController() ', async () => {
    const snapshot = await evmSnapshot();
    const { deployer, poolAdmin, aWETH, aclManager } = testEnv;

    expect(await aclManager.connect(deployer.signer).addPoolAdmin(poolAdmin.address));

    expect(await aWETH.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);
    expect(await aWETH.connect(poolAdmin.signer).setIncentivesController(ZERO_ADDRESS));
    expect(await aWETH.getIncentivesController()).to.be.eq(ZERO_ADDRESS);

    await evmRevert(snapshot);
  });

  it('setIncentivesController() from not pool admin (revert expected)', async () => {
    const {
      users: [user],
      aWETH,
    } = testEnv;

    expect(await aWETH.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    await expect(
      aWETH.connect(user.signer).setIncentivesController(ZERO_ADDRESS)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });
});
