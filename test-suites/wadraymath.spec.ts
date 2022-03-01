import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { MAX_UINT_AMOUNT, RAY, WAD, HALF_RAY, HALF_WAD } from '../helpers/constants';
import { WadRayMathWrapper, WadRayMathWrapper__factory } from '../types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/signer';
import { makeSuite } from './helpers/make-suite';
import './helpers/utils/wadraymath';

makeSuite('WadRayMath', () => {
  let wrapper: WadRayMathWrapper;

  before('setup', async () => {
    const factory = new WadRayMathWrapper__factory(await getFirstSigner());
    wrapper = await ((await factory.deploy()) as WadRayMathWrapper).deployed();
  });

  it('Plain getters', async () => {
    expect((await wrapper.wad()).toString()).to.be.eq(WAD);
    expect((await wrapper.halfWad()).toString()).to.be.eq(HALF_WAD);
    expect((await wrapper.ray()).toString()).to.be.eq(RAY);
    expect((await wrapper.halfRay()).toString()).to.be.eq(HALF_RAY);
  });

  it('wadMul()', async () => {
    const a = BigNumber.from('134534543232342353231234');
    const b = BigNumber.from('13265462389132757665657');

    expect(await wrapper.wadMul(a, b)).to.be.eq(a.wadMul(b));
    expect(await wrapper.wadMul(0, b)).to.be.eq('0');
    expect(await wrapper.wadMul(a, 0)).to.be.eq('0');

    const tooLargeA = BigNumber.from(MAX_UINT_AMOUNT).sub(HALF_WAD).div(b).add(1);
    await expect(wrapper.wadMul(tooLargeA, b)).to.be.reverted;
  });

  it('wadDiv()', async () => {
    const a = BigNumber.from('134534543232342353231234');
    const b = BigNumber.from('13265462389132757665657');

    expect(await wrapper.wadDiv(a, b)).to.be.eq(a.wadDiv(b));

    const halfB = b.div(2);
    const tooLargeA = BigNumber.from(MAX_UINT_AMOUNT).sub(halfB).div(WAD).add(1);

    await expect(wrapper.wadDiv(tooLargeA, b)).to.be.reverted;

    await expect(wrapper.wadDiv(a, 0)).to.be.reverted;
  });

  it('rayMul()', async () => {
    const a = BigNumber.from('134534543232342353231234');
    const b = BigNumber.from('13265462389132757665657');

    expect(await wrapper.rayMul(a, b)).to.be.eq(a.rayMul(b));
    expect(await wrapper.rayMul(0, b)).to.be.eq('0');
    expect(await wrapper.rayMul(a, 0)).to.be.eq('0');

    const tooLargeA = BigNumber.from(MAX_UINT_AMOUNT).sub(HALF_RAY).div(b).add(1);
    await expect(wrapper.rayMul(tooLargeA, b)).to.be.reverted;
  });

  it('rayDiv()', async () => {
    const a = BigNumber.from('134534543232342353231234');
    const b = BigNumber.from('13265462389132757665657');

    expect(await wrapper.rayDiv(a, b)).to.be.eq(a.rayDiv(b));

    const halfB = b.div(2);
    const tooLargeA = BigNumber.from(MAX_UINT_AMOUNT).sub(halfB).div(RAY).add(1);

    await expect(wrapper.rayDiv(tooLargeA, b)).to.be.reverted;
    await expect(wrapper.rayDiv(a, 0)).to.be.reverted;
  });

  it('rayToWad()', async () => {
    const half = BigNumber.from(10).pow(9).div(2);

    const a = BigNumber.from('10').pow(27);
    expect(await wrapper.rayToWad(a)).to.be.eq(a.rayToWad());

    const roundDown = BigNumber.from('10').pow(27).add(half.sub(1));
    expect(await wrapper.rayToWad(roundDown)).to.be.eq(roundDown.rayToWad());

    const roundUp = BigNumber.from('10').pow(27).add(half);
    expect(await wrapper.rayToWad(roundUp)).to.be.eq(roundUp.rayToWad());

    const tooLarge = BigNumber.from(MAX_UINT_AMOUNT).sub(half).add(1);
    expect(await wrapper.rayToWad(tooLarge)).to.be.eq(tooLarge.rayToWad());
  });

  it('wadToRay()', async () => {
    const a = BigNumber.from('10').pow(18);
    expect(await wrapper.wadToRay(a)).to.be.eq(a.wadToRay());

    const ratio = BigNumber.from(10).pow(9);
    const tooLarge = BigNumber.from(MAX_UINT_AMOUNT).div(ratio).add(1);
    await expect(wrapper.wadToRay(tooLarge)).to.be.reverted;
  });
});
