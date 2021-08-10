import { task } from 'hardhat/config';
import { printContracts } from '../../helpers/misc-utils';

task('print-contracts', 'Inits the DRE, to have access to all the plugins').setAction(
  async ({}, localHRE) => {
    await localHRE.run('set-DRE');
    printContracts();
  }
);
