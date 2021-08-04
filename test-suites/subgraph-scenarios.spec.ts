import { configuration as actionsConfiguration } from './helpers/actions';
import { configuration as calculationsConfiguration } from './helpers/utils/calculations';

import BigNumber from 'bignumber.js';
import { makeSuite } from './helpers/make-suite';
import { executeStory } from './helpers/scenario-engine';
import AaveConfig from '../marketConfig';

makeSuite('Subgraph scenario tests', async (testEnv) => {
  let story: any;

  before('Initializing configuration', async () => {
    const scenario = require(`./helpers/scenarios/borrow-repay-stable`);
    story = scenario.stories[0];
    // Sets BigNumber for this suite, instead of globally
    BigNumber.config({ DECIMAL_PLACES: 0, ROUNDING_MODE: BigNumber.ROUND_DOWN });

    actionsConfiguration.skipIntegrityCheck = false; //set this to true to execute solidity-coverage

    calculationsConfiguration.reservesParams = AaveConfig.ReservesConfig;
  });
  after('Reset', () => {
    // Reset BigNumber
    BigNumber.config({ DECIMAL_PLACES: 20, ROUNDING_MODE: BigNumber.ROUND_HALF_UP });
  });
  it('deposit-borrow', async () => {
    await executeStory(story, testEnv);
  });
});
