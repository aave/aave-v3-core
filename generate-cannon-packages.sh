#!/bin/bash

set -e

network=$1
chainId=$2

CANNON=${CANNON:-cannon}

echo "Configuring Aave v3 pool"
$CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-url ipfs://QmNSKB1q8AAvuPpxgD17qKh9Qw1YptQ4ppBzpmSFStDz4H

if [ "$network" = "sepolia" ]; then
    $CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-contract-address InitializableImmutableAdminUpgradeabilityProxy '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951'
    $CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-contract-address PoolAddressesProvider '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A'
    $CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-contract-address Pool '0x0562453c3DAFBB5e625483af58f4E6D668c44e19'
elif [ "$network" = "mainnet" ]; then
    $CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-contract-address InitializableImmutableAdminUpgradeabilityProxy '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'
    $CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-contract-address PoolAddressesProvider '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e'
    $CANNON alter aave-v3-pool:1.19.2@main --chain-id $chainId set-contract-address Pool '0x5faab9e1adbddad0a08734be8a52185fd6558e14'
fi

echo "Configuring Aave v3 tokens"
$CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-url ipfs://Qmf9pyM1ru7wh4We8jyB8wah5tUTMaYYTs3TXjJAm8f9xQ

if [ "$network" = "sepolia" ]; then
    $CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-contract-address AToken '0x48424f2779be0f03cDF6F02E17A591A9BF7AF89f'
    $CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-contract-address StableDebtToken '0xd1CF2FBf4fb82045eE0B116eB107d29246E8DCe9'
    $CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-contract-address VariableDebtToken '0x54bdE009156053108E73E2401aEA755e38f92098'
elif [ "$network" = "mainnet" ]; then
    $CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-contract-address AToken '0x7EfFD7b47Bfd17e52fB7559d3f924201b9DbfF3d'
    $CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-contract-address StableDebtToken '0x15C5620dfFaC7c7366EED66C20Ad222DDbB1eD57'
    $CANNON alter aave-v3-tokens:1.19.2@main --chain-id $chainId set-contract-address VariableDebtToken '0xaC725CB59D16C81061BDeA61041a8A5e73DA9EC6'
fi