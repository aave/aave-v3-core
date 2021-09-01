// ----------------
// MATH
// ----------------

import { BigNumber } from 'ethers';
import { parseEther, parseUnits } from 'ethers/lib/utils';

export const PERCENTAGE_FACTOR = '10000';
export const HALF_PERCENTAGE = BigNumber.from(PERCENTAGE_FACTOR).div(2).toString();
export const WAD = BigNumber.from(10).pow(18).toString();
export const HALF_WAD = BigNumber.from(WAD).div(2).toString();
export const RAY = BigNumber.from(10).pow(27).toString();
export const HALF_RAY = BigNumber.from(RAY).div(2).toString();
export const WAD_RAY_RATIO = parseUnits('1', 9).toString();
export const oneEther = parseUnits('1', 18);
export const oneRay = parseUnits('1', 27);
export const MAX_UINT_AMOUNT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';
export const MAX_BORROW_CAP = '68719476735';
export const MAX_SUPPLY_CAP = '68719476735';
export const ONE_YEAR = '31536000';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ONE_ADDRESS = '0x0000000000000000000000000000000000000001';
// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------
export const OPTIMAL_UTILIZATION_RATE = parseUnits('0.8', 27);
export const EXCESS_UTILIZATION_RATE = parseUnits('0.2', 27);
export const TOKEN_DISTRIBUTOR_PERCENTAGE_BASE = '10000';
export const MOCK_USD_PRICE_IN_WEI = '5848466240000000';
export const USD_ADDRESS = '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96';
export const AAVE_REFERRAL = '0';

export const MOCK_CHAINLINK_AGGREGATORS_PRICES = {
  AAVE: parseEther('0.003620948469').toString(),
  BAT: parseEther('0.00137893825230').toString(),
  BUSD: parseEther('0.00736484').toString(),
  DAI: parseEther('0.00369068412860').toString(),
  ENJ: parseEther('0.00029560').toString(),
  KNC: parseEther('0.001072').toString(),
  LINK: parseEther('0.009955').toString(),
  MANA: parseEther('0.000158').toString(),
  MKR: parseEther('2.508581').toString(),
  REN: parseEther('0.00065133').toString(),
  SNX: parseEther('0.00442616').toString(),
  SUSD: parseEther('0.00364714136416').toString(),
  TUSD: parseEther('0.00364714136416').toString(),
  UNI: parseEther('0.00536479').toString(),
  USDC: parseEther('0.00367714136416').toString(),
  USDT: parseEther('0.00369068412860').toString(),
  WETH: parseEther('1').toString(),
  WBTC: parseEther('47.332685').toString(),
  YFI: parseEther('22.407436').toString(),
  ZRX: parseEther('0.001151').toString(),
  UniDAIWETH: parseEther('22.407436').toString(),
  UniWBTCWETH: parseEther('22.407436').toString(),
  UniAAVEWETH: parseEther('0.003620948469').toString(),
  UniBATWETH: parseEther('22.407436').toString(),
  UniDAIUSDC: parseEther('22.407436').toString(),
  UniCRVWETH: parseEther('22.407436').toString(),
  UniLINKWETH: parseEther('22.407436').toString(),
  UniMKRWETH: parseEther('22.407436').toString(),
  UniRENWETH: parseEther('22.407436').toString(),
  UniSNXWETH: parseEther('22.407436').toString(),
  UniUNIWETH: parseEther('22.407436').toString(),
  UniUSDCWETH: parseEther('22.407436').toString(),
  UniWBTCUSDC: parseEther('22.407436').toString(),
  UniYFIWETH: parseEther('22.407436').toString(),
  BptWBTCWETH: parseEther('22.407436').toString(),
  BptBALWETH: parseEther('22.407436').toString(),
  WMATIC: parseEther('0.003620948469').toString(),
  STAKE: parseEther('0.003620948469').toString(),
  xSUSHI: parseEther('0.00913428586').toString(),
  USD: '5848466240000000',
};
