import { task } from 'hardhat/config';
import {
  deployPriceOracle,
  deployAaveOracle,
  deployRateOracle,
} from '../../helpers/contracts-deployments';
import {
  setInitialAssetPricesInOracle,
  deployAllMockAggregators,
  setInitialMarketRatesInRatesOracleByHelper,
} from '../../helpers/oracles-helpers';
import { ICommonConfiguration, iAssetBase, TokenContractId } from '../../helpers/types';
import { waitForTx } from '../../helpers/misc-utils';
import { getAllAggregatorsAddresses, getAllTokenAddresses } from '../../helpers/mock-helpers';
import {
  getAllMockedTokens,
  getPoolAddressesProvider,
  getPairsTokenAggregator,
} from '../../helpers/contracts-getters';
import { deployWETHMocked } from '../../helpers/contracts-deployments';
import AaveConfig from '../../marketConfig';
import { ethers } from 'ethers';

task('dev:deploy-oracles', 'Deploy oracles for dev enviroment')
  .addFlag('verify', 'Verify contracts at Etherscan')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-DRE');
    const poolConfig = AaveConfig;
    const {
      Mocks: { AllAssetsInitialPrices },
      ProtocolGlobalParams: { UsdAddress, MockUsdPriceInWei },
      RateOracleRatesCommon,
    } = poolConfig as ICommonConfiguration;

    const defaultTokenList = {
      ...Object.fromEntries(Object.keys(TokenContractId).map((symbol) => [symbol, ''])),
      USD: UsdAddress,
    } as iAssetBase<string>;
    const mockTokens = await getAllMockedTokens();
    const mockTokensAddress = Object.keys(mockTokens).reduce<iAssetBase<string>>((prev, curr) => {
      prev[curr as keyof iAssetBase<string>] = mockTokens[curr].address;
      return prev;
    }, defaultTokenList);
    const addressesProvider = await getPoolAddressesProvider();
    const admin = await addressesProvider.getPoolAdmin();

    const fallbackOracle = await deployPriceOracle(verify);
    await waitForTx(await fallbackOracle.setEthUsdPrice(MockUsdPriceInWei));
    await setInitialAssetPricesInOracle(AllAssetsInitialPrices, mockTokensAddress, fallbackOracle);

    const mockAggregators = await deployAllMockAggregators(AllAssetsInitialPrices, verify);

    const allTokenAddresses = getAllTokenAddresses(mockTokens);
    const allAggregatorsAddresses = getAllAggregatorsAddresses(mockAggregators);

    const [tokens, aggregators] = getPairsTokenAggregator(
      allTokenAddresses,
      allAggregatorsAddresses
    );

    let wethAddress = poolConfig.WETH;
    if (!wethAddress) {
      const currentNetwork = process.env.FORK ? process.env.FORK : localBRE.network.name;
      if (currentNetwork.includes('main')) {
        throw new Error('WETH not set at mainnet configuration.');
      } else {
        const weth = await deployWETHMocked();
        wethAddress = weth.address;
      }
    }

    await deployAaveOracle(
      [
        tokens,
        aggregators,
        fallbackOracle.address,
        wethAddress,
        ethers.constants.WeiPerEther.toString(),
      ],
      verify
    );
    await waitForTx(await addressesProvider.setPriceOracle(fallbackOracle.address));

    const rateOracle = await deployRateOracle(verify);
    await waitForTx(await addressesProvider.setRateOracle(rateOracle.address));

    const { USD, ...tokensAddressesWithoutUsd } = allTokenAddresses;
    const allReservesAddresses = {
      ...tokensAddressesWithoutUsd,
    };
    await setInitialMarketRatesInRatesOracleByHelper(
      RateOracleRatesCommon,
      allReservesAddresses,
      rateOracle,
      admin
    );
  });
