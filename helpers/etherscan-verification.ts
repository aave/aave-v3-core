import { exit } from 'process';
import fs from 'fs';
import { file } from 'tmp-promise';
import { DRE } from './misc-utils';

const fatalErrors = [
  `The address provided as argument contains a contract, but its bytecode`,
  `Daily limit of 100 source code submissions reached`,
  `has no bytecode. Is the contract deployed to this network`,
  `The constructor for`,
];

const okErrors = [`Contract source code already verified`];

const unableVerifyError = 'Fail - Unable to verify';

export const SUPPORTED_ETHERSCAN_NETWORKS = ['main', 'ropsten', 'kovan'];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const verifyEtherscanContract = async (
  address: string,
  constructorArguments: (string | string[])[],
  libraries?: string
) => {
  const currentNetwork = DRE.network.name;

  if (!process.env.ETHERSCAN_KEY) {
    throw Error('Missing process.env.ETHERSCAN_KEY.');
  }
  if (!SUPPORTED_ETHERSCAN_NETWORKS.includes(currentNetwork)) {
    throw Error(
      `Current network ${currentNetwork} not supported. Please change to one of the next networks: ${SUPPORTED_ETHERSCAN_NETWORKS.toString()}`
    );
  }

  try {
    console.log(
      '[ETHERSCAN][WARNING] Delaying Etherscan verification due their API can not find newly deployed contracts'
    );
    const msDelay = 3000;
    const times = 4;
    // Write a temporal file to host complex parameters for buidler-etherscan https://github.com/nomiclabs/buidler/tree/development/packages/buidler-etherscan#complex-arguments
    const { fd, path, cleanup } = await file({
      prefix: 'verify-params-',
      postfix: '.js',
    });
    fs.writeSync(fd, `module.exports = ${JSON.stringify([...constructorArguments])};`);

    const params = {
      address: address,
      libraries,
      constructorArgs: path,
      relatedSources: true,
    };
    await runTaskWithRetry('verify', params, times, msDelay, cleanup);
  } catch (error) {}
};

export const runTaskWithRetry = async (
  task: string,
  params: any,
  times: number,
  msDelay: number,
  cleanup: () => void
) => {
  let counter = times;
  await delay(msDelay);

  try {
    if (times > 1) {
      await DRE.run(task, params);
      cleanup();
    } else if (times === 1) {
      console.log('[ETHERSCAN][WARNING] Trying to verify via uploading all sources.');
      delete params.relatedSources;
      await DRE.run(task, params);
      cleanup();
    } else {
      cleanup();
      console.error(
        '[ETHERSCAN][ERROR] Errors after all the retries, check the logs for more information.'
      );
    }
  } catch (error) {
    counter--;

    if (okErrors.some((okReason) => error.message.includes(okReason))) {
      console.info('[ETHERSCAN][INFO] Skipping due OK response: ', error.message);
      return;
    }

    if (fatalErrors.some((fatalError) => error.message.includes(fatalError))) {
      console.error(
        '[ETHERSCAN][ERROR] Fatal error detected, skip retries and resume deployment.',
        error.message
      );
      return;
    }
    console.error('[ETHERSCAN][ERROR]', error.message);
    console.log();
    console.info(`[ETHERSCAN][[INFO] Retrying attemps: ${counter}.`);
    if (error.message.includes(unableVerifyError)) {
      console.log('[ETHERSCAN][WARNING] Trying to verify via uploading all sources.');
      delete params.relatedSources;
    }
    await runTaskWithRetry(task, params, counter, msDelay, cleanup);
  }
};

export const checkVerification = () => {
  const currentNetwork = DRE.network.name;
  if (!process.env.ETHERSCAN_KEY) {
    console.error('Missing process.env.ETHERSCAN_KEY.');
    exit(3);
  }
  if (!SUPPORTED_ETHERSCAN_NETWORKS.includes(currentNetwork)) {
    console.error(
      `Current network ${currentNetwork} not supported. Please change to one of the next networks: ${SUPPORTED_ETHERSCAN_NETWORKS.toString()}`
    );
    exit(5);
  }
};
