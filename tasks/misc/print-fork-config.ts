import { task } from 'hardhat/config';
import { getAaveProtocolDataProvider } from '../../helpers/contracts-getters';

task('print-config:fork', 'Deploy development enviroment').setAction(async (_, DRE) => {
  await DRE.run('set-DRE');
  await DRE.run('aave:mainnet');

  const dataProvider = await getAaveProtocolDataProvider();
  await DRE.run('print-config', { dataProvider: dataProvider.address, pool: 'Aave' });
});
