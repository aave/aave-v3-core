certoraRun certora/harness/ReserveConfigurationHarness.sol \
    --solc solc8.10 \
    --verify ReserveConfigurationHarness:certora/specs/ReserveConfiguration.spec \
    --settings -useBitVectorTheory \
    --staging \
    --msg "ReserveConfiguration" \
    --path contracts \
    --rule_sanity \
    --optimistic_loop 