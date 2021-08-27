export const getTestWallets = (): [{ secretKey: string; balance: string }] => {
  const TEST_WALLET_PATH = '../../../test-wallets.js';
  return require(TEST_WALLET_PATH).accounts;
};
