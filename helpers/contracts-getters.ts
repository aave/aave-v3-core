import {
  AaveProtocolDataProviderFactory,
  ATokenFactory,
  ReservesSetupHelperFactory,
  PoolAddressesProviderFactory,
  PoolAddressesProviderRegistryFactory,
  PoolConfiguratorFactory,
  PoolFactory,
  RateOracleFactory,
  MintableERC20Factory,
  MockFlashLoanReceiverFactory,
  MockStableDebtTokenFactory,
  MockVariableDebtTokenFactory,
  PriceOracleFactory,
  RateOracleSetupHelperFactory,
  StableDebtTokenFactory,
  VariableDebtTokenFactory,
  WETH9MockedFactory,
  AaveOracleFactory,
  MockPoolFactory,
  MockInitializableImpleFactory,
  MockInitializableImpleV2Factory,
  SupplyLogicFactory,
  BorrowLogicFactory,
  LiquidationLogicFactory,
  BridgeLogicFactory,
  ACLManagerFactory,
  EModeLogicFactory,
} from '../types';
import { IERC20DetailedFactory } from '../types/IERC20DetailedFactory';
import { getEthersSigners, MockTokenMap } from './contracts-helpers';
import { DRE, getDb, notFalsyOrZeroAddress } from './misc-utils';
import { eContractid, tEthereumAddress, TokenContractId } from './types';

export const getFirstSigner = async () => (await getEthersSigners())[0];

export const getPoolAddressesProvider = async (address?: tEthereumAddress) => {
  return await PoolAddressesProviderFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PoolAddressesProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
};

export const getACLManager = async (address?: tEthereumAddress) => {
  return await ACLManagerFactory.connect(
    address || (await getDb().get(`${eContractid.ACLManager}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );
};

export const getPoolConfiguratorProxy = async (address?: tEthereumAddress) => {
  return await PoolConfiguratorFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PoolConfigurator}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
};

export const getSupplyLogic = async (address?: tEthereumAddress) =>
  await SupplyLogicFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.SupplyLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getBridgeLogic = async (address?: tEthereumAddress) =>
  await BridgeLogicFactory.connect(
    address || (await getDb().get(`${eContractid.Pool}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getBorrowLogic = async (address?: tEthereumAddress) =>
  await BorrowLogicFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.BorrowLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getLiquidationLogic = async (address?: tEthereumAddress) =>
  await LiquidationLogicFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LiquidationLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getEModeLogic = async (address?: tEthereumAddress) =>
  await EModeLogicFactory.connect(
    address || (await getDb().get(`${eContractid.EModeLogic}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getPool = async (address?: tEthereumAddress) =>
  await PoolFactory.connect(
    address || (await getDb().get(`${eContractid.Pool}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getPriceOracle = async (address?: tEthereumAddress) =>
  await PriceOracleFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PriceOracle}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAToken = async (address?: tEthereumAddress) =>
  await ATokenFactory.connect(
    address || (await getDb().get(`${eContractid.AToken}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getStableDebtToken = async (address?: tEthereumAddress) =>
  await StableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.StableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getVariableDebtToken = async (address?: tEthereumAddress) =>
  await VariableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.VariableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMintableERC20 = async (address: tEthereumAddress) =>
  await MintableERC20Factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MintableERC20}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getIErc20Detailed = async (address: tEthereumAddress) =>
  await IERC20DetailedFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.IERC20Detailed}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAaveProtocolDataProvider = async (address?: tEthereumAddress) =>
  await AaveProtocolDataProviderFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.AaveProtocolDataProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAaveOracle = async (address?: tEthereumAddress) =>
  await AaveOracleFactory.connect(
    address || (await getDb().get(`${eContractid.AaveOracle}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockFlashLoanReceiver = async (address?: tEthereumAddress) =>
  await MockFlashLoanReceiverFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockFlashLoanReceiver}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getRateOracle = async (address?: tEthereumAddress) =>
  await RateOracleFactory.connect(
    address || (await getDb().get(`${eContractid.RateOracle}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getAllMockedTokens = async () => {
  const db = getDb();
  const tokens: MockTokenMap = await Object.keys(TokenContractId).reduce<Promise<MockTokenMap>>(
    async (acc, tokenSymbol) => {
      const accumulator = await acc;
      const address = db.get(`${tokenSymbol.toUpperCase()}.${DRE.network.name}`).value().address;
      accumulator[tokenSymbol] = await getMintableERC20(address);
      return Promise.resolve(acc);
    },
    Promise.resolve({})
  );
  return tokens;
};

export const getPairsTokenAggregator = (
  allAssetsAddresses: {
    [tokenSymbol: string]: tEthereumAddress;
  },
  aggregatorsAddresses: { [tokenSymbol: string]: tEthereumAddress }
): [string[], string[]] => {
  const { ETH, WETH, ...assetsAddressesWithoutEth } = allAssetsAddresses;

  const pairs = Object.entries(assetsAddressesWithoutEth).map(([tokenSymbol, tokenAddress]) => {
    //if (true/*tokenSymbol !== 'WETH' && tokenSymbol !== 'ETH' && tokenSymbol !== 'LpWETH'*/) {
    const aggregatorAddressIndex = Object.keys(aggregatorsAddresses).findIndex(
      (value) => value === tokenSymbol
    );
    const [, aggregatorAddress] = (
      Object.entries(aggregatorsAddresses) as [string, tEthereumAddress][]
    )[aggregatorAddressIndex];
    return [tokenAddress, aggregatorAddress];
    //}
  }) as [string, string][];

  const mappedPairs = pairs.map(([asset]) => asset);
  const mappedAggregators = pairs.map(([, source]) => source);

  return [mappedPairs, mappedAggregators];
};

export const getPoolAddressesProviderRegistry = async (address?: tEthereumAddress) =>
  await PoolAddressesProviderRegistryFactory.connect(
    notFalsyOrZeroAddress(address)
      ? address
      : (
          await getDb()
            .get(`${eContractid.PoolAddressesProviderRegistry}.${DRE.network.name}`)
            .value()
        ).address,
    await getFirstSigner()
  );

export const getRateOracleSetupHelper = async (address?: tEthereumAddress) =>
  await RateOracleSetupHelperFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.RateOracleSetupHelper}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getReservesSetupHelper = async (address?: tEthereumAddress) =>
  await ReservesSetupHelperFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.ReservesSetupHelper}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getWETHMocked = async (address?: tEthereumAddress) =>
  await WETH9MockedFactory.connect(
    address || (await getDb().get(`${eContractid.WETHMocked}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockVariableDebtToken = async (address?: tEthereumAddress) =>
  await MockVariableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockVariableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockStableDebtToken = async (address?: tEthereumAddress) =>
  await MockStableDebtTokenFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockStableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockPool = async (address?: tEthereumAddress) =>
  await MockPoolFactory.connect(
    address || (await getDb().get(`${eContractid.MockPool}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockInitializableImple = async (address?: tEthereumAddress) =>
  await MockInitializableImpleFactory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockInitializableImple}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockInitializableImpleV2 = async (address?: tEthereumAddress) =>
  await MockInitializableImpleV2Factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockInitializableImpleV2}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getChainId = async () => (await DRE.ethers.provider.getNetwork()).chainId;
