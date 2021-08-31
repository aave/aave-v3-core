import { accounts } from '../../../test-wallets.js';

export const getTestWallets = (): [{ secretKey: string; balance: string }] => {
  if (!accounts.every((element) => element.secretKey) || accounts.length === 0)
    throw new Error('INVALID_TEST_WALLETS');
  return accounts;
};
