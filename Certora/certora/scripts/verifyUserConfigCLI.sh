certoraRun certora/harness/UserConfigurationHarness.sol \
    --solc solc8.10 \
    --verify UserConfigurationHarness:certora/specs/UserConfiguration.spec \
    --settings -useBitVectorTheory \
    --staging \
    --msg "UserConfiguration spec rule = isolated" \
    --path contracts \
    --optimistic_loop \
    --rule isolated 