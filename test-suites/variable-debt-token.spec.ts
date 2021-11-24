import { expect } from 'chai';
import { utils } from 'ethers';
import { impersonateAccountsHardhat } from '../helpers/misc-utils';
import { getVariableDebtToken } from '@aave/deploy-v3/dist/helpers/contract-getters';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors, RateMode } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { topUpNonPayableWithEther } from './helpers/utils/funds';
import { convertToCurrencyDecimals } from '../helpers/contracts-helpers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  evmRevert,
  evmSnapshot,
  increaseTime,
  VariableDebtToken__factory,
  waitForTx,
} from '@aave/deploy-v3';
import { parseUnits } from '@ethersproject/units';
import './helpers/utils/wadraymath';
import { parseTransaction } from 'ethers/lib/utils';

declare var hre: HardhatRuntimeEnvironment;

makeSuite('VariableDebtToken', (testEnv: TestEnv) => {
  const { CT_CALLER_MUST_BE_POOL, CT_INVALID_MINT_AMOUNT, CT_INVALID_BURN_AMOUNT } = ProtocolErrors;

  it('Check initialization', async () => {
    const { pool, weth, dai, helpersContract, users } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

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
    const { deployer, dai, helpersContract } = testEnv;

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.mint(deployer.address, deployer.address, '1', '1')
    ).to.be.revertedWith(CT_CALLER_MUST_BE_POOL);
  });

  it('Tries to burn not being the Pool (revert expected)', async () => {
    const { deployer, dai, helpersContract } = testEnv;

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(variableDebtContract.burn(deployer.address, '1', '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_POOL
    );
  });

  it('Tries to mint with amountScaled == 0 (revert expected)', async () => {
    const { deployer, pool, dai, helpersContract, users } = testEnv;

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract
        .connect(poolSigner)
        .mint(users[0].address, users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_MINT_AMOUNT);
  });

  it('Tries to burn with amountScaled == 0 (revert expected)', async () => {
    const { deployer, pool, dai, helpersContract, users } = testEnv;

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(poolSigner).burn(users[0].address, 0, utils.parseUnits('1', 27))
    ).to.be.revertedWith(CT_INVALID_BURN_AMOUNT);
  });

  it('Tries to transfer debt tokens (revert expected)', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).transfer(users[1].address, 500)
    ).to.be.revertedWith('TRANSFER_NOT_SUPPORTED');
  });

  it('Tries to approve debt tokens (revert expected)', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).approve(users[1].address, 500)
    ).to.be.revertedWith('APPROVAL_NOT_SUPPORTED');
    await expect(
      variableDebtContract.allowance(users[0].address, users[1].address)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('Tries to increaseAllowance (revert expected)', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).increaseAllowance(users[1].address, 500)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('Tries to decreaseAllowance (revert expected)', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract.connect(users[0].signer).decreaseAllowance(users[1].address, 500)
    ).to.be.revertedWith('ALLOWANCE_NOT_SUPPORTED');
  });

  it('Tries to transferFrom debt tokens (revert expected)', async () => {
    const { users, dai, helpersContract } = testEnv;
    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;
    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    await expect(
      variableDebtContract
        .connect(users[0].signer)
        .transferFrom(users[0].address, users[1].address, 500)
    ).to.be.revertedWith('TRANSFER_NOT_SUPPORTED');
  });

  it.only('Check mint and transfer events when borrowing on behalf', async () => {
    const snapId = await evmSnapshot();
    const {
      pool,
      weth,
      dai,
      users: [user1, user2, user3],
    } = testEnv;

    await dai.connect(user3.signer)['mint(uint256)'](parseUnits('1000', 18));
    await dai.connect(user3.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user3.signer).supply(dai.address, parseUnits('1000', 18), user3.address, 0);

    await weth.connect(user1.signer)['mint(uint256)'](parseUnits('10', 18));
    await weth.connect(user1.signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool.connect(user1.signer).supply(weth.address, parseUnits('10', 18), user1.address, 0);

    const borrowAmount = parseUnits('100', 18);
    await pool
      .connect(user1.signer)
      .borrow(dai.address, borrowAmount, RateMode.Variable, 0, user1.address);

    const daiData = await pool.getReserveData(dai.address);

    const variableDebtToken = VariableDebtToken__factory.connect(
      daiData.variableDebtTokenAddress,
      user1.signer
    );

    await variableDebtToken
      .connect(user1.signer)
      .approveDelegation(user2.address, parseUnits('1000', 18));

    await increaseTime(24 * 3600);

    const borrowOnBehalfAmount = parseUnits('100', 18);

    const tx = await waitForTx(
      await pool
        .connect(user2.signer)
        .borrow(dai.address, borrowOnBehalfAmount, RateMode.Variable, 0, user1.address)
    );

    const expectedIncrease = (await variableDebtToken.balanceOf(user1.address)).sub(
      borrowOnBehalfAmount.add(borrowAmount)
    );

    const transferEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Transfer(address,address,uint256)')
    );
    const rawTransferEvents = tx.logs.filter(
      (log) => log.topics[0] === transferEventSignature && log.address == variableDebtToken.address
    );
    const parsedTransferEvent = variableDebtToken.interface.parseLog(rawTransferEvents[0]);

    const mintEventSignature = utils.keccak256(
      utils.toUtf8Bytes('Mint(address,address,uint256,uint256)')
    );
    const rawMintEvents = tx.logs.filter(
      (log) => log.topics[0] === mintEventSignature && log.address == variableDebtToken.address
    );
    const parsedMintEvent = variableDebtToken.interface.parseLog(rawMintEvents[0]);

    expect(expectedIncrease.add(borrowOnBehalfAmount)).to.be.eq(parsedTransferEvent.args.value);
    expect(expectedIncrease.add(borrowOnBehalfAmount)).to.be.eq(parsedMintEvent.args.value);

    await evmRevert(snapId);
  });

  it.only('Pool mints 10 debtTokens to a user (with ongoing borrowing)', async () => {
    const { deployer, pool, weth, dai, helpersContract, users } = testEnv;

    const snapId = await evmSnapshot();
    // User2 supplies DAI
    await dai.connect(users[2].signer)['mint(uint256)'](utils.parseUnits('1000', 18));
    await dai.connect(users[2].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[2].signer)
      .deposit(dai.address, utils.parseEther('1000'), users[2].address, 0);

    await weth.connect(users[0].signer)['mint(uint256)'](utils.parseEther('100'));
    await weth.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(weth.address, utils.parseEther('10'), users[0].address, 0);
    await pool
      .connect(users[0].signer)
      .borrow(dai.address, utils.parseUnits('10', 18), RateMode.Variable, 0, users[0].address);

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    // inputs
    const requester = users[0].address;
    const onBehalfOf = users[0].address;
    const amount = utils.parseUnits('10', 18);
    const reserveIndex = utils.parseUnits('10', 27);

    // accounting
    const scaledBalance = await variableDebtContract.scaledBalanceOf(onBehalfOf);
    const previousIndex = await variableDebtContract.getPreviousIndex(onBehalfOf);
    const currentBalance = scaledBalance.rayMul(reserveIndex);
    const previousBalance = scaledBalance.rayMul(previousIndex);
    const interests = currentBalance.sub(previousBalance);

    expect(
      await variableDebtContract
        .connect(poolSigner)
        .mint(requester, onBehalfOf, amount, reserveIndex)
    )
      .to.emit(variableDebtContract, 'Transfer')
      .withArgs(ZERO_ADDRESS, onBehalfOf, amount.add(interests))
      .to.emit(variableDebtContract, 'Mint')
      .withArgs(requester, onBehalfOf, amount.add(interests), reserveIndex);

    await evmRevert(snapId);
  });

  it.only('Pool mints 10 debtTokens on behalf of a user (with ongoing borrowing)', async () => {
    const { deployer, pool, weth, dai, helpersContract, users } = testEnv;

    const snapId = await evmSnapshot();
    // User2 supplies DAI
    await dai.connect(users[2].signer)['mint(uint256)'](utils.parseUnits('1000', 18));
    await dai.connect(users[2].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[2].signer)
      .deposit(dai.address, utils.parseEther('1000'), users[2].address, 0);
    // User0 supplies 10 WETH and borrows 10 DAI
    await weth.connect(users[0].signer)['mint(uint256)'](utils.parseEther('100'));
    await weth.connect(users[0].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[0].signer)
      .deposit(weth.address, utils.parseEther('10'), users[0].address, 0);
    await pool
      .connect(users[0].signer)
      .borrow(dai.address, utils.parseUnits('10', 18), RateMode.Variable, 0, users[0].address);
    // User1 supplies 1 WETH and borrows 100 DAI
    await weth.connect(users[1].signer)['mint(uint256)'](utils.parseEther('100'));
    await weth.connect(users[1].signer).approve(pool.address, MAX_UINT_AMOUNT);
    await pool
      .connect(users[1].signer)
      .deposit(weth.address, utils.parseEther('10'), users[1].address, 0);

    // Impersonate the Pool
    await topUpNonPayableWithEther(deployer.signer, [pool.address], utils.parseEther('1'));
    await impersonateAccountsHardhat([pool.address]);
    const poolSigner = await hre.ethers.getSigner(pool.address);

    const daiVariableDebtTokenAddress = (
      await helpersContract.getReserveTokensAddresses(dai.address)
    ).variableDebtTokenAddress;

    const variableDebtContract = await getVariableDebtToken(daiVariableDebtTokenAddress);

    // Approve borrow: user0 delegates credit to user1
    await variableDebtContract
      .connect(users[0].signer)
      .approveDelegation(users[1].address, utils.parseUnits('10', 18));

    // inputs
    const requester = users[1].address;
    const onBehalfOf = users[0].address;
    const amount = utils.parseUnits('10', 18);
    const reserveIndex = utils.parseUnits('10', 27);

    // accounting
    const scaledBalance = await variableDebtContract.scaledBalanceOf(onBehalfOf);
    const previousIndex = await variableDebtContract.getPreviousIndex(onBehalfOf);
    const currentBalance = scaledBalance.rayMul(reserveIndex);
    const previousBalance = scaledBalance.rayMul(previousIndex);
    const interests = currentBalance.sub(previousBalance);

    expect(
      await variableDebtContract
        .connect(poolSigner)
        .mint(requester, onBehalfOf, amount, reserveIndex)
    )
      .to.emit(variableDebtContract, 'Transfer')
      .withArgs(ZERO_ADDRESS, onBehalfOf, amount.add(interests))
      .to.emit(variableDebtContract, 'Mint')
      .withArgs(requester, onBehalfOf, amount.add(interests), reserveIndex);

    await evmRevert(snapId);
  });
});
