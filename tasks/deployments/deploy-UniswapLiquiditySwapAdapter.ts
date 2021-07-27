import { task } from 'hardhat/config';

import { UniswapLiquiditySwapAdapterFactory } from '../../types';
import { verifyContract } from '../../helpers/contracts-helpers';
import { getFirstSigner } from '../../helpers/contracts-getters';
import { eContractid } from '../../helpers/types';

const CONTRACT_NAME = 'UniswapLiquiditySwapAdapter';

task(`deploy-${CONTRACT_NAME}`, `Deploys the ${CONTRACT_NAME} contract`)
  .addParam('provider', 'Address of the LendingPoolAddressesProvider')
  .addParam('router', 'Address of the uniswap router')
  .addParam('weth', 'Address of the weth token')
  .addFlag('verify', `Verify ${CONTRACT_NAME} contract via Etherscan API.`)
  .setAction(async ({ provider, router, weth, verify }, localBRE) => {
    await localBRE.run('set-DRE');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${CONTRACT_NAME} deployment`);
    /*const args = [
      '0x88757f2f99175387aB4C6a4b3067c77A695b0349', // lending  provider kovan address
      '0xfcd87315f0e4067070ade8682fcdbc3006631441', // uniswap router address
    ];
    */
    const uniswapRepayAdapter = await new UniswapLiquiditySwapAdapterFactory(
      await getFirstSigner()
    ).deploy(provider, router, weth);
    await uniswapRepayAdapter.deployTransaction.wait();
    console.log(`${CONTRACT_NAME}.address`, uniswapRepayAdapter.address);

    if (verify) {
      await verifyContract(eContractid.UniswapLiquiditySwapAdapter, uniswapRepayAdapter, [
        provider,
        router,
        weth,
      ]);
    }

    console.log(`\tFinished ${CONTRACT_NAME} proxy and implementation deployment`);
  });
