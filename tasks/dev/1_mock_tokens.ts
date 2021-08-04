import { task } from 'hardhat/config';
import { deployAllMockTokens } from '../../helpers/contracts-deployments';

task('dev:deploy-mock-tokens', 'Deploy mock tokens for dev enviroment').setAction(
  async (_, localBRE) => {
    await localBRE.run('set-DRE');
    await deployAllMockTokens();
  }
);
