certoraRun certora/harness/StableDebtTokenHarness.sol:StableDebtTokenHarness \
    --verify StableDebtTokenHarness:certora/specs/StableDebtToken.spec \
    --settings -assumeUnwindCond,-b=4 \
    --cache StableToken \
    --solc solc8.10 \
    --cloud \
    --msg "stableTokenCLI"