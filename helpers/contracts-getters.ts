import {
  AaveProtocolDataProvider__factory,
  AToken__factory,
  ReservesSetupHelper__factory,
  PoolAddressesProvider__factory,
  PoolAddressesProviderRegistry__factory,
  PoolConfigurator__factory,
  Pool__factory,
  MintableERC20__factory,
  MockFlashLoanReceiver__factory,
  MockStableDebtToken__factory,
  MockVariableDebtToken__factory,
  PriceOracle__factory,
  StableDebtToken__factory,
  VariableDebtToken__factory,
  WETH9Mocked__factory,
  AaveOracle__factory,
  MockPool__factory,
  MockInitializableImple__factory,
  MockInitializableImpleV2__factory,
  SupplyLogic__factory,
  BorrowLogic__factory,
  LiquidationLogic__factory,
  BridgeLogic__factory,
  ACLManager__factory,
  EModeLogic__factory,
  DefaultReserveInterestRateStrategy,
  DefaultReserveInterestRateStrategy__factory,
  FlashLoanLogic__factory,
  IERC20Detailed__factory,
} from '../types';
import { getEthersSigners, MockTokenMap } from './contracts-helpers';
import { DRE, getDb, notFalsyOrZeroAddress } from './misc-utils';
import { eContractid, tEthereumAddress, TokenContractId } from './types';

export const getFirstSigner = async () => (await getEthersSigners())[0];

export const getPoolAddressesProvider = async (address?: tEthereumAddress) => {
  return await PoolAddressesProvider__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PoolAddressesProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
};

export const getACLManager = async (address?: tEthereumAddress) => {
  return await ACLManager__factory.connect(
    address || (await getDb().get(`${eContractid.ACLManager}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );
};

export const getPoolConfiguratorProxy = async (address?: tEthereumAddress) => {
  return await PoolConfigurator__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PoolConfigurator}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );
};

export const getSupplyLogic = async (address?: tEthereumAddress) =>
  await SupplyLogic__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.SupplyLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getBridgeLogic = async (address?: tEthereumAddress) =>
  await BridgeLogic__factory.connect(
    address || (await getDb().get(`${eContractid.Pool}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getBorrowLogic = async (address?: tEthereumAddress) =>
  await BorrowLogic__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.BorrowLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getLiquidationLogic = async (address?: tEthereumAddress) =>
  await LiquidationLogic__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.LiquidationLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getEModeLogic = async (address?: tEthereumAddress) =>
  await EModeLogic__factory.connect(
    address || (await getDb().get(`${eContractid.EModeLogic}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getFlashLoanLogic = async (address?: tEthereumAddress) =>
  await FlashLoanLogic__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.FlashLoanLogic}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getPool = async (address?: tEthereumAddress) =>
  await Pool__factory.connect(
    address || (await getDb().get(`${eContractid.Pool}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getPriceOracle = async (address?: tEthereumAddress) =>
  await PriceOracle__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.PriceOracle}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAToken = async (address?: tEthereumAddress) =>
  await AToken__factory.connect(
    address || (await getDb().get(`${eContractid.AToken}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getStableDebtToken = async (address?: tEthereumAddress) =>
  await StableDebtToken__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.StableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getVariableDebtToken = async (address?: tEthereumAddress) =>
  await VariableDebtToken__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.VariableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getIRStrategy = async (address?: tEthereumAddress) =>
  await DefaultReserveInterestRateStrategy__factory.connect(
    address ||
      (
        await getDb()
          .get(`${eContractid.DefaultReserveInterestRateStrategy}.${DRE.network.name}`)
          .value()
      ).address,
    await getFirstSigner()
  );

export const getMintableERC20 = async (address: tEthereumAddress) =>
  await MintableERC20__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MintableERC20}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getIErc20Detailed = async (address: tEthereumAddress) =>
  await IERC20Detailed__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.IERC20Detailed}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAaveProtocolDataProvider = async (address?: tEthereumAddress) =>
  await AaveProtocolDataProvider__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.AaveProtocolDataProvider}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getAaveOracle = async (address?: tEthereumAddress) =>
  await AaveOracle__factory.connect(
    address || (await getDb().get(`${eContractid.AaveOracle}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockFlashLoanReceiver = async (address?: tEthereumAddress) =>
  await MockFlashLoanReceiver__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockFlashLoanReceiver}.${DRE.network.name}`).value()
      ).address,
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
  await PoolAddressesProviderRegistry__factory.connect(
    notFalsyOrZeroAddress(address)
      ? address
      : (
          await getDb()
            .get(`${eContractid.PoolAddressesProviderRegistry}.${DRE.network.name}`)
            .value()
        ).address,
    await getFirstSigner()
  );

export const getReservesSetupHelper = async (address?: tEthereumAddress) =>
  await ReservesSetupHelper__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.ReservesSetupHelper}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getWETHMocked = async (address?: tEthereumAddress) =>
  await WETH9Mocked__factory.connect(
    address || (await getDb().get(`${eContractid.WETHMocked}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockVariableDebtToken = async (address?: tEthereumAddress) =>
  await MockVariableDebtToken__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockVariableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockStableDebtToken = async (address?: tEthereumAddress) =>
  await MockStableDebtToken__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockStableDebtToken}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockPool = async (address?: tEthereumAddress) =>
  await MockPool__factory.connect(
    address || (await getDb().get(`${eContractid.MockPool}.${DRE.network.name}`).value()).address,
    await getFirstSigner()
  );

export const getMockInitializableImple = async (address?: tEthereumAddress) =>
  await MockInitializableImple__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockInitializableImple}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getMockInitializableImpleV2 = async (address?: tEthereumAddress) =>
  await MockInitializableImpleV2__factory.connect(
    address ||
      (
        await getDb().get(`${eContractid.MockInitializableImpleV2}.${DRE.network.name}`).value()
      ).address,
    await getFirstSigner()
  );

export const getChainId = async () => (await DRE.ethers.provider.getNetwork()).chainId;
