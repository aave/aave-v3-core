certoraRun certora/harness/PoolConfiguratorHarness.sol certora/harness/PoolHarnessForConfigurator.sol \
    --solc solc8.10 \
    --verify PoolConfiguratorHarness:certora/specs/PoolConfigurator.spec \
    --msg "PoolConfigurator spec on harness" \
    --link PoolConfiguratorHarness:_pool=PoolHarnessForConfigurator \
    --path contracts \
    --optimistic_loop \
    --staging \
    --settings -useBitVectorTheory