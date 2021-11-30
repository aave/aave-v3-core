import { BigNumber, Signer } from 'ethers';
import { SelfdestructTransfer__factory } from '../../../types';

export const topUpNonPayableWithEther = async (
  holder: Signer,
  accounts: string[],
  amount: BigNumber
) => {
  let selfdestructContract;
  let factory = new SelfdestructTransfer__factory(holder);
  for (const account of accounts) {
    selfdestructContract = await factory.deploy();
    await selfdestructContract.deployed();
    await selfdestructContract.destroyAndTransfer(account, {
      value: amount,
    });
  }
};
