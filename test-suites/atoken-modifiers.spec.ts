import { expect } from 'chai';
import { ProtocolErrors } from '../helpers/types';
import { makeSuite, TestEnv } from './helpers/make-suite';

makeSuite('AToken: Modifiers', (testEnv: TestEnv) => {
  const { CALLER_MUST_BE_POOL } = ProtocolErrors;

  it('Tries to invoke mint not being the Pool (revert expected)', async () => {
    const { deployer, aDai } = testEnv;
    await expect(aDai.mint(deployer.address, deployer.address, '1', '1')).to.be.revertedWith(
      CALLER_MUST_BE_POOL
    );
  });

  it('Tries to invoke burn not being the Pool (revert expected)', async () => {
    const { deployer, aDai } = testEnv;
    await expect(aDai.burn(deployer.address, deployer.address, '1', '1')).to.be.revertedWith(
      CALLER_MUST_BE_POOL
    );
  });

  it('Tries to invoke transferOnLiquidation not being the Pool (revert expected)', async () => {
    const { deployer, users, aDai } = testEnv;
    await expect(
      aDai.transferOnLiquidation(deployer.address, users[0].address, '1')
    ).to.be.revertedWith(CALLER_MUST_BE_POOL);
  });

  it('Tries to invoke transferUnderlyingTo not being the Pool (revert expected)', async () => {
    const { deployer, aDai } = testEnv;
    await expect(aDai.transferUnderlyingTo(deployer.address, '1')).to.be.revertedWith(
      CALLER_MUST_BE_POOL
    );
  });
});
