import { BigNumber } from 'ethers';

function almostEqualAssertion(this: any, expected: any, actual: any, message: string): any {
  this.assert(
    expected.add(1).eq(actual) ||
      expected.add(2).eq(actual) ||
      actual.add(1).eq(expected) ||
      actual.add(2).eq(expected) ||
      expected.eq(actual),
    `${message} expected #{act} to be almost equal #{exp}`,
    `${message} expected #{act} to be different from #{exp}`,
    expected.toString(),
    actual.toString()
  );
}

export function almostEqual() {
  return function (chai: any, utils: any) {
    chai.Assertion.overwriteMethod('almostEqual', function (original: any) {
      return function (this: any, value: any, message: string) {
        if (utils.flag(this, 'bignumber')) {
          var expected = BigNumber.from(value);
          var actual = BigNumber.from(this._obj);
          almostEqualAssertion.apply(this, [expected, actual, message]);
        } else {
          original.apply(this, arguments);
        }
      };
    });
  };
}
