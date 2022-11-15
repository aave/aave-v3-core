import { expect } from 'chai';
import { utils } from 'ethers';
import { impersonateAccountsHardhat, setAutomine, setAutomineEvm } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  evmRevert,
  evmSnapshot,
  getVariableDebtToken,
  increaseTime,
  waitForTx,
} from '@aave/deploy-v3';
import { VariableDebtToken__factory } from '../types';
import './helpers/utils/wadraymath';
import { getVariableDebtTokenEvent } from './helpers/utils/tokenization-events';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('VariableDebtToken', (testEnv: TestEnv) => {
  const {CALLER_MUST_BE_POOL, INVALID_MINT_AMOUNT, INVALID_BURN_AMOUNT, CALLER_NOT_POOL_ADMIN} =
    ProtocolErrors;

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('Check initialization', async () => {
    const {pool, weth, dai, helpersContract, users} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      users[0].signer
    );

    expect(await variableDebtContract.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await variableDebtContract.POOL()).to.be.eq(pool.address);
    expect(await variableDebtContract.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    const scaledUserBalanceAndSupplyUser0Before =
      await variableDebtContract.getScaledUserBalanceAndSupply(users[0].address);
    expect(scaledUserBalanceAndSupplyUser0Before[0]).to.be.eq(0);
    expect(scaledUserBalanceAndSupplyUser0Before[1]).to.be.eq(0);

    // Need to create some debt to do this good
    await dai
      .connect(users[0].signer)
      ['mint(uint256)'](await convertToCurrencyDecimals(dai.address, '1000'));
    await dai.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '1000'),
        users[0].address,
        0
      );
    await weth.connect(users[1].signer)['mint(uint256)'](utils.parseEther('10'));
    await weth.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .deposit(weth.address, utils.parseEther('10'), users[1].address, 0);
    await pool
      .connect(users[1].signer)
      .borrow(
        dai.address,
        await convertToCurrencyDecimals(dai.address, '200'),
        RateMode.Variable,
        0,
        users[1].address
      );

    const scaledUserBalanceAndSupplyUser0After =
      await variableDebtContract.getScaledUserBalanceAndSupply(users[0].address);
    expect(scaledUserBalanceAndSupplyUser0After[0]).to.be.eq(0);
    expect(scaledUserBalanceAndSupplyUser0After[1]).to.be.gt(0);

    const scaledUserBalanceAndSupplyUser1After =
      await variableDebtContract.getScaledUserBalanceAndSupply(users[1].address);
    expect(scaledUserBalanceAndSupplyUser1After[1]).to.be.gt(0);
    expect(scaledUserBalanceAndSupplyUser1After[1]).to.be.gt(0);

    expect(scaledUserBalanceAndSupplyUser0After[1]).to.be.eq(
      scaledUserBalanceAndSupplyUser1After[1]
    );
  });

  it('Tries to mint not being the Pool (revert expected)', async () => {
    const {deployer, dai, helpersContract} = testEnv;

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      deployer.signer
    );

    await expect(
      variableDebtContract.mint(deployer.address, deployer.address, '1', '1')
    ).to.be.revertedWith(CALLER_MUST_BE_POOL);
  });

  it('Tries to burn not being the Pool (revert expected)', async () => {
    const {deployer, dai, helpersContract} = testEnv;

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      deployer.signer
    );

    await expect(variableDebtContract.burn(deployer.address, '1', '1')).to.be.revertedWith(
      CALLER_MUST_BE_POOL
    );
  });

  it('Tries to mint with amountScaled == 0 (revert expected)', async () => {
    const {deployer, pool, dai, helpersContract, users} = testEnv;

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      deployer.signer
    );

    await expect(
      variableDebtContract
        .connect(poolSigner)
        .mint(users[0].address, users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(INVALID_MINT_AMOUNT);
  });

  it('Tries to burn with amountScaled == 0 (revert expected)', async () => {
    const {deployer, pool, dai, helpersContract, users} = testEnv;

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      deployer.signer
    );

    await expect(
      variableDebtContract.connect(poolSigner).burn(users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(INVALID_BURN_AMOUNT);
  });

  it('Tries to transfer debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      variableDebtContract.connect(users[0].signer).transfer(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to approve debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      variableDebtContract.connect(users[0].signer).approve(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
    await expect(
      variableDebtContract.allowance(users[0].address, users[1].address)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to increaseAllowance (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      variableDebtContract.connect(users[0].signer).increaseAllowance(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to decreaseAllowance (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      variableDebtContract.connect(users[0].signer).decreaseAllowance(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to transferFrom debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      variableDebtContract
        .connect(users[0].signer)
        .transferFrom(users[0].address, users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('setIncentivesController() ', async () => {
    const {dai, helpersContract, poolAdmin, aclManager, deployer} = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      deployer.signer
    );

    expect(await aclManager.connect(deployer.signer).addPoolAdmin(poolAdmin.address));

    expect(await variableDebtContract.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);
    expect(
      await variableDebtContract.connect(poolAdmin.signer).setIncentivesController(ZERO_ADDRESS)
    );
    expect(await variableDebtContract.getIncentivesController()).to.be.eq(ZERO_ADDRESS);
  });

  it('setIncentivesController() from not pool admin (revert expected)', async () => {
    const {
      dai,
      helpersContract,
      users: [user],
    } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = VariableDebtToken__factory.connect(
      daiVariableDebtTokenAddress,
      user.signer
    );

    expect(await variableDebtContract.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    await expect(
      variableDebtContract.connect(user.signer).setIncentivesController(ZERO_ADDRESS)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('Check Mint and Transfer events when borrowing on behalf', async () => {
    const {
      pool,
      weth,
      dai,
      users: [user1, user2, user3],
    } = testEnv;

    // Add liquidity
    await dai.connect(user3.signer)['mint(uint256)'](utils.parseUnits('1000', 18));
    await dai.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user3.signer)
      .supply(dai.address, utils.parseUnits('1000', 18), user3.address, 0);

    // User1 supplies 10 WETH
    await weth.connect(user1.signer)['mint(uint256)'](utils.parseUnits('10', 18));
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user1.signer)
      .supply(weth.address, utils.parseUnits('10', 18), user1.address, 0);

    const daiData = await pool.getReserveData(dai.address);
    const variableDebtToken = VariableDebtToken__factory.connect(
      daiData.variableDebtTokenAddress,
      user1.signer
    );
    const beforeDebtBalanceUser2 = await variableDebtToken.balanceOf(user2.address);

    // User1 borrows 100 DAI
    const borrowAmount = utils.parseUnits('100', 18);
    expect(
      await pool
        .connect(user1.signer)
        .borrow(dai.address, borrowAmount, RateMode.Variable, 0, user1.address)
    );

    // User1 approves user2 to borrow 1000 DAI
    expect(
      await variableDebtToken
        .connect(user1.signer)
        .approveDelegation(user2.address, utils.parseUnits('1000', 18))
    );

    // Increase time so interests accrue
    await increaseTime(24 * 3600);

    const previousIndexUser1Before = await variableDebtToken.getPreviousIndex(user1.address);
    const previousIndexUser2Before = await variableDebtToken.getPreviousIndex(user2.address);

    // User2 borrows 100 DAI on behalf of user1
    const borrowOnBehalfAmount = utils.parseUnits('100', 18);
    const tx = await waitForTx(
      await pool
        .connect(user2.signer)
        .borrow(dai.address, borrowOnBehalfAmount, RateMode.Variable, 0, user1.address)
    );

    const previousIndexUser1After = await variableDebtToken.getPreviousIndex(user1.address);
    const previousIndexUser2After = await variableDebtToken.getPreviousIndex(user2.address);

    // User2 index should be the same
    expect(previousIndexUser1Before).to.be.not.eq(previousIndexUser1After);
    expect(previousIndexUser2Before).to.be.eq(previousIndexUser2After);

    const afterDebtBalanceUser1 = await variableDebtToken.balanceOf(user1.address);

    const interest = afterDebtBalanceUser1.sub(borrowAmount).sub(borrowOnBehalfAmount);

    const parsedTransferEvents = getVariableDebtTokenEvent(variableDebtToken, tx, 'Transfer');
    const transferAmount = parsedTransferEvents[0].value;
    expect(transferAmount).to.be.closeTo(borrowOnBehalfAmount.add(interest), 2);

    const parsedMintEvents = getVariableDebtTokenEvent(variableDebtToken, tx, 'Mint');
    expect(parsedMintEvents[0].value).to.be.closeTo(borrowOnBehalfAmount.add(interest), 2);
    expect(parsedMintEvents[0].balanceIncrease).to.be.closeTo(interest, 2);
  });

  it('User borrows and repays in same block with zero fees', async () => {
    const {pool, users, dai, aDai, usdc, variableDebtDai} = testEnv;
    const user = users[0];

    // We need some debt.
    await usdc.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await usdc.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user.signer)
      .deposit(usdc.address, utils.parseEther('2000'), user.address, 0);
    await dai.connect(user.signer)['mint(uint256)'](utils.parseEther('2000'));
    await dai.connect(user.signer).transfer(aDai.address, utils.parseEther('2000'));
    await dai.connect(user.signer).approve(pool.address, MAX_UINT_AMOUNT);

    const userDataBefore = await pool.getUserAccountData(user.address);
    expect(await variableDebtDai.balanceOf(user.address)).to.be.eq(0);

    // Turn off automining - pretty sure that coverage is getting messed up here.
    await setAutomine(false);
    // Borrow 500 dai
    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Variable, 0, user.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);
    expect(
      await pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('500'), RateMode.Variable, user.address)
    );

    expect(await variableDebtDai.balanceOf(user.address)).to.be.eq(0);
    expect(await dai.balanceOf(user.address)).to.be.eq(0);
    expect(await dai.balanceOf(aDai.address)).to.be.eq(utils.parseEther('2000'));

    const userDataAfter = await pool.getUserAccountData(user.address);
    expect(userDataBefore.totalCollateralBase).to.be.lte(userDataAfter.totalCollateralBase);
    expect(userDataBefore.healthFactor).to.be.lte(userDataAfter.healthFactor);
    expect(userDataBefore.totalDebtBase).to.be.eq(userDataAfter.totalDebtBase);
  });

  it('User borrows and repays in same block using credit delegation with zero fees', async () => {
    const {
      pool,
      dai,
      aDai,
      weth,
      users: [user1, user2, user3],
    } = testEnv;

    // Add liquidity
    await dai.connect(user3.signer)['mint(uint256)'](utils.parseUnits('1000', 18));
    await dai.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user3.signer)
      .supply(dai.address, utils.parseUnits('1000', 18), user3.address, 0);

    // User1 supplies 10 WETH
    await dai.connect(user1.signer)['mint(uint256)'](utils.parseUnits('100', 18));
    await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user1.signer)['mint(uint256)'](utils.parseUnits('10', 18));
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user1.signer)
      .supply(weth.address, utils.parseUnits('10', 18), user1.address, 0);

    const daiData = await pool.getReserveData(dai.address);
    const variableDebtToken = await getVariableDebtToken(daiData.variableDebtTokenAddress);

    // User1 approves User2 to borrow 1000 DAI
    expect(
      await variableDebtToken
        .connect(user1.signer)
        .approveDelegation(user2.address, utils.parseUnits('1000', 18))
    );

    const userDataBefore = await pool.getUserAccountData(user1.address);

    // Turn off automining to simulate actions in same block
    await setAutomine(false);

    // User2 borrows 2 DAI on behalf of User1
    await pool
      .connect(user2.signer)
      .borrow(dai.address, utils.parseEther('2'), RateMode.Variable, 0, user1.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);

    expect(
      await pool
        .connect(user1.signer)
        .repay(dai.address, utils.parseEther('2'), RateMode.Variable, user1.address)
    );

    expect(await variableDebtToken.balanceOf(user1.address)).to.be.eq(0);
    expect(await dai.balanceOf(user2.address)).to.be.eq(utils.parseEther('2'));
    expect(await dai.balanceOf(aDai.address)).to.be.eq(utils.parseEther('1000'));

    const userDataAfter = await pool.getUserAccountData(user1.address);
    expect(userDataBefore.totalCollateralBase).to.be.lte(userDataAfter.totalCollateralBase);
    expect(userDataBefore.healthFactor).to.be.lte(userDataAfter.healthFactor);
    expect(userDataBefore.totalDebtBase).to.be.eq(userDataAfter.totalDebtBase);
  });

  it('User borrows and repays in same block using credit delegation with zero fees', async () => {
    const {
      pool,
      dai,
      aDai,
      weth,
      users: [user1, user2, user3],
    } = testEnv;

    // Add liquidity
    await dai.connect(user3.signer)['mint(uint256)'](utils.parseUnits('1000', 18));
    await dai.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user3.signer)
      .supply(dai.address, utils.parseUnits('1000', 18), user3.address, 0);

    // User1 supplies 10 WETH
    await dai.connect(user1.signer)['mint(uint256)'](utils.parseUnits('100', 18));
    await dai.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await weth.connect(user1.signer)['mint(uint256)'](utils.parseUnits('10', 18));
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user1.signer)
      .supply(weth.address, utils.parseUnits('10', 18), user1.address, 0);

    const daiData = await pool.getReserveData(dai.address);
    const variableDebtToken = await getVariableDebtToken(daiData.variableDebtTokenAddress);

    // User1 approves User2 to borrow 1000 DAI
    expect(
      await variableDebtToken
        .connect(user1.signer)
        .approveDelegation(user2.address, utils.parseUnits('1000', 18))
    );

    const userDataBefore = await pool.getUserAccountData(user1.address);

    // Turn off automining to simulate actions in same block
    await setAutomine(false);

    // User2 borrows 2 DAI on behalf of User1
    await pool
      .connect(user2.signer)
      .borrow(dai.address, utils.parseEther('2'), RateMode.Variable, 0, user1.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);

    expect(
      await pool
        .connect(user1.signer)
        .repay(dai.address, utils.parseEther('2'), RateMode.Variable, user1.address)
    );

    expect(await variableDebtToken.balanceOf(user1.address)).to.be.eq(0);
    expect(await dai.balanceOf(user2.address)).to.be.eq(utils.parseEther('2'));
    expect(await dai.balanceOf(aDai.address)).to.be.eq(utils.parseEther('1000'));

    const userDataAfter = await pool.getUserAccountData(user1.address);
    expect(userDataBefore.totalCollateralBase).to.be.lte(userDataAfter.totalCollateralBase);
    expect(userDataBefore.healthFactor).to.be.lte(userDataAfter.healthFactor);
    expect(userDataBefore.totalDebtBase).to.be.eq(userDataAfter.totalDebtBase);
  });
});
