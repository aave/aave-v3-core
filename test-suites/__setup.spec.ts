import rawBRE from 'hardhat';
import { initializeMakeSuite } from './helpers/make-suite';

before(async () => {
  const FORK = process.env.FORK;

  process.env.MARKET_NAME = 'Aave';

  if (FORK) {
    //await rawBRE.run('aave:mainnet');
    await rawBRE.deployments.fixture(['market']);
  } else {
    console.log('-> Deploying market...');
    //await buildTestEnv(deployer, secondaryWallet);
    // Deploy Aave Market as fixture
    await rawBRE.deployments.fixture(['market']);
  }
  console.log('-> Deployed market');

  console.log('-> Initializing test enviroment');
  await initializeMakeSuite();
  console.log('\n***************');
  console.log('Setup and snapshot finished');
  console.log('***************\n');
});
