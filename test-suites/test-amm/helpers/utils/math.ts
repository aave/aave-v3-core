import BigNumber from 'bignumber.js';
import {
  RAY,
  WAD,
  HALF_RAY,
  HALF_WAD,
  WAD_RAY_RATIO,
  HALF_PERCENTAGE,
  PERCENTAGE_FACTOR,
} from '../../../../helpers/constants';

declare module 'bignumber.js' {
  interface BigNumber {
    ray: () => BigNumber;
    wad: () => BigNumber;
    halfRay: () => BigNumber;
    halfWad: () => BigNumber;
    halfPercentage: () => BigNumber;
    wadMul: (a: BigNumber) => BigNumber;
    wadDiv: (a: BigNumber) => BigNumber;
    rayMul: (a: BigNumber) => BigNumber;
    rayDiv: (a: BigNumber) => BigNumber;
    percentMul: (a: BigNumber) => BigNumber;
    percentDiv: (a: BigNumber) => BigNumber;
    rayToWad: () => BigNumber;
    wadToRay: () => BigNumber;
  }
}

BigNumber.prototype.ray = (): BigNumber => {
  return new BigNumber(RAY).decimalPlaces(0);
};
BigNumber.prototype.wad = (): BigNumber => {
  return new BigNumber(WAD).decimalPlaces(0);
};

BigNumber.prototype.halfRay = (): BigNumber => {
  return new BigNumber(HALF_RAY).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.halfWad = (): BigNumber => {
  return new BigNumber(HALF_WAD).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.wadMul = function (b: BigNumber): BigNumber {
  return this.halfWad().plus(this.multipliedBy(b)).div(WAD).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.wadDiv = function (a: BigNumber): BigNumber {
  const halfA = a.div(2).decimalPlaces(0, BigNumber.ROUND_DOWN);

  return halfA.plus(this.multipliedBy(WAD)).div(a).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.rayMul = function (a: BigNumber): BigNumber {
  return this.halfRay().plus(this.multipliedBy(a)).div(RAY).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.rayDiv = function (a: BigNumber): BigNumber {
  const halfA = a.div(2).decimalPlaces(0, BigNumber.ROUND_DOWN);

  return halfA
    .plus(this.multipliedBy(RAY))
    .decimalPlaces(0, BigNumber.ROUND_DOWN)
    .div(a)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.rayToWad = function (): BigNumber {
  const halfRatio = new BigNumber(WAD_RAY_RATIO).div(2);

  return halfRatio.plus(this).div(WAD_RAY_RATIO).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.wadToRay = function (): BigNumber {
  return this.multipliedBy(WAD_RAY_RATIO).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.halfPercentage = (): BigNumber => {
  return new BigNumber(HALF_PERCENTAGE).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.percentMul = function (b: BigNumber): BigNumber {
  return this.halfPercentage()
    .plus(this.multipliedBy(b))
    .div(PERCENTAGE_FACTOR)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);
};

BigNumber.prototype.percentDiv = function (a: BigNumber): BigNumber {
  const halfA = a.div(2).decimalPlaces(0, BigNumber.ROUND_DOWN);

  return halfA
    .plus(this.multipliedBy(PERCENTAGE_FACTOR))
    .div(a)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);
};
