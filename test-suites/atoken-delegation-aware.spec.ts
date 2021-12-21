import { DelegationAwareAToken, MintableDelegationERC20 } from '../types';
import { expect } from 'chai';
import { ZERO_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import {
  deployMintableDelegationERC20,
  deployDelegationAwareAToken,
} from '@aave/deploy-v3/dist/helpers/contract-deployments';

makeSuite('AToken: DelegationAwareAToken', (testEnv: TestEnv) => {
  let delegationAToken = <DelegationAwareAToken>{};
  let delegationERC20 = <MintableDelegationERC20>{};

  it('Deploys a new MintableDelegationERC20 and a DelegationAwareAToken', async () => {
    const { pool } = testEnv;

    delegationERC20 = await deployMintableDelegationERC20(['DEL', 'DEL', '18']);

    delegationAToken = await deployDelegationAwareAToken([
      pool.address,
      delegationERC20.address,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      'aDEL',
      'aDEL',
    ]);
  });

  it('Tries to delegate with the caller not being the Aave admin (revert expected)', async () => {
    const { users } = testEnv;

    await expect(
      delegationAToken.connect(users[1].signer).delegateUnderlyingTo(users[2].address)
    ).to.be.revertedWith(ProtocolErrors.CALLER_NOT_POOL_ADMIN);
  });

  it('Delegates to user 2', async () => {
    const { users } = testEnv;

    expect(await delegationAToken.delegateUnderlyingTo(users[2].address))
      .to.emit(delegationAToken, 'DelegateUnderlyingTo')
      .withArgs(users[2].address);

    const delegateeAddress = await delegationERC20.delegatee();

    expect(delegateeAddress).to.be.equal(users[2].address);
  });
});
