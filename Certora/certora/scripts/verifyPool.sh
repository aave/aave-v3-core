certoraRun contracts/protocol/pool/Pool.sol \
              certora/harness/ATokenHarness.sol \
              certora/harness/StableDebtTokenHarness.sol \
              certora/harness/SimpleERC20.sol \
              contracts/protocol/tokenization/VariableDebtToken.sol \
              certora/harness/SymbolicPriceOracle.sol \
  --solc solc8.10 --optimistic_loop \
  --verify Pool:certora/specs/pool.spec \
  --staging \
  --rule $1 \
  --settings -t=600 --settings -superOptimisticReturnsize=true \
  --link ATokenHarness:POOL=Pool \
  --msg "Pool $1"
