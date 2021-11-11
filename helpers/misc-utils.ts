import { Wallet, BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

declare var hre: HardhatRuntimeEnvironment;

export const createRandomAddress = () => Wallet.createRandom().address;

export const timeLatest = async () => {
  const block = await hre.ethers.provider.getBlock('latest');
  return BigNumber.from(block.timestamp);
};

export const setBlocktime = async (time: number) => {
  await hre.ethers.provider.send('evm_setNextBlockTimestamp', [time]);
};

export const setAutomine = async (activate: boolean) => {
  await hre.network.provider.send('evm_setAutomine', [activate]);
  if (activate) await hre.network.provider.send('evm_mine', []);
};

export const setAutomineEvm = async (activate: boolean) => {
  await hre.network.provider.send('evm_setAutomine', [activate]);
};

export const impersonateAccountsHardhat = async (accounts: string[]) => {
  if (process.env.TENDERLY === 'true') {
    return;
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const account of accounts) {
    // eslint-disable-next-line no-await-in-loop
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [account],
    });
  }
};
