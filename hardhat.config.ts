import path from 'path';
import { HardhatUserConfig } from 'hardhat/types';
// @ts-ignore
import { accounts } from './test-wallets.js';
import { COVERAGE_CHAINID, HARDHAT_CHAINID } from './helpers/constants';
import { buildForkConfig } from './helper-hardhat-config';

require('dotenv').config();

import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import '@tenderly/hardhat-tenderly';
import 'hardhat-contract-sizer';
import 'hardhat-dependency-compiler';
import '@nomicfoundation/hardhat-chai-matchers';

import 'hardhat-cannon';

import { DEFAULT_NAMED_ACCOUNTS } from '@aave/deploy-v3';

const DEFAULT_BLOCK_GAS_LIMIT = 12450000;
const HARDFORK = 'london';

const hardhatConfig = {
  gasReporter: {
    enabled: true,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  solidity: {
    // Docs for the compiler https://docs.soliditylang.org/en/v0.8.10/using-the-compiler.html
    version: '0.8.10',
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
      },
      evmVersion: 'london',
    },
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 0,
    bail: true,
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT || '',
    username: process.env.TENDERLY_USERNAME || '',
    forkNetwork: '1', //Network id of the network we want to fork
  },
  networks: {
    coverage: {
      url: 'http://localhost:8555',
      chainId: COVERAGE_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
    },
    hardhat: {
      hardfork: HARDFORK,
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: 8000000000,
      chainId: HARDHAT_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      forking: buildForkConfig(),
      allowUnlimitedContractSize: true,
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: process.env.PRIVATE_KEY,
        balance,
      })),
    },
    ganache: {
      url: 'http://localhost:8545',
      accounts: {
        mnemonic:
          'summer frozen alley foot sausage stairs become shoulder relax inmate quantum success',
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
    // cannon: {
    //   accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
    //     privateKey: process.env.PRIVATE_KEY,
    //     balance,
    //   })),
    //   publisherPrivateKey: process.env.PRIVATE_KEY,
    //   ipfsEndpoint: 'https://ipfs.infura.io:5001',
    //   ipfsAuthorizationHeader: `Basic ${Buffer.from(
    //     process.env.INFURA_IPFS_ID + ':' + process.env.INFURA_IPFS_SECRET
    //   ).toString('base64')}`,
    // },
  },
  namedAccounts: {
    ...DEFAULT_NAMED_ACCOUNTS,
  },
  external: {
    contracts: [
      {
        artifacts: './temp-artifacts',
        deploy: 'node_modules/@aave/deploy-v3/dist/deploy',
      },
    ],
  },
};

export default hardhatConfig;
