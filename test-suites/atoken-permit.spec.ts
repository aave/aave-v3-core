import { expect } from 'chai';
import { ethers, utils } from 'ethers';
import { DRE } from '../helpers/misc-utils';
import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../helpers/constants';
import { BUIDLEREVM_CHAINID } from '../helpers/buidler-constants';
import { buildPermitParams, getSignatureFromTypedData } from '../helpers/contracts-helpers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { getTestWallets } from './helpers/utils/wallets';

makeSuite('AToken: Permit', (testEnv: TestEnv) => {
  let testWallets;

  before(() => {
    testWallets = getTestWallets();
  })

  it('Checks the domain separator', async () => {
    const { aDai } = testEnv;
    const separator = await aDai.DOMAIN_SEPARATOR();

    const domain = {
      name: await aDai.name(),
      version: '1',
      chainId: DRE.network.config.chainId,
      verifyingContract: aDai.address,
    };
    const domainSeparator = utils._TypedDataEncoder.hashDomain(domain);

    expect(separator).to.be.equal(domainSeparator, 'Invalid domain separator');
  });

  it('Get aDAI for tests', async () => {
    const { dai, pool, deployer } = testEnv;

    await dai.mint(utils.parseEther('20000'));
    await dai.approve(pool.address, utils.parseEther('20000'));

    await pool.deposit(dai.address, utils.parseEther('20000'), deployer.address, 0);
  });

  it('Tries to submit a permit with 0 expiration and reverts', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const tokenName = await aDai.name();

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const expiration = 0;
    const nonce = (await aDai._nonces(owner.address)).toNumber();
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = utils.parseEther('2').toString();
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      tokenName,
      owner.address,
      spender.address,
      nonce,
      permitAmount,
      expiration.toFixed()
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    expect((await aDai.allowance(owner.address, spender.address)).toString()).to.be.equal(
      '0',
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      aDai
        .connect(spender.signer)
        .permit(owner.address, spender.address, permitAmount, expiration, v, r, s)
    ).to.be.revertedWith('INVALID_EXPIRATION');

    expect((await aDai.allowance(owner.address, spender.address)).toString()).to.be.equal(
      '0',
      'INVALID_ALLOWANCE_AFTER_PERMIT'
    );
  });

  it('Submits a permit with maximum expiration length', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await aDai._nonces(owner.address)).toNumber();
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = utils.parseEther('2').toString();
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      await aDai.name(),
      owner.address,
      spender.address,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    expect((await aDai.allowance(owner.address, spender.address)).toString()).to.be.equal(
      '0',
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    expect(
      await aDai
        .connect(spender.signer)
        .permit(owner.address, spender.address, permitAmount, deadline, v, r, s)
    );

    expect((await aDai._nonces(owner.address)).toNumber()).to.be.equal(1);
  });

  it('Cancels the previous permit', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await aDai._nonces(owner.address)).toNumber();
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      await aDai.name(),
      owner.address,
      spender.address,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    expect((await aDai.allowance(owner.address, spender.address)).toString()).to.be.equal(
      ethers.utils.parseEther('2'),
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );

    expect(
      await aDai
        .connect(spender.signer)
        .permit(owner.address, spender.address, permitAmount, deadline, v, r, s)
    );
    expect((await aDai.allowance(owner.address, spender.address)).toString()).to.be.equal(
      permitAmount,
      'INVALID_ALLOWANCE_AFTER_PERMIT'
    );

    expect((await aDai._nonces(owner.address)).toNumber()).to.be.equal(2);
  });

  it('Tries to submit a permit with invalid nonce and reverts', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const deadline = MAX_UINT_AMOUNT;
    const nonce = 1000;
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      await aDai.name(),
      owner.address,
      spender.address,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      aDai
        .connect(spender.signer)
        .permit(owner.address, spender.address, permitAmount, deadline, v, r, s)
    ).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('Tries to submit a permit with invalid expiration (previous to the current block) and reverts', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const expiration = '1';
    const nonce = (await aDai._nonces(owner.address)).toNumber();
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      await aDai.name(),
      owner.address,
      spender.address,
      nonce,
      expiration,
      permitAmount
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      aDai
        .connect(spender.signer)
        .permit(owner.address, spender.address, expiration, permitAmount, v, r, s)
    ).to.be.revertedWith('INVALID_EXPIRATION');
  });

  it('Tries to submit a permit with invalid signature and reverts', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await aDai._nonces(owner.address)).toNumber();
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      await aDai.name(),
      owner.address,
      spender.address,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      aDai
        .connect(spender.signer)
        .permit(owner.address, ZERO_ADDRESS, permitAmount, deadline, v, r, s)
    ).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('Tries to submit a permit with invalid owner and reverts', async () => {
    const { aDai, deployer, users } = testEnv;
    const owner = deployer;
    const spender = users[1];

    const chainId = DRE.network.config.chainId || BUIDLEREVM_CHAINID;
    const expiration = MAX_UINT_AMOUNT;
    const nonce = (await aDai._nonces(owner.address)).toNumber();
    const revision = (await aDai.ATOKEN_REVISION()).toString();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      aDai.address,
      revision,
      await aDai.name(),
      owner.address,
      spender.address,
      nonce,
      expiration,
      permitAmount
    );

    const ownerPrivateKey = testWallets[0].secretKey;

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      aDai
        .connect(spender.signer)
        .permit(ZERO_ADDRESS, spender.address, expiration, permitAmount, v, r, s)
    ).to.be.revertedWith('INVALID_OWNER');
  });
});
