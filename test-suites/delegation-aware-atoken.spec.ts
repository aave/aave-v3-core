import { ZERO_ADDRESS } from '../helpers/constants';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { getTreasuryAddress } from '../helpers/configuration';
import {
  deployDelegationAwareAToken,
  deployMintableDelegationERC20,
} from '../helpers/contracts-deployments';
import { DelegationAwareAToken } from '../types/DelegationAwareAToken';
import { MintableDelegationERC20 } from '../types/MintableDelegationERC20';
import AaveConfig from '../markets/aave';

const { parseEther } = ethers.utils;

makeSuite('AToken: underlying delegation', (testEnv: TestEnv) => {
  let delegationAToken = <DelegationAwareAToken>{};
  let delegationERC20 = <MintableDelegationERC20>{};

  it('Deploys a new MintableDelegationERC20 and a DelegationAwareAToken', async () => {
    const { pool } = testEnv;

    delegationERC20 = await deployMintableDelegationERC20(['DEL', 'DEL', '18']);

    delegationAToken = await deployDelegationAwareAToken(
      [
        pool.address,
        delegationERC20.address,
        await getTreasuryAddress(AaveConfig),
        ZERO_ADDRESS,
        'aDEL',
        'aDEL',
      ],
      false
    );

    //await delegationAToken.initialize(pool.address, ZERO_ADDRESS, delegationERC20.address, ZERO_ADDRESS, '18', 'aDEL', 'aDEL');

    console.log((await delegationAToken.decimals()).toString());
  });

  it('Tries to delegate with the caller not being the Aave admin', async () => {
    const { users } = testEnv;

    await expect(
      delegationAToken.connect(users[1].signer).delegateUnderlyingTo(users[2].address)
    ).to.be.revertedWith(ProtocolErrors.CALLER_NOT_POOL_ADMIN);
  });

  it('Tries to delegate to user 2', async () => {
    const { users } = testEnv;

    await delegationAToken.delegateUnderlyingTo(users[2].address);

    const delegateeAddress = await delegationERC20.delegatee();

    expect(delegateeAddress).to.be.equal(users[2].address);
  });
});
