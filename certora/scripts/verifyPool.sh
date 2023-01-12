certoraRun certora/harness/PoolHarness.sol \
              certora/harness/ATokenHarness.sol \
              certora/harness/StableDebtTokenHarness.sol \
              certora/munged/protocol/tokenization/VariableDebtToken.sol \
  --verify PoolHarness:certora/specs/pool.spec \
  --link ATokenHarness:POOL=PoolHarness \
  --settings -t=600 --settings -superOptimisticReturnsize=true \
  --settings -mediumTimeout=700,-depth=40 \
  --optimistic_loop \
  --solc solc8.10 \
  --cloud \
  --rules $1 \
  --msg "Pool"