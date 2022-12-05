import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { MAX_UINT_AMOUNT, RAY, ZERO_ADDRESS } from '../helpers/constants';
import { impersonateAccountsHardhat, setAutomine, setAutomineEvm } from '../helpers/misc-utils';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { evmRevert, evmSnapshot, getStableDebtToken, increaseTime, waitForTx } from '@aave/deploy-v3';
import { StableDebtToken__factory } from '../types';
import { getStableDebtTokenEvent } from './helpers/utils/tokenization-events';
declare var hre: HardhatRuntimeEnvironment;

makeSuite('StableDebtToken', (testEnv: TestEnv) => {
  const {CALLER_MUST_BE_POOL, CALLER_NOT_POOL_ADMIN} = ProtocolErrors;

  let snap: string;

  beforeEach(async () => {
    snap = await evmSnapshot();
  });
  afterEach(async () => {
    await evmRevert(snap);
  });

  it('Check initialization', async () => {
    const {pool, weth, dai, helpersContract, users} = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      users[0].signer
    );

    expect(await stableDebtContract.UNDERLYING_ASSET_ADDRESS()).to.be.eq(dai.address);
    expect(await stableDebtContract.POOL()).to.be.eq(pool.address);
    expect(await stableDebtContract.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    const totSupplyAndRateBefore = await stableDebtContract.getTotalSupplyAndAvgRate();
    expect(totSupplyAndRateBefore[0].toString()).to.be.eq('0');
    expect(totSupplyAndRateBefore[1].toString()).to.be.eq('0');

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
        RateMode.Stable,
        0,
        users[1].address
      );

    const totSupplyAndRateAfter = await stableDebtContract.getTotalSupplyAndAvgRate();
    expect(totSupplyAndRateAfter[0]).to.be.gt(0);
    expect(totSupplyAndRateAfter[1]).to.be.gt(0);
  });

  it('Tries to mint not being the Pool (revert expected)', async () => {
    const {deployer, dai, helpersContract} = testEnv;

    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;

    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      deployer.signer
    );

    await expect(
      stableDebtContract.mint(deployer.address, deployer.address, '1', '1')
    ).to.be.revertedWith(CALLER_MUST_BE_POOL);
  });

  it('Tries to burn not being the Pool (revert expected)', async () => {
    const {deployer, dai, helpersContract} = testEnv;

    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;

    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      deployer.signer
    );

    const name = await stableDebtContract.name();

    expect(name).to.be.equal('Aave Testnet Stable Debt DAI');
    await expect(stableDebtContract.burn(deployer.address, '1')).to.be.revertedWith(
      CALLER_MUST_BE_POOL
    );
  });

  it('Tries to transfer debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      stableDebtContract.connect(users[0].signer).transfer(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Check Mint and Transfer events when borrowing on behalf', async () => {
    // const snapId = await evmSnapshot();
    const {
      pool,
      weth,
      dai,
      usdc,
      users: [user1, user2, user3],
    } = testEnv;

    // Add USDC liquidity
    await usdc.connect(user3.signer)['mint(uint256)'](utils.parseUnits('1000', 6));
    await usdc.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user3.signer)
      .supply(usdc.address, utils.parseUnits('1000', 6), user3.address, 0);

    // User1 supplies 10 WETH
    await weth.connect(user1.signer)['mint(uint256)'](utils.parseUnits('10', 18));
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(user1.signer)
      .supply(weth.address, utils.parseUnits('10', 18), user1.address, 0);

    const usdcData = await pool.getReserveData(usdc.address);
    const stableDebtToken = StableDebtToken__factory.connect(
      usdcData.stableDebtTokenAddress,
      user1.signer
    );
    const beforeDebtBalanceUser2 = await stableDebtToken.balanceOf(user2.address);

    // User1 borrows 100 USDC
    const borrowAmount = utils.parseUnits('100', 6);
    expect(
      await pool
        .connect(user1.signer)
        .borrow(usdc.address, borrowAmount, RateMode.Stable, 0, user1.address)
    );

    // User1 approves user2 to borrow 1000 USDC
    expect(
      await stableDebtToken
        .connect(user1.signer)
        .approveDelegation(user2.address, utils.parseUnits('1000', 6))
    );

    // Increase time so interests accrue
    await increaseTime(24 * 3600);

    // User2 borrows 1000 USDC on behalf of user1
    const borrowOnBehalfAmount = utils.parseUnits('100', 6);
    const tx = await waitForTx(
      await pool
        .connect(user2.signer)
        .borrow(usdc.address, borrowOnBehalfAmount, RateMode.Stable, 0, user1.address)
    );

    const afterDebtBalanceUser1 = await stableDebtToken.balanceOf(user1.address);
    const afterDebtBalanceUser2 = await stableDebtToken.balanceOf(user2.address);

    // Calculate interests
    const expectedDebtIncreaseUser1 = afterDebtBalanceUser1.sub(
      borrowOnBehalfAmount.add(borrowAmount)
    );

    const parsedTransferEvents = getStableDebtTokenEvent(stableDebtToken, tx, 'Transfer');
    const transferAmount = parsedTransferEvents[0].value;

    const parsedMintEvents = getStableDebtTokenEvent(stableDebtToken, tx, 'Mint');
    const { amount: mintAmount, balanceIncrease } = parsedMintEvents[0];

    expect(expectedDebtIncreaseUser1.add(borrowOnBehalfAmount)).to.be.eq(transferAmount);
    expect(borrowOnBehalfAmount.add(balanceIncrease)).to.be.eq(mintAmount);
    expect(expectedDebtIncreaseUser1).to.be.eq(balanceIncrease);
    expect(afterDebtBalanceUser2).to.be.eq(beforeDebtBalanceUser2);

    // await evmRevert(snapId);
  });

  it('Tries to approve debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      stableDebtContract.connect(users[0].signer).approve(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
    await expect(
      stableDebtContract.allowance(users[0].address, users[1].address)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to increase allowance of debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      stableDebtContract.connect(users[0].signer).increaseAllowance(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to decrease allowance of debt tokens (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      stableDebtContract.connect(users[0].signer).decreaseAllowance(users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Tries to transferFrom (revert expected)', async () => {
    const {users, dai, helpersContract} = testEnv;
    const daiStableDebtTokenAddress = (await helpersContract.getReserveTokensAddresses(dai.address))
      .stableDebtTokenAddress;
    const stableDebtContract = StableDebtToken__factory.connect(
      daiStableDebtTokenAddress,
      users[0].signer
    );

    await expect(
      stableDebtContract
        .connect(users[0].signer)
        .transferFrom(users[0].address, users[1].address, 500)
    ).to.be.revertedWith(ProtocolErrors.OPERATION_NOT_SUPPORTED);
  });

  it('Burn stable debt tokens such that `secondTerm >= firstTerm`', async () => {
    // To enter the case where secondTerm >= firstTerm, we also need previousSupply <= amount.
    // The easiest way is to use two users, such that for user 2 his stableRate > average stableRate.
    // In practice to enter the case we can perform the following actions
    // user 1 borrow 2 wei at rate = 10**27
    // user 2 borrow 1 wei rate = 10**30
    // progress time by a year, to accrue significant debt.
    // then let user 2 withdraw sufficient funds such that secondTerm (userStableRate * burnAmount) >= averageRate * supply
    // if we do not have user 1 deposit as well, we will have issues getting past previousSupply <= amount, as amount > supply for secondTerm to be > firstTerm.
    // await evmRevert(snap);
    const rateGuess1 = BigNumber.from(RAY);
    const rateGuess2 = BigNumber.from(10).pow(30);
    const amount1 = BigNumber.from(2);
    const amount2 = BigNumber.from(1);

    const {deployer, pool, dai, helpersContract, users} = testEnv;

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const config = await helpersContract.getReserveTokensAddresses(dai.address);
    const stableDebt = StableDebtToken__factory.connect(
      config.stableDebtTokenAddress,
      deployer.signer
    );

    // Next two txs should be mined in the same block
    await setAutomine(false);
    await stableDebt
      .connect(poolSigner)
      .mint(users[0].address, users[0].address, amount1, rateGuess1);

    await stableDebt
      .connect(poolSigner)
      .mint(users[1].address, users[1].address, amount2, rateGuess2);
    await setAutomine(true);

    await increaseTime(60 * 60 * 24 * 365);
    const totalSupplyAfterTime = BigNumber.from(18798191);
    await stableDebt.connect(poolSigner).burn(users[1].address, totalSupplyAfterTime.sub(1));
  });

  it('setIncentivesController() ', async () => {
    // const snapshot = await evmSnapshot();
    const {dai, helpersContract, poolAdmin, aclManager, deployer} = testEnv;
    const config = await helpersContract.getReserveTokensAddresses(dai.address);
    const stableDebt = StableDebtToken__factory.connect(
      config.stableDebtTokenAddress,
      deployer.signer
    );

    expect(await aclManager.connect(deployer.signer).addPoolAdmin(poolAdmin.address));

    expect(await stableDebt.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);
    expect(await stableDebt.connect(poolAdmin.signer).setIncentivesController(ZERO_ADDRESS));
    expect(await stableDebt.getIncentivesController()).to.be.eq(ZERO_ADDRESS);

    // await evmRevert(snapshot);
  });

  it('setIncentivesController() from not pool admin (revert expected)', async () => {
    const {
      dai,
      helpersContract,
      users: [user],
    } = testEnv;
    const config = await helpersContract.getReserveTokensAddresses(dai.address);
    const stableDebt = StableDebtToken__factory.connect(config.stableDebtTokenAddress, user.signer);

    expect(await stableDebt.getIncentivesController()).to.not.be.eq(ZERO_ADDRESS);

    await expect(
      stableDebt.connect(user.signer).setIncentivesController(ZERO_ADDRESS)
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('User borrows and repays in same block with zero fees', async () => {
    const {pool, users, dai, aDai, usdc, stableDebtDai} = testEnv;
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
    expect(await stableDebtDai.balanceOf(user.address)).to.be.eq(0);

    // Turn off automining - pretty sure that coverage is getting messed up here.
    await setAutomine(false);
    // Borrow 500 dai
    await pool
      .connect(user.signer)
      .borrow(dai.address, utils.parseEther('500'), RateMode.Stable, 0, user.address);

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);
    expect(
      await pool
        .connect(user.signer)
        .repay(dai.address, utils.parseEther('500'), RateMode.Stable, user.address)
    );

    expect(await stableDebtDai.balanceOf(user.address)).to.be.eq(0);
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
    const stableDebtToken = await getStableDebtToken(daiData.stableDebtTokenAddress);

    // User1 approves User2 to borrow 1000 DAI
    expect(
      await stableDebtToken
        .connect(user1.signer)
        .approveDelegation(user2.address, utils.parseUnits('1000', 18))
    );
    const userDataBefore = await pool.getUserAccountData(user1.address);

    // Turn off automining to simulate actions in same block
    await setAutomine(false);

    // User2 borrows 2 DAI on behalf of User1
    expect(
      await pool
        .connect(user2.signer)
        .borrow(dai.address, utils.parseEther('2'), RateMode.Stable, 0, user1.address)
    );

    // Turn on automining, but not mine a new block until next tx
    await setAutomineEvm(true);

    expect(
      await pool
        .connect(user1.signer)
        .repay(dai.address, utils.parseEther('2'), RateMode.Stable, user1.address)
    );

    expect(await stableDebtToken.balanceOf(user1.address)).to.be.eq(0);
    expect(await dai.balanceOf(user2.address)).to.be.eq(utils.parseEther('2'));
    expect(await dai.balanceOf(aDai.address)).to.be.eq(utils.parseEther('1000'));

    const userDataAfter = await pool.getUserAccountData(user1.address);
    expect(userDataBefore.totalCollateralBase).to.be.lte(userDataAfter.totalCollateralBase);
    expect(userDataBefore.healthFactor).to.be.lte(userDataAfter.healthFactor);
    expect(userDataBefore.totalDebtBase).to.be.eq(userDataAfter.totalDebtBase);
  });
});
