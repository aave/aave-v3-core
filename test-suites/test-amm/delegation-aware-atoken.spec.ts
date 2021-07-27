import { MAX_UINT_AMOUNT, ZERO_ADDRESS } from '../../helpers/constants';
import { BUIDLEREVM_CHAINID } from '../../helpers/buidler-constants';
import { buildPermitParams, getSignatureFromTypedData } from '../../helpers/contracts-helpers';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { eEthereumNetwork, ProtocolErrors } from '../../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { DRE } from '../../helpers/misc-utils';
import {
  ConfigNames,
  getATokenDomainSeparatorPerNetwork,
  getTreasuryAddress,
  loadPoolConfig,
} from '../../helpers/configuration';
import { waitForTx } from '../../helpers/misc-utils';
import {
  deployDelegationAwareAToken,
  deployMintableDelegationERC20,
} from '../../helpers/contracts-deployments';
import { DelegationAwareATokenFactory } from '../../types';
import { DelegationAwareAToken } from '../../types/DelegationAwareAToken';
import { MintableDelegationERC20 } from '../../types/MintableDelegationERC20';
import AmmConfig from '../../markets/amm';

const { parseEther } = ethers.utils;

makeSuite('AToken: underlying delegation', (testEnv: TestEnv) => {
  const poolConfig = loadPoolConfig(ConfigNames.Commons);
  let delegationAToken = <DelegationAwareAToken>{};
  let delegationERC20 = <MintableDelegationERC20>{};

  it('Deploys a new MintableDelegationERC20 and a DelegationAwareAToken', async () => {
    const { pool } = testEnv;

    delegationERC20 = await deployMintableDelegationERC20(['DEL', 'DEL', '18']);

    delegationAToken = await deployDelegationAwareAToken(
      [pool.address, delegationERC20.address, await getTreasuryAddress(AmmConfig), ZERO_ADDRESS, 'aDEL', 'aDEL'],
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
