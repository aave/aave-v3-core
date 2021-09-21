import { expect } from 'chai';
import { utils } from 'ethers';
import { MAX_UINT_AMOUNT } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('PoolConfigurator: Liquidation Protocol Fee', (testEnv: TestEnv) => {
  const { RC_INVALID_LIQUIDATION_PROTOCOL_FEE } = ProtocolErrors;

  before(async () => {
    const { weth, pool, dai, usdc } = testEnv;

    const mintedAmount = utils.parseEther('1000000000');
    await dai.mint(mintedAmount);
    await weth.mint(mintedAmount);
    await usdc.mint(mintedAmount);

    await dai.approve(pool.address, MAX_UINT_AMOUNT);
    await weth.approve(pool.address, MAX_UINT_AMOUNT);
    await usdc.approve(pool.address, MAX_UINT_AMOUNT);
  });

  it('Reserves should initially have protocol liquidation fee set to 0', async () => {
    const { dai, usdc, helpersContract } = testEnv;

    let usdcLiquidationProtocolFee = await helpersContract.getLiquidationProtocolFee(usdc.address);
    let daiLiquidationProtocolFee = await helpersContract.getLiquidationProtocolFee(dai.address);

    expect(usdcLiquidationProtocolFee).to.be.equal('0');
    expect(daiLiquidationProtocolFee).to.be.equal('0');
  });

  it('Sets the protocol liquidation fee to 1000 (10.00co%)', async () => {
    const { configurator, dai, usdc, helpersContract } = testEnv;

    const liquidationProtocolFee = 1000;

    expect(await configurator.setLiquidationProtocolFee(usdc.address, liquidationProtocolFee))
      .to.emit(configurator, 'LiquidationProtocolFeeChanged')
      .withArgs(usdc.address, liquidationProtocolFee);
    expect(await configurator.setLiquidationProtocolFee(dai.address, liquidationProtocolFee))
      .to.emit(configurator, 'LiquidationProtocolFeeChanged')
      .withArgs(dai.address, liquidationProtocolFee);

    const usdcLiquidationProtocolFee = await helpersContract.getLiquidationProtocolFee(
      usdc.address
    );
    const daiLiquidationProtocolFee = await helpersContract.getLiquidationProtocolFee(dai.address);

    expect(usdcLiquidationProtocolFee).to.be.equal(liquidationProtocolFee);
    expect(daiLiquidationProtocolFee).to.be.equal(liquidationProtocolFee);
  });

  it('Tries to set the protocol liquidation fee to 10001 and reverts', async () => {
    const { configurator, dai, usdc } = testEnv;

    const liquidationProtocolFee = 10001;

    expect(
      configurator.setLiquidationProtocolFee(usdc.address, liquidationProtocolFee)
    ).to.be.revertedWith(RC_INVALID_LIQUIDATION_PROTOCOL_FEE);
    expect(
      configurator.setLiquidationProtocolFee(dai.address, liquidationProtocolFee)
    ).to.be.revertedWith(RC_INVALID_LIQUIDATION_PROTOCOL_FEE);
  });
});
