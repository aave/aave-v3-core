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
export const MAX_UNBACKED_MINT_CAP = '68719476735';
export const ONE_YEAR = '31536000';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ONE_ADDRESS = '0x0000000000000000000000000000000000000001';
// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------
export const MOCK_USD_PRICE_IN_WEI = '5848466240000000';
export const USD_ADDRESS = '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96';
export const AAVE_REFERRAL = '0';

export const TEST_SNAPSHOT_ID = '0x1';
export const HARDHAT_CHAINID = 31337;
export const COVERAGE_CHAINID = 1337;
