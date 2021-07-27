import { task } from 'hardhat/config';
import { getAaveProtocolDataProvider } from '../../helpers/contracts-getters';

task('print-config:fork', 'Deploy development enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, DRE) => {
    await DRE.run('set-DRE');
    await DRE.run('aave:mainnet');

    const dataProvider = await getAaveProtocolDataProvider();
    await DRE.run('print-config', { dataProvider: dataProvider.address, pool: 'Aave' });
  });
