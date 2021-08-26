import { TestEnv, makeSuite } from './helpers/make-suite';
import { MAX_UINT_AMOUNT, RAY, WAD, HALF_RAY, HALF_WAD } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import BigNumber from 'bignumber.js';
import { WadRayMathWrapper, WadRayMathWrapperFactory } from '../types';
import { getFirstSigner } from '../helpers/contracts-getters';
import { expect } from 'chai';
import './helpers/utils/math';

makeSuite('LTV validation tests', (testEnv: TestEnv) => {
  const { MATH_MULTIPLICATION_OVERFLOW, MATH_ADDITION_OVERFLOW } = ProtocolErrors;

  let wrapper: WadRayMathWrapper;

  before('setup', async () => {
    const factory = new WadRayMathWrapperFactory(await getFirstSigner());
    wrapper = await ((await factory.deploy()) as WadRayMathWrapper).deployed();
  });

  it('Plain getters', async () => {
    expect((await wrapper.wad()).toString()).to.be.eq(WAD);
    expect((await wrapper.halfWad()).toString()).to.be.eq(HALF_WAD);
    expect((await wrapper.ray()).toString()).to.be.eq(RAY);
    expect((await wrapper.halfRay()).toString()).to.be.eq(HALF_RAY);
  });

  it('wadMul()', async () => {
    const a = new BigNumber('134534543232342353231234');
    const b = new BigNumber('13265462389132757665657');

    expect((await wrapper.wadMul(a.toFixed(0), b.toFixed(0))).toString()).to.be.eq(
      a.wadMul(b).toFixed(0)
    );
    expect((await wrapper.wadMul(0, b.toFixed(0))).toString()).to.be.eq('0');
    expect((await wrapper.wadMul(a.toFixed(0), 0)).toString()).to.be.eq('0');

    const tooLargeA = new BigNumber(MAX_UINT_AMOUNT).minus(HALF_WAD).dividedToIntegerBy(b).plus(1);
    await expect(wrapper.wadMul(tooLargeA.toFixed(0), b.toFixed(0))).to.be.revertedWith(
      MATH_MULTIPLICATION_OVERFLOW
    );
  });

  it('wadDiv()', async () => {
    const a = new BigNumber('134534543232342353231234');
    const b = new BigNumber('13265462389132757665657');

    expect((await wrapper.wadDiv(a.toFixed(0), b.toFixed(0))).toString()).to.be.eq(
      a.wadDiv(b).toFixed(0)
    );

    const halfB = b.dividedToIntegerBy(2);
    const tooLargeA = new BigNumber(MAX_UINT_AMOUNT).minus(halfB).dividedToIntegerBy(WAD).plus(1);

    await expect(wrapper.wadDiv(tooLargeA.toFixed(0), b.toFixed(0))).to.be.revertedWith(
      MATH_MULTIPLICATION_OVERFLOW
    );
  });

  it('rayMul()', async () => {
    const a = new BigNumber('134534543232342353231234');
    const b = new BigNumber('13265462389132757665657');

    expect((await wrapper.rayMul(a.toFixed(0), b.toFixed(0))).toString()).to.be.eq(
      a.rayMul(b).toFixed(0)
    );
    expect((await wrapper.rayMul(0, b.toFixed(0))).toString()).to.be.eq('0');
    expect((await wrapper.rayMul(a.toFixed(0), 0)).toString()).to.be.eq('0');

    const tooLargeA = new BigNumber(MAX_UINT_AMOUNT).minus(HALF_RAY).dividedToIntegerBy(b).plus(1);
    await expect(wrapper.rayMul(tooLargeA.toFixed(0), b.toFixed(0))).to.be.revertedWith(
      MATH_MULTIPLICATION_OVERFLOW
    );
  });

  it('rayDiv()', async () => {
    const a = new BigNumber('134534543232342353231234');
    const b = new BigNumber('13265462389132757665657');

    expect((await wrapper.rayDiv(a.toFixed(0), b.toFixed(0))).toString()).to.be.eq(
      a.rayDiv(b).toFixed(0)
    );

    const halfB = b.dividedToIntegerBy(2);
    const tooLargeA = new BigNumber(MAX_UINT_AMOUNT).minus(halfB).dividedToIntegerBy(RAY).plus(1);

    await expect(wrapper.rayDiv(tooLargeA.toFixed(0), b.toFixed(0))).to.be.revertedWith(
      MATH_MULTIPLICATION_OVERFLOW
    );
  });

  it('rayToWad()', async () => {
    const a = new BigNumber('10').pow(27);
    expect(await wrapper.rayToWad(a.toFixed(0))).to.be.eq(a.rayToWad().toFixed());

    const halfRatio = new BigNumber(10).pow(9).dividedToIntegerBy(2);
    const tooLarge = new BigNumber(MAX_UINT_AMOUNT).minus(halfRatio).plus(1);

    await expect(wrapper.rayToWad(tooLarge.toFixed(0))).to.be.revertedWith(MATH_ADDITION_OVERFLOW);
  });

  it('wadToRay()', async () => {
    const a = new BigNumber('10').pow(18);
    expect(await wrapper.wadToRay(a.toFixed(0))).to.be.eq(a.wadToRay().toFixed());

    const ratio = new BigNumber(10).pow(9);
    const tooLarge = new BigNumber(MAX_UINT_AMOUNT).dividedToIntegerBy(ratio).plus(1);
    await expect(wrapper.wadToRay(tooLarge.toFixed(0))).to.be.revertedWith(
      MATH_MULTIPLICATION_OVERFLOW
    );
  });
});
