import {
  tEthereumAddress,
  iMultiPoolsAssets,
  IMarketRates,
  iAssetBase,
  iAssetAggregatorBase,
} from './types';
import { RateOracle } from '../types/RateOracle';
import { PriceOracle } from '../types/PriceOracle';
import { MockAggregator } from '../types/MockAggregator';
import { deployMockAggregator } from './contracts-deployments';
import { chunk, waitForTx } from './misc-utils';
import { getStableAndVariableTokensHelper } from './contracts-getters';

export const setInitialMarketRatesInRatesOracleByHelper = async (
  marketRates: iMultiPoolsAssets<IMarketRates>,
  assetsAddresses: { [x: string]: tEthereumAddress },
  rateOracleInstance: RateOracle,
  admin: tEthereumAddress
) => {
  const stableAndVariableTokenHelper = await getStableAndVariableTokensHelper();
  const assetAddresses: string[] = [];
  const borrowRates: string[] = [];
  const symbols: string[] = [];
  for (const [assetSymbol, { borrowRate }] of Object.entries(marketRates) as [
    string,
    IMarketRates
  ][]) {
    const assetAddressIndex = Object.keys(assetsAddresses).findIndex(
      (value) => value === assetSymbol
    );
    const [, assetAddress] = (Object.entries(assetsAddresses) as [string, string][])[
      assetAddressIndex
    ];
    assetAddresses.push(assetAddress);
    borrowRates.push(borrowRate);
    symbols.push(assetSymbol);
  }
  // Set borrow rates per chunks
  const ratesChunks = 20;
  const chunkedTokens = chunk(assetAddresses, ratesChunks);
  const chunkedRates = chunk(borrowRates, ratesChunks);
  const chunkedSymbols = chunk(symbols, ratesChunks);

  // Set helper as owner
  await waitForTx(await rateOracleInstance.transferOwnership(stableAndVariableTokenHelper.address));

  console.log(`- Oracle borrow initalization in ${chunkedTokens.length} txs`);
  for (let chunkIndex = 0; chunkIndex < chunkedTokens.length; chunkIndex++) {
    const tx3 = await waitForTx(
      await stableAndVariableTokenHelper.setOracleBorrowRates(
        chunkedTokens[chunkIndex],
        chunkedRates[chunkIndex],
        rateOracleInstance.address
      )
    );
    console.log(`  - Setted Oracle Borrow Rates for: ${chunkedSymbols[chunkIndex].join(', ')}`);
  }
  // Set back ownership
  await waitForTx(
    await stableAndVariableTokenHelper.setOracleOwnership(rateOracleInstance.address, admin)
  );
};

export const setInitialAssetPricesInOracle = async (
  prices: iAssetBase<tEthereumAddress>,
  assetsAddresses: iAssetBase<tEthereumAddress>,
  priceOracleInstance: PriceOracle
) => {
  for (const [assetSymbol, price] of Object.entries(prices) as [string, string][]) {
    const assetAddressIndex = Object.keys(assetsAddresses).findIndex(
      (value) => value === assetSymbol
    );
    const [, assetAddress] = (Object.entries(assetsAddresses) as [string, string][])[
      assetAddressIndex
    ];
    await waitForTx(await priceOracleInstance.setAssetPrice(assetAddress, price));
  }
};

export const deployAllMockAggregators = async (initialPrices: iAssetAggregatorBase<string>) => {
  const aggregators: { [tokenSymbol: string]: MockAggregator } = {};
  for (const tokenContractName of Object.keys(initialPrices)) {
    if (tokenContractName !== 'ETH') {
      const priceIndex = Object.keys(initialPrices).findIndex(
        (value) => value === tokenContractName
      );
      const [, price] = (Object.entries(initialPrices) as [string, string][])[priceIndex];
      aggregators[tokenContractName] = await deployMockAggregator(price);
    }
  }
  return aggregators;
};
