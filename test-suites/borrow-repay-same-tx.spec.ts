import { expect } from 'chai';
import { ProtocolErrors } from '../helpers/types';
import { MockBorrowRepayTest, MockBorrowRepayTestFactory } from '../types';
import { getFirstSigner } from '../helpers/contracts-getters';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('Borrow/Repay in the same tx', (testEnv: TestEnv) => {
  const { VL_SAME_BLOCK_BORROW_REPAY } = ProtocolErrors;

  let testContract: MockBorrowRepayTest;

  before(async () => {
    const { weth, dai, pool } = testEnv;

    testContract = await (
      await new MockBorrowRepayTestFactory(await getFirstSigner())
    ).deploy(pool.address, weth.address, dai.address);
  });

  it('Executes a borrow/repay in the same transaction at variable and reverts', async () => {
    await expect(testContract.executeBorrowRepayVariable()).to.be.revertedWith(
      VL_SAME_BLOCK_BORROW_REPAY
    );
  });

  it('Executes a borrow/repay in the same transaction at stable and reverts', async () => {
    await expect(testContract.executeBorrowRepayStable()).to.be.revertedWith(
      VL_SAME_BLOCK_BORROW_REPAY
    );
  });
});
