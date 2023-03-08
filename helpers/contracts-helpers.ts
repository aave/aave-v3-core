import { ethers } from 'ethers';
import { signTypedData_v4 } from 'eth-sig-util';
import { fromRpcSig, ECDSASignature } from 'ethereumjs-util';
import { tEthereumAddress, tStringTokenSmallUnits } from './types';
import { getContract } from '@aave/deploy-v3';
import { impersonateAccountsHardhat } from './misc-utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { InitializableImmutableAdminUpgradeabilityProxy } from '../types';

declare var hre: HardhatRuntimeEnvironment;

export const convertToCurrencyDecimals = async (tokenAddress: tEthereumAddress, amount: string) => {
  const token = await getContract('IERC20Detailed', tokenAddress);
  let decimals = (await token.decimals()).toString();

  return ethers.utils.parseUnits(amount, decimals);
};

export const buildPermitParams = (
  chainId: number,
  token: tEthereumAddress,
  revision: string,
  tokenName: string,
  owner: tEthereumAddress,
  spender: tEthereumAddress,
  nonce: number,
  deadline: string,
  value: tStringTokenSmallUnits
) => ({
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Permit' as const,
  domain: {
    name: tokenName,
    version: revision,
    chainId: chainId,
    verifyingContract: token,
  },
  message: {
    owner,
    spender,
    value,
    nonce,
    deadline,
  },
});

export const getSignatureFromTypedData = (
  privateKey: string,
  typedData: any // TODO: should be TypedData, from eth-sig-utils, but TS doesn't accept it
): ECDSASignature => {
  const signature = signTypedData_v4(Buffer.from(privateKey.substring(2, 66), 'hex'), {
    data: typedData,
  });
  return fromRpcSig(signature);
};

export const buildDelegationWithSigParams = (
  chainId: number,
  token: tEthereumAddress,
  revision: string,
  tokenName: string,
  delegatee: tEthereumAddress,
  nonce: number,
  deadline: string,
  value: tStringTokenSmallUnits
) => ({
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    DelegationWithSig: [
      { name: 'delegatee', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'DelegationWithSig' as const,
  domain: {
    name: tokenName,
    version: revision,
    chainId: chainId,
    verifyingContract: token,
  },
  message: {
    delegatee,
    value,
    nonce,
    deadline,
  },
});

export const getProxyImplementation = async (proxyAdminAddress: string, proxyAddress: string) => {
  // Impersonate proxy admin
  await impersonateAccountsHardhat([proxyAdminAddress]);
  const proxyAdminSigner = await hre.ethers.getSigner(proxyAdminAddress);

  const proxy = (await hre.ethers.getContractAt(
    'InitializableImmutableAdminUpgradeabilityProxy',
    proxyAddress,
    proxyAdminSigner
  )) as InitializableImmutableAdminUpgradeabilityProxy;

  const implementationAddress = await proxy.callStatic.implementation();
  return implementationAddress;
};

export const getProxyAdmin = async (proxyAddress: string) => {
  const EIP1967_ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
  const adminStorageSlot = await hre.ethers.provider.getStorageAt(
    proxyAddress,
    EIP1967_ADMIN_SLOT,
    'latest'
  );
  const adminAddress = ethers.utils.defaultAbiCoder
    .decode(['address'], adminStorageSlot)
    .toString();
  return ethers.utils.getAddress(adminAddress);
};
