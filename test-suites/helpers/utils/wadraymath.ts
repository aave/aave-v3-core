import { BigNumber } from '@ethersproject/bignumber';

import {
  RAY,
  WAD,
  HALF_RAY,
  HALF_WAD,
  WAD_RAY_RATIO,
  HALF_PERCENTAGE,
  PERCENTAGE_FACTOR,
} from '../../../helpers/constants';

declare module '@ethersproject/bignumber' {
  interface BigNumber {
    ray: () => BigNumber;
    wad: () => BigNumber;
    halfRay: () => BigNumber;
    halfWad: () => BigNumber;
    halfPercentage: () => BigNumber;
    percentageFactor: () => BigNumber;
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

BigNumber.prototype.ray = (): BigNumber => BigNumber.from(RAY);
BigNumber.prototype.wad = (): BigNumber => BigNumber.from(WAD);
BigNumber.prototype.halfRay = (): BigNumber => BigNumber.from(HALF_RAY);
BigNumber.prototype.halfWad = (): BigNumber => BigNumber.from(HALF_WAD);
BigNumber.prototype.halfPercentage = (): BigNumber => BigNumber.from(HALF_PERCENTAGE);
BigNumber.prototype.percentageFactor = (): BigNumber => BigNumber.from(PERCENTAGE_FACTOR);

BigNumber.prototype.wadMul = function (b: BigNumber): BigNumber {
  return this.halfWad().add(this.mul(b)).div(this.wad());
};

BigNumber.prototype.wadDiv = function (a: BigNumber): BigNumber {
  const halfA = a.div(2);
  return halfA.add(this.mul(this.wad())).div(a);
};

BigNumber.prototype.rayMul = function (a: BigNumber): BigNumber {
  return this.halfRay().add(this.mul(a)).div(this.ray());
};

BigNumber.prototype.rayDiv = function (a: BigNumber): BigNumber {
  const halfA = a.div(2);
  return halfA.add(this.mul(this.ray())).div(a);
};

BigNumber.prototype.percentMul = function (b: BigNumber): BigNumber {
  return this.halfPercentage().add(this.mul(b)).div(this.percentageFactor());
};

BigNumber.prototype.percentDiv = function (a: BigNumber): BigNumber {
  const halfA = a.div(2);
  return halfA.add(this.mul(this.percentageFactor())).div(a);
};

BigNumber.prototype.rayToWad = function (): BigNumber {
  const halfRatio = BigNumber.from(WAD_RAY_RATIO).div(2);
  return halfRatio.add(this).div(WAD_RAY_RATIO);
};

BigNumber.prototype.wadToRay = function (): BigNumber {
  return this.mul(WAD_RAY_RATIO);
};
