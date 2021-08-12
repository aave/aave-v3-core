import path from 'path';
import fs from 'fs';
import { HardhatUserConfig } from 'hardhat/types';
// @ts-ignore
import { accounts } from './test-wallets.js';
import { BUIDLEREVM_CHAINID, COVERAGE_CHAINID } from './helpers/buidler-constants';
import { buildForkConfig } from './helper-hardhat-config';
import { fork } from 'child_process';

require('dotenv').config();

import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import 'temp-hardhat-etherscan';
import 'hardhat-gas-reporter';
import 'hardhat-typechain';
import '@tenderly/hardhat-tenderly';
import 'solidity-coverage';
import 'hardhat-contract-sizer';

const SKIP_LOAD = process.env.SKIP_LOAD === 'true';
const DEFAULT_BLOCK_GAS_LIMIT = 12450000;
const HARDFORK = 'london';
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || '';

// Prevent to load scripts before compilation and typechain
if (!SKIP_LOAD) {
  ['misc'].forEach((folder) => {
    const tasksPath = path.join(__dirname, 'tasks', folder);
    fs.readdirSync(tasksPath)
      .filter((pth) => pth.includes('.ts'))
      .forEach((task) => {
        require(`${tasksPath}/${task}`);
      });
  });
}

require(`${path.join(__dirname, 'tasks/misc')}/set-bre.ts`);

const buidlerConfig: HardhatUserConfig = {
  gasReporter: {
    enabled: true,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  solidity: {
    // Docs for the compiler https://docs.soliditylang.org/en/v0.8.6/using-the-compiler.html
    version: '0.8.6',
    settings: {
      optimizer: { enabled: true, runs: 25000 },
      evmVersion: 'berlin',
    },
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  mocha: {
    timeout: 0,
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
    },
    hardhat: {
      hardfork: HARDFORK,
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: 8000000000,
      chainId: BUIDLEREVM_CHAINID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      forking: buildForkConfig(),
      allowUnlimitedContractSize: true,
    },
    ganache: {
      url: 'http://ganache:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
  },
};

export default buidlerConfig;
