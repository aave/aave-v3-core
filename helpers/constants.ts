// ----------------
// MATH
// ----------------

import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

export const PERCENTAGE_FACTOR = '10000';
export const HALF_PERCENTAGE = '5000';
export const WAD = Math.pow(10, 18).toString();
export const HALF_WAD = BigNumber.from(WAD).mul(0.5).toString();
export const RAY = BigNumber.from(10).pow(27).toString();
export const HALF_RAY = BigNumber.from(RAY).div(2).toString();
export const WAD_RAY_RATIO = Math.pow(10, 9).toString();
export const oneEther = BigNumber.from(Math.pow(10, 18));
export const oneRay = BigNumber.from(Math.pow(10, 27));
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
export const APPROVAL_AMOUNT_POOL = '1000000000000000000000000000';
export const TOKEN_DISTRIBUTOR_PERCENTAGE_BASE = '10000';
export const MOCK_USD_PRICE_IN_WEI = '5848466240000000';
export const USD_ADDRESS = '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96';
export const AAVE_REFERRAL = '0';

export const MOCK_CHAINLINK_AGGREGATORS_PRICES = {
  AAVE: parseUnits('0.003620948469', 18).toString(), // oneEther.multipliedBy('0.003620948469').toFixed(),
  BAT: parseUnits('0.00137893825230', 18).toString(), //  oneEther.multipliedBy('0.00137893825230').toFixed(),
  BUSD: parseUnits('0.00736484', 18).toString(), // oneEther.multipliedBy('0.00736484').toFixed(),
  DAI: parseUnits('0.00369068412860', 18).toString(), // oneEther.multipliedBy('0.00369068412860').toFixed(),
  ENJ: parseUnits('0.00029560', 18).toString(), // oneEther.multipliedBy('0.00029560').toFixed(),
  KNC: parseUnits('0.001072', 18).toString(), // oneEther.multipliedBy('0.001072').toFixed(),
  LINK: parseUnits('0.009955', 18).toString(), // oneEther.multipliedBy('0.009955').toFixed(),
  MANA: parseUnits('0.000158', 18).toString(), // oneEther.multipliedBy('0.000158').toFixed(),
  MKR: parseUnits('2.508581', 18).toString(), // oneEther.multipliedBy('2.508581').toFixed(),
  REN: parseUnits('0.00065133', 18).toString(), // oneEther.multipliedBy('0.00065133').toFixed(),
  SNX: parseUnits('0.00442616', 18).toString(), // oneEther.multipliedBy('0.00442616').toFixed(),
  SUSD: parseUnits('0.00364714136416', 18).toString(), // oneEther.multipliedBy('0.00364714136416').toFixed(),
  TUSD: parseUnits('0.00364714136416', 18).toString(), // oneEther.multipliedBy('0.00364714136416').toFixed(),
  UNI: parseUnits('0.00536479', 18).toString(), // oneEther.multipliedBy('0.00536479').toFixed(),
  USDC: parseUnits('0.00367714136416', 18).toString(), // oneEther.multipliedBy('0.00367714136416').toFixed(),
  USDT: parseUnits('0.00369068412860', 18).toString(), // oneEther.multipliedBy('0.00369068412860').toFixed(),
  WETH: parseUnits('1', 18).toString(), // oneEther.toFixed(),
  WBTC: parseUnits('47.332685', 18).toString(), // oneEther.multipliedBy('47.332685').toFixed(),
  YFI: parseUnits('22.407436', 18).toString(), // oneEther.multipliedBy('22.407436').toFixed(),
  ZRX: parseUnits('0.001151', 18).toString(), //oneEther.multipliedBy('0.001151').toFixed(),
  UniDAIWETH: parseUnits('22.407436', 18).toString(), // oneEther.multipliedBy('22.407436').toFixed(),
  UniWBTCWETH: parseUnits('22.407436', 18).toString(), // oneEther.multipliedBy('22.407436').toFixed(),
  UniAAVEWETH: parseUnits('0.003620948469', 18).toString(), // oneEther.multipliedBy('0.003620948469').toFixed(),
  UniBATWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniDAIUSDC: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniCRVWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniLINKWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('0.009955').toFixed(),
  UniMKRWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniRENWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniSNXWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniUNIWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniUSDCWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniWBTCUSDC: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  UniYFIWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  BptWBTCWETH: parseUnits('22.407436', 18).toString(), // oneEther.multipliedBy('22.407436').toFixed(),
  BptBALWETH: parseUnits('22.407436', 18).toString(), //oneEther.multipliedBy('22.407436').toFixed(),
  WMATIC: parseUnits('0.003620948469', 18).toString(), // oneEther.multipliedBy('0.003620948469').toFixed(),
  STAKE: parseUnits('0.003620948469', 18).toString(), // oneEther.multipliedBy('0.003620948469').toFixed(),
  xSUSHI: parseUnits('0.00913428586', 18).toString(), // oneEther.multipliedBy('0.00913428586').toFixed(),
  USD: '5848466240000000',
};
