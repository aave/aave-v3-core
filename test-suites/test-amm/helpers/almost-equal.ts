import BigNumber from 'bignumber.js';

function almostEqualAssertion(this: any, expected: any, actual: any, message: string): any {
  this.assert(
    expected.plus(new BigNumber(1)).eq(actual) ||
      expected.plus(new BigNumber(2)).eq(actual) ||
      actual.plus(new BigNumber(1)).eq(expected) ||
      actual.plus(new BigNumber(2)).eq(expected) ||
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
          var expected = new BigNumber(value);
          var actual = new BigNumber(this._obj);
          almostEqualAssertion.apply(this, [expected, actual, message]);
        } else {
          original.apply(this, arguments);
        }
      };
    });
  };
}
