import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { MAX_UINT_AMOUNT, RAY, WAD, HALF_RAY, HALF_WAD } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { WadRayMathWrapper, WadRayMathWrapper__factory } from '../types';
import { getFirstSigner } from '@aave/deploy-v3/dist/helpers/utilities/tx';
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
  });

  it('Constants', async () => {
    const mathConstants = await wrapper.computeConstants(BigNumber.from(10).pow(27));
    expect(mathConstants[0]).to.be.eq('134217728');
    expect(mathConstants[1]).to.be.eq('7450580596923828125');
    expect(mathConstants[2]).to.be.eq(
      '15501966263465142598656971426345627788199674109747006013765225610400761231029'
    );
    expect(mathConstants[3]).to.be.eq(
      '862718293348820473429344482784628181556388621521298319395315527974912'
    );
  });

  it('rayMul()', async () => {
    const a = BigNumber.from('134534543232342353231234');
    const b = BigNumber.from('13265462389132757665657');

    expect(await wrapper.rayMul(a, b)).to.be.eq(a.rayMul(b));
    expect(await wrapper.rayMul(0, b)).to.be.eq('0');
    expect(await wrapper.rayMul(a, 0)).to.be.eq('0');
  });

  it('rayMul(), intermediate > max', async () => {
    const max_value = BigNumber.from(2).pow(256);
    const ratio = BigNumber.from(10).pow(9);
    const ray = BigNumber.from(10).pow(27);
    const balance_in_ray = max_value.div(ratio).div(ray).add(1).wadToRay();

    const multiplier = ray.add(1); // Done to have rounding

    const mid = balance_in_ray.mul(multiplier);
    const res = balance_in_ray.rayMul(multiplier);

    const actual = await wrapper.rayMulSlow(balance_in_ray, multiplier);

    expect(balance_in_ray).to.be.lt(max_value);
    expect(mid).to.be.gt(max_value);
    expect(actual).to.be.eq(res);
  });

  it('rayDiv()', async () => {
    const a = BigNumber.from('134534543232342353231234');
    const b = BigNumber.from('13265462389132757665657');

    expect(await wrapper.rayDiv(a, b)).to.be.eq(a.rayDiv(b));

    const halfB = b.div(2);
    const tooLargeA = BigNumber.from(MAX_UINT_AMOUNT).sub(halfB).div(RAY).add(1);

    await expect(wrapper.rayDiv(tooLargeA, b)).to.be.reverted;
  });

  it('rayToWad()', async () => {
    const a = BigNumber.from('10').pow(27);
    expect(await wrapper.rayToWad(a)).to.be.eq(a.rayToWad());

    const halfRatio = BigNumber.from(10).pow(9).div(2);
    const tooLarge = BigNumber.from(MAX_UINT_AMOUNT).sub(halfRatio).add(1);

    await expect(wrapper.rayToWad(tooLarge)).to.be.reverted;
  });

  it('wadToRay()', async () => {
    const a = BigNumber.from('10').pow(18);
    expect(await wrapper.wadToRay(a)).to.be.eq(a.wadToRay());

    const ratio = BigNumber.from(10).pow(9);
    const tooLarge = BigNumber.from(MAX_UINT_AMOUNT).div(ratio).add(1);
    await expect(wrapper.wadToRay(tooLarge)).to.be.reverted;
  });
});
