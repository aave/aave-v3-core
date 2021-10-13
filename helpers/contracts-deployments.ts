import { DRE } from './misc-utils';
import { tEthereumAddress, eContractid, tStringTokenSmallUnits, TokenContractId } from './types';
import { MintableERC20 } from '../types/MintableERC20';
import { MockContract } from 'ethereum-waffle';
import { getFirstSigner } from './contracts-getters';
import {
  AaveProtocolDataProviderFactory,
  ATokenFactory,
  ReservesSetupHelperFactory,
  AaveOracleFactory,
  DefaultReserveInterestRateStrategyFactory,
  DelegationAwareATokenFactory,
  PoolAddressesProviderFactory,
  PoolAddressesProviderRegistryFactory,
  PoolConfiguratorFactory,
  PoolFactory,
  MintableDelegationERC20Factory,
  MintableERC20Factory,
  MockAggregatorFactory,
  MockATokenFactory,
  MockFlashLoanReceiverFactory,
  MockStableDebtTokenFactory,
  MockVariableDebtTokenFactory,
  PriceOracleFactory,
  StableDebtTokenFactory,
  VariableDebtTokenFactory,
  WETH9MockedFactory,
  ConfiguratorLogicFactory,
  MockIncentivesControllerFactory,
  MockInitializableFromConstructorImpleFactory,
  MockInitializableImpleFactory,
  MockInitializableImpleV2Factory,
  InitializableImmutableAdminUpgradeabilityProxyFactory,
  WETH9Mocked,
  ACLManagerFactory,
  MockReserveConfigurationFactory,
  MockPoolFactory,
  MockReentrantInitializableImpleFactory,
} from '../types';
import {
  withSave,
  registerContractInJsonDb,
  linkBytecode,
  insertContractAddressInDb,
} from './contracts-helpers';
import { MintableDelegationERC20 } from '../types/MintableDelegationERC20';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { PoolLibraryAddresses } from '../types/PoolFactory';
import AaveConfig from '../market-config';

const readArtifact = async (id: string) => {
  return (DRE as HardhatRuntimeEnvironment).artifacts.readArtifact(id);
};

export const deployPoolAddressesProvider = async (marketId: string) =>
  withSave(
    await new PoolAddressesProviderFactory(await getFirstSigner()).deploy(marketId),
    eContractid.PoolAddressesProvider
  );

export const deployPoolAddressesProviderRegistry = async () =>
  withSave(
    await new PoolAddressesProviderRegistryFactory(await getFirstSigner()).deploy(),
    eContractid.PoolAddressesProviderRegistry
  );

export const deployACLManager = async (provider: tEthereumAddress) =>
  withSave(
    await new ACLManagerFactory(await getFirstSigner()).deploy(provider),
    eContractid.ACLManager
  );

export const deployConfiguratorLogicLibrary = async () =>
  withSave(
    await new ConfiguratorLogicFactory(await getFirstSigner()).deploy(),
    eContractid.ConfiguratorLogic
  );

export const deployPoolConfigurator = async () => {
  const configuratorLogic = await deployConfiguratorLogicLibrary();
  const poolConfiguratorImpl = await new PoolConfiguratorFactory(
    { ['__$3ddc574512022f331a6a4c7e4bbb5c67b6$__']: configuratorLogic.address },
    await getFirstSigner()
  ).deploy();
  await insertContractAddressInDb(eContractid.PoolConfiguratorImpl, poolConfiguratorImpl.address);
  return withSave(poolConfiguratorImpl, eContractid.PoolConfigurator);
};

export const deploySupplyLogic = async () => {
  const supplyLogicArtifact = await readArtifact(eContractid.SupplyLogic);

  const linkedSupplyLogicByteCode = linkBytecode(supplyLogicArtifact, {});
  const supplyLogicFactory = await DRE.ethers.getContractFactory(
    supplyLogicArtifact.abi,
    linkedSupplyLogicByteCode
  );
  const supplyLogic = await (
    await supplyLogicFactory.connect(await getFirstSigner()).deploy()
  ).deployed();

  return withSave(supplyLogic, eContractid.SupplyLogic);
};

export const deployBorrowLogic = async () => {
  const borrowLogicArtifact = await readArtifact(eContractid.BorrowLogic);

  const borrowLogicFactory = await DRE.ethers.getContractFactory(
    borrowLogicArtifact.abi,
    borrowLogicArtifact.bytecode
  );
  const borrowLogic = await (
    await borrowLogicFactory.connect(await getFirstSigner()).deploy()
  ).deployed();

  return withSave(borrowLogic, eContractid.BorrowLogic);
};

export const deployLiquidationLogic = async () => {
  const liquidationLogicArtifact = await readArtifact(eContractid.LiquidationLogic);

  const liquidationLogicFactory = await DRE.ethers.getContractFactory(
    liquidationLogicArtifact.abi,
    liquidationLogicArtifact.bytecode
  );
  const liquidationLogic = await (
    await liquidationLogicFactory.connect(await getFirstSigner()).deploy()
  ).deployed();

  return withSave(liquidationLogic, eContractid.LiquidationLogic);
};

export const deployBridgeLogic = async () => {
  const bridgeLogicArtifact = await readArtifact(eContractid.BridgeLogic);
  const bridgeLogicFactory = await DRE.ethers.getContractFactory(
    bridgeLogicArtifact.abi,
    bridgeLogicArtifact.bytecode
  );
  const bridgeLogic = await (
    await bridgeLogicFactory.connect(await getFirstSigner()).deploy()
  ).deployed();

  return withSave(bridgeLogic, eContractid.BridgeLogic);
};

export const deployEModeLogic = async () => {
  const eModeLogicArtifact = await readArtifact(eContractid.EModeLogic);

  const eModeLogicFactory = await DRE.ethers.getContractFactory(
    eModeLogicArtifact.abi,
    eModeLogicArtifact.bytecode
  );
  const eModeLogic = await (
    await eModeLogicFactory.connect(await getFirstSigner()).deploy()
  ).deployed();

  return withSave(eModeLogic, eContractid.EModeLogic);
};

export const deployFlashLoanLogic = async (borrowLogicAddress: tEthereumAddress) => {
  const flashLoanLogicArtifact = await readArtifact(eContractid.FlashLoanLogic);

  const linkedFlashLoanLogicByteCode = linkBytecode(flashLoanLogicArtifact, {
    [eContractid.BorrowLogic]: borrowLogicAddress,
  });

  const flashLoanLogicFactory = await DRE.ethers.getContractFactory(
    flashLoanLogicArtifact.abi,
    linkedFlashLoanLogicByteCode
  );

  const flashLoanLogic = await (
    await flashLoanLogicFactory.connect(await getFirstSigner()).deploy()
  ).deployed();

  return withSave(flashLoanLogic, eContractid.FlashLoanLogic);
};

export const deployAaveLibraries = async (): Promise<PoolLibraryAddresses> => {
  const supplyLogic = await deploySupplyLogic();
  const borrowLogic = await deployBorrowLogic();
  const liquidationLogic = await deployLiquidationLogic();
  const bridgeLogic = await deployBridgeLogic();
  const eModeLogic = await deployEModeLogic();
  const flashLoanLogic = await deployFlashLoanLogic(borrowLogic.address);
  // Hardcoded solidity placeholders, if any library changes path this will fail.
  // The '__$PLACEHOLDER$__ can be calculated via solidity keccak, but the PoolLibraryAddresses Type seems to
  // require a hardcoded string.
  //
  //  how-to:
  //  1. PLACEHOLDER = solidityKeccak256(['string'], `${libPath}:${libName}`).slice(2, 36)
  //  2. LIB_PLACEHOLDER = `__$${PLACEHOLDER}$__`
  // or grab placeholders from PoolLibraryAddresses at Typechain generation.
  //
  // libPath example: contracts/libraries/logic/GenericLogic.sol
  // libName example: GenericLogic
  return {
    //    ['__$de8c0cf1a7d7c36c802af9a64fb9d86036$__']: validationLogic.address,
    ['__$d5ddd09ae98762b8929dd85e54b218e259$__']: flashLoanLogic.address,
    ['__$b06080f092f400a43662c3f835a4d9baa8$__']: bridgeLogic.address,
    ['__$db79717e66442ee197e8271d032a066e34$__']: supplyLogic.address,
    ['__$c3724b8d563dc83a94e797176cddecb3b9$__']: borrowLogic.address,
    ['__$f598c634f2d943205ac23f707b80075cbb$__']: liquidationLogic.address,
    ['__$e4b9550ff526a295e1233dea02821b9004$__']: eModeLogic.address,
  };
};

export const deployPool = async () => {
  const libraries = await deployAaveLibraries();
  const poolImpl = await new PoolFactory(libraries, await getFirstSigner()).deploy();
  await insertContractAddressInDb(eContractid.PoolImpl, poolImpl.address);
  return withSave(poolImpl, eContractid.Pool);
};

export const deployPriceOracle = async () =>
  withSave(await new PriceOracleFactory(await getFirstSigner()).deploy(), eContractid.PriceOracle);

export const deployMockAggregator = async (price: tStringTokenSmallUnits) =>
  withSave(
    await new MockAggregatorFactory(await getFirstSigner()).deploy(price),
    eContractid.MockAggregator
  );

export const deployAaveOracle = async (
  args: [
    tEthereumAddress,
    tEthereumAddress[],
    tEthereumAddress[],
    tEthereumAddress,
    tEthereumAddress,
    string
  ]
) =>
  withSave(
    await new AaveOracleFactory(await getFirstSigner()).deploy(...args),
    eContractid.AaveOracle
  );

export const deployMockFlashLoanReceiver = async (addressesProvider: tEthereumAddress) =>
  withSave(
    await new MockFlashLoanReceiverFactory(await getFirstSigner()).deploy(addressesProvider),
    eContractid.MockFlashLoanReceiver
  );

export const deployAaveProtocolDataProvider = async (addressesProvider: tEthereumAddress) =>
  withSave(
    await new AaveProtocolDataProviderFactory(await getFirstSigner()).deploy(addressesProvider),
    eContractid.AaveProtocolDataProvider
  );

export const deployMintableERC20 = async (args: [string, string, string]): Promise<MintableERC20> =>
  withSave(
    await new MintableERC20Factory(await getFirstSigner()).deploy(...args),
    eContractid.MintableERC20
  );

export const deployMintableDelegationERC20 = async (
  args: [string, string, string]
): Promise<MintableDelegationERC20> =>
  withSave(
    await new MintableDelegationERC20Factory(await getFirstSigner()).deploy(...args),
    eContractid.MintableDelegationERC20
  );

export const deployDefaultReserveInterestRateStrategy = async (
  args: [tEthereumAddress, string, string, string, string, string, string, string, string, string]
) =>
  withSave(
    await new DefaultReserveInterestRateStrategyFactory(await getFirstSigner()).deploy(...args),
    eContractid.DefaultReserveInterestRateStrategy
  );

export const deployGenericStableDebtToken = async (poolAddress: tEthereumAddress) =>
  withSave(
    await new StableDebtTokenFactory(await getFirstSigner()).deploy(poolAddress),
    eContractid.StableDebtToken
  );

export const deployGenericVariableDebtToken = async (poolAddress: tEthereumAddress) =>
  withSave(
    await new VariableDebtTokenFactory(await getFirstSigner()).deploy(poolAddress),
    eContractid.VariableDebtToken
  );

export const deployGenericAToken = async ([
  poolAddress,
  underlyingAssetAddress,
  treasuryAddress,
  incentivesController,
  name,
  symbol,
]: [tEthereumAddress, tEthereumAddress, tEthereumAddress, tEthereumAddress, string, string]) => {
  const instance = await withSave(
    await new ATokenFactory(await getFirstSigner()).deploy(poolAddress),
    eContractid.AToken
  );

  await instance.initialize(
    treasuryAddress,
    underlyingAssetAddress,
    incentivesController,
    '18',
    name,
    symbol,
    '0x10'
  );

  return instance;
};

export const deployGenericATokenImpl = async (poolAddress: tEthereumAddress) =>
  withSave(await new ATokenFactory(await getFirstSigner()).deploy(poolAddress), eContractid.AToken);

export const deployDelegationAwareAToken = async ([
  poolAddress,
  underlyingAssetAddress,
  treasuryAddress,
  incentivesController,
  name,
  symbol,
]: [tEthereumAddress, tEthereumAddress, tEthereumAddress, tEthereumAddress, string, string]) => {
  const instance = await withSave(
    await new DelegationAwareATokenFactory(await getFirstSigner()).deploy(poolAddress),
    eContractid.DelegationAwareAToken
  );

  await instance.initialize(
    treasuryAddress,
    underlyingAssetAddress,
    incentivesController,
    '18',
    name,
    symbol,
    '0x10'
  );

  return instance;
};

export const deployDelegationAwareATokenImpl = async (poolAddress: tEthereumAddress) =>
  withSave(
    await new DelegationAwareATokenFactory(await getFirstSigner()).deploy(poolAddress),
    eContractid.DelegationAwareAToken
  );

export const deployAllMockTokens = async () => {
  const tokens: { [symbol: string]: MockContract | MintableERC20 | WETH9Mocked } = {};

  const protoConfigData = AaveConfig.ReservesConfig;

  for (const tokenSymbol of Object.keys(TokenContractId)) {
    if (tokenSymbol === 'WETH') {
      tokens[tokenSymbol] = await deployWETHMocked();
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    }
    let decimals = 18;

    let configData = (<any>protoConfigData)[tokenSymbol];

    if (!configData) {
      decimals = 18;
    }

    tokens[tokenSymbol] = await deployMintableERC20([
      tokenSymbol,
      tokenSymbol,
      configData ? configData.reserveDecimals : 18,
    ]);
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }

  return tokens;
};

export const deployReservesSetupHelper = async () =>
  withSave(
    await new ReservesSetupHelperFactory(await getFirstSigner()).deploy(),
    eContractid.ReservesSetupHelper
  );

export const deployInitializableImmutableAdminUpgradeabilityProxy = async (
  args: [tEthereumAddress]
) =>
  withSave(
    await new InitializableImmutableAdminUpgradeabilityProxyFactory(await getFirstSigner()).deploy(
      ...args
    ),
    eContractid.InitializableImmutableAdminUpgradeabilityProxy
  );

export const deployMockStableDebtToken = async (
  args: [tEthereumAddress, tEthereumAddress, tEthereumAddress, string, string, string]
) => {
  const instance = await withSave(
    await new MockStableDebtTokenFactory(await getFirstSigner()).deploy(args[0]),
    eContractid.MockStableDebtToken
  );

  await instance.initialize(args[1], args[2], '18', args[3], args[4], args[5]);

  return instance;
};

export const deployWETHMocked = async () =>
  withSave(await new WETH9MockedFactory(await getFirstSigner()).deploy(), eContractid.WETHMocked);

export const deployMockVariableDebtToken = async (
  args: [tEthereumAddress, tEthereumAddress, tEthereumAddress, string, string, string]
) => {
  const instance = await withSave(
    await new MockVariableDebtTokenFactory(await getFirstSigner()).deploy(args[0]),
    eContractid.MockVariableDebtToken
  );

  await instance.initialize(args[1], args[2], '18', args[3], args[4], args[5]);

  return instance;
};

export const deployMockAToken = async (
  args: [
    tEthereumAddress,
    tEthereumAddress,
    tEthereumAddress,
    tEthereumAddress,
    string,
    string,
    string
  ]
) => {
  const instance = await withSave(
    await new MockATokenFactory(await getFirstSigner()).deploy(args[0]),
    eContractid.MockAToken
  );

  await instance.initialize(args[2], args[1], args[3], '18', args[4], args[5], args[6]);

  return instance;
};

export const deployMockIncentivesController = async () =>
  withSave(
    await new MockIncentivesControllerFactory(await getFirstSigner()).deploy(),
    eContractid.MockIncentivesController
  );

export const deployMockReserveConfiguration = async () =>
  withSave(
    await new MockReserveConfigurationFactory(await getFirstSigner()).deploy(),
    eContractid.MockReserveConfiguration
  );

export const deployMockPool = async () =>
  withSave(await new MockPoolFactory(await getFirstSigner()).deploy(), eContractid.MockPool);

export const deployMockInitializableImple = async () =>
  withSave(
    await new MockInitializableImpleFactory(await getFirstSigner()).deploy(),
    eContractid.MockInitializableImple
  );

export const deployMockInitializableImpleV2 = async () =>
  withSave(
    await new MockInitializableImpleV2Factory(await getFirstSigner()).deploy(),
    eContractid.MockInitializableImpleV2
  );

export const deployMockInitializableFromConstructorImple = async (args: [string]) =>
  withSave(
    await new MockInitializableFromConstructorImpleFactory(await getFirstSigner()).deploy(...args),
    eContractid.MockInitializableFromConstructorImple
  );

export const deployMockReentrantInitializableImple = async () =>
  withSave(
    await new MockReentrantInitializableImpleFactory(await getFirstSigner()).deploy(),
    eContractid.MockReentrantInitializableImple
  );
