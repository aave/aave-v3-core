import { expect } from 'chai';
import { ONE_ADDRESS } from '../helpers/constants';
import { ProtocolErrors } from '../helpers/types';
import { TestEnv, makeSuite } from './helpers/make-suite';

makeSuite('PoolConfigurator: Modifiers', (testEnv: TestEnv) => {
  const {
    CALLER_NOT_POOL_ADMIN,
    CALLER_NOT_POOL_OR_EMERGENCY_ADMIN,
    CALLER_NOT_RISK_OR_POOL_ADMIN,
    CALLER_NOT_EMERGENCY_ADMIN,
    CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN,
  } = ProtocolErrors;

  it('Test the accessibility of onlyAssetListingOrPoolAdmins modified functions', async () => {
    const { configurator, users } = testEnv;
    const nonPoolAdmin = users[2];

    const randomAddress = ONE_ADDRESS;
    const randomNumber = '0';
    const randomInitReserve = [
      {
        aTokenImpl: randomAddress,
        stableDebtTokenImpl: randomAddress,
        variableDebtTokenImpl: randomAddress,
        underlyingAssetDecimals: randomNumber,
        interestRateStrategyAddress: randomAddress,
        underlyingAsset: randomAddress,
        treasury: randomAddress,
        incentivesController: randomAddress,
        aTokenName: 'MOCK',
        aTokenSymbol: 'MOCK',
        variableDebtTokenName: 'MOCK',
        variableDebtTokenSymbol: 'MOCK',
        stableDebtTokenName: 'MOCK',
        stableDebtTokenSymbol: 'MOCK',
        params: '0x10',
      },
    ];

    const calls = [{ fn: 'initReserves', args: [randomInitReserve] }];
    for (const call of calls) {
      await expect(
        configurator.connect(nonPoolAdmin.signer)[call.fn](...call.args)
      ).to.be.revertedWith(CALLER_NOT_ASSET_LISTING_OR_POOL_ADMIN);
    }
  });

  it('Test the accessibility of onlyPoolAdmin modified functions', async () => {
    const { configurator, users } = testEnv;
    const nonPoolAdmin = users[2];

    const randomAddress = ONE_ADDRESS;
    const randomNumber = '0';
    const randomUpdateAToken = {
      asset: randomAddress,
      treasury: randomAddress,
      incentivesController: randomAddress,
      name: 'MOCK',
      symbol: 'MOCK',
      implementation: randomAddress,
      params: '0x10',
    };
    const randomUpdateDebtToken = {
      asset: randomAddress,
      incentivesController: randomAddress,
      name: 'MOCK',
      symbol: 'MOCK',
      implementation: randomAddress,
      params: '0x10',
    };

    const calls = [
      { fn: 'dropReserve', args: [randomAddress] },
      { fn: 'updateAToken', args: [randomUpdateAToken] },
      { fn: 'updateStableDebtToken', args: [randomUpdateDebtToken] },
      { fn: 'updateVariableDebtToken', args: [randomUpdateDebtToken] },
      { fn: 'setReserveActive', args: [randomAddress, true] },
      { fn: 'setReserveActive', args: [randomAddress, false] },
      { fn: 'updateFlashloanPremiumTotal', args: [randomNumber] },
      { fn: 'updateFlashloanPremiumToProtocol', args: [randomNumber] },
      { fn: 'updateFlashloanPremiumToProtocol', args: [randomNumber] },
    ];
    for (const call of calls) {
      await expect(
        configurator.connect(nonPoolAdmin.signer)[call.fn](...call.args)
      ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
    }
  });

  it('Test the accessibility of onlyRiskOrPoolAdmins modified functions', async () => {
    const { configurator, users } = testEnv;
    const nonRiskOrPoolAdmins = users[3];

    const randomAddress = ONE_ADDRESS;
    const randomNumber = '0';

    const calls = [
      { fn: 'setReserveBorrowing', args: [randomAddress, false] },
      { fn: 'setReserveBorrowing', args: [randomAddress, true] },
      {
        fn: 'configureReserveAsCollateral',
        args: [randomAddress, randomNumber, randomNumber, randomNumber],
      },
      { fn: 'setReserveStableRateBorrowing', args: [randomAddress, true] },
      { fn: 'setReserveStableRateBorrowing', args: [randomAddress, false] },
      { fn: 'setReserveFreeze', args: [randomAddress, true] },
      { fn: 'setReserveFreeze', args: [randomAddress, false] },
      { fn: 'setReserveFactor', args: [randomAddress, randomNumber] },
      { fn: 'setBorrowCap', args: [randomAddress, randomNumber] },
      { fn: 'setSupplyCap', args: [randomAddress, randomNumber] },
      { fn: 'setReserveInterestRateStrategyAddress', args: [randomAddress, randomAddress] },
      {
        fn: 'setEModeCategory',
        args: [randomNumber, randomNumber, randomNumber, randomNumber, randomAddress, ''],
      },
      { fn: 'setAssetEModeCategory', args: [randomAddress, randomNumber] },
      { fn: 'setDebtCeiling', args: [randomAddress, randomNumber] },
    ];
    for (const call of calls) {
      await expect(
        configurator.connect(nonRiskOrPoolAdmins.signer)[call.fn](...call.args)
      ).to.be.revertedWith(CALLER_NOT_RISK_OR_POOL_ADMIN);
    }
  });

  it('Tries to pause reserve with non-emergency-admin account (revert expected)', async () => {
    const { configurator, weth, riskAdmin } = testEnv;
    await expect(
      configurator.connect(riskAdmin.signer).setReservePause(weth.address, true),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_OR_EMERGENCY_ADMIN);
  });

  it('Tries to unpause reserve with non-emergency-admin account (revert expected)', async () => {
    const { configurator, weth, riskAdmin } = testEnv;
    await expect(
      configurator.connect(riskAdmin.signer).setReservePause(weth.address, false),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_OR_EMERGENCY_ADMIN);
  });

  it('Tries to pause pool with not emergency admin (revert expected)', async () => {
    const { users, configurator } = testEnv;
    await expect(configurator.connect(users[0].signer).setPoolPause(true)).to.be.revertedWith(
      CALLER_NOT_EMERGENCY_ADMIN
    );
  });
});
