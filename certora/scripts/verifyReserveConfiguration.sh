certoraRun certora/harness/ReserveConfigurationHarness.sol \
    --verify ReserveConfigurationHarness:certora/specs/ReserveConfiguration.spec \
    --settings -useBitVectorTheory \
    --optimistic_loop \
    --solc solc8.10 \
    --cloud \
    --msg "ReserveConfiguration"