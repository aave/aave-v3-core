import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { BUIDLEREVM_CHAINID } from '../helpers/buidler-constants';
import {
  buildPermitDelegationParams,
  buildPermitParams,
  convertToCurrencyDecimals,
  getSignatureFromTypedData,
} from '../helpers/contracts-helpers';
import { expect } from 'chai';
import { BigNumber, ethers } from 'ethers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { DRE } from '../helpers/misc-utils';
import { waitForTx } from '../helpers/misc-utils';
import { _TypedDataEncoder } from 'ethers/lib/utils';

const { parseEther } = ethers.utils;
const TEST_WALLET_PATH = '../test-wallets.js';

makeSuite('Permit Delegation', (testEnv: TestEnv) => {
  const mintedAmount = '1000';
  let daiMintedAmount: BigNumber;
  let wethMintedAmount: BigNumber;

  it('Checks the domain separator', async () => {
    const { variableDebtDai, stableDebtDai, weth, dai } = testEnv;
    const variableSeparator = await variableDebtDai.DOMAIN_SEPARATOR();
    const stableSeparator = await stableDebtDai.DOMAIN_SEPARATOR();

    const variableDomain = {
      name: await variableDebtDai.name(),
      version: '1',
      chainId: DRE.network.config.chainId,
      verifyingContract: variableDebtDai.address,
    };
    const stableDomain = {
      name: await stableDebtDai.name(),
      version: '1',
      chainId: DRE.network.config.chainId,
      verifyingContract: stableDebtDai.address,
    };
    const variableDomainSeparator = _TypedDataEncoder.hashDomain(variableDomain);
    const stableDomainSeparator = _TypedDataEncoder.hashDomain(stableDomain);

    expect(variableSeparator).to.be.equal(
      variableDomainSeparator,
      'Invalid variable domain separator'
    );
    expect(stableSeparator).to.be.equal(stableDomainSeparator, 'Invalid stable domain separator');
  });

  it('Setup the pool', async () => {
    const {
      pool,
      weth,
      dai,
      deployer: user1,
      users: [user2, user3],
    } = testEnv;
    daiMintedAmount = await convertToCurrencyDecimals(dai.address, mintedAmount);
    wethMintedAmount = await convertToCurrencyDecimals(weth.address, mintedAmount);
    await dai.mint(daiMintedAmount);
    await dai.approve(pool.address, daiMintedAmount);
    await pool.deposit(dai.address, daiMintedAmount, user1.address, 0);
    await weth.connect(user2.signer).mint(wethMintedAmount);
    await weth.connect(user2.signer).approve(pool.address, wethMintedAmount);
    await pool.connect(user2.signer).deposit(weth.address, wethMintedAmount, user2.address, 0);
  });
  it('User 3 borrows variable interest dai on behalf of user 2 via permit', async () => {
    const {
      pool,
      variableDebtDai,
      stableDebtDai,
      weth,
      dai,
      deployer: user1,
      users: [user2, user3],
    } = testEnv;

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const expiration = MAX_UINT_AMOUNT;
    const nonce = (await variableDebtDai._nonces(user2.address)).toNumber();
    const permitAmount = daiMintedAmount.div(3);
    const msgParams = buildPermitDelegationParams(
      chainId,
      variableDebtDai.address,
      '1',
      await variableDebtDai.name(),
      user2.address,
      user3.address,
      nonce,
      expiration,
      permitAmount.toString()
    );

    const user2PrivateKey = require('../test-wallets.js').accounts[1].secretKey;
    if (!user2PrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }
    expect(
      (await variableDebtDai.borrowAllowance(user2.address, user3.address)).toString()
    ).to.be.equal('0');

    const { v, r, s } = getSignatureFromTypedData(user2PrivateKey, msgParams);

    await variableDebtDai
      .connect(user1.signer)
      .permitDelegation(user2.address, user3.address, permitAmount, expiration, v, r, s);

    expect(
      (await variableDebtDai.borrowAllowance(user2.address, user3.address)).toString()
    ).to.be.equal(permitAmount);

    await pool.connect(user3.signer).borrow(dai.address, permitAmount, 2, 0, user2.address);
    expect(
      (await variableDebtDai.borrowAllowance(user2.address, user3.address)).toString()
    ).to.be.equal('0');
  });
  it('User 3 borrows stable interest dai on behalf of user 2 via permit', async () => {
    const {
      pool,
      variableDebtDai,
      stableDebtDai,
      weth,
      dai,
      deployer: user1,
      users: [user2, user3],
    } = testEnv;

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const expiration = MAX_UINT_AMOUNT;
    const nonce = (await stableDebtDai._nonces(user2.address)).toNumber();
    const permitAmount = daiMintedAmount.div(3);
    const msgParams = buildPermitDelegationParams(
      chainId,
      stableDebtDai.address,
      '1',
      await stableDebtDai.name(),
      user2.address,
      user3.address,
      nonce,
      expiration,
      permitAmount.toString()
    );

    const user2PrivateKey = require('../test-wallets.js').accounts[1].secretKey;
    if (!user2PrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }
    expect(
      (await stableDebtDai.borrowAllowance(user2.address, user3.address)).toString()
    ).to.be.equal('0');

    const { v, r, s } = getSignatureFromTypedData(user2PrivateKey, msgParams);

    await stableDebtDai
      .connect(user1.signer)
      .permitDelegation(user2.address, user3.address, permitAmount, expiration, v, r, s);

    expect(
      (await stableDebtDai.borrowAllowance(user2.address, user3.address)).toString()
    ).to.be.equal(permitAmount);

    await pool
      .connect(user3.signer)
      .borrow(dai.address, daiMintedAmount.div(10), 1, 0, user2.address);

    expect(
      (await stableDebtDai.borrowAllowance(user2.address, user3.address)).toString()
    ).to.be.equal(permitAmount.sub(daiMintedAmount.div(10)));
  });
});
