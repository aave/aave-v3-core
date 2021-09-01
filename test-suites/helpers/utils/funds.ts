import { BigNumber, Signer } from 'ethers';
import { SelfdestructTransferFactory } from '../../../types';

export const topUpNonPayableWithEther = async (
  holder: Signer,
  accounts: string[],
  amount: BigNumber
) => {
  let selfdestructContract;
  let factory = new SelfdestructTransferFactory(holder);
  for (const account of accounts) {
    selfdestructContract = await factory.deploy();
    await selfdestructContract.deployed();
    await selfdestructContract.destroyAndTransfer(account, {
      value: amount,
    });
  }
};

// const topUpWalletsWithEther = async (
//     holder: JsonRpcSigner,
//     wallets: string[],
//     amount: string
//   ) => {
//     for (const wallet of wallets) {
//      await waitForTx(
//       await holder.sendTransaction({
//         to: wallet,
//         value: amount,
//       })
//      )
//     }
// };
