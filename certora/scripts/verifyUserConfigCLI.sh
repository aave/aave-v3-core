certoraRun certora/harness/UserConfigurationHarness.sol \
    --verify UserConfigurationHarness:certora/specs/UserConfiguration.spec \
    --settings -useBitVectorTheory \
    --optimistic_loop \
    --solc solc8.10 \
    --cloud master \
    --msg "UserConfiguration All spec" 