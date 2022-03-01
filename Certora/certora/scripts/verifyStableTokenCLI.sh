certoraRun certora/harness/StableDebtTokenHarness.sol:StableDebtTokenHarness \
    --solc solc8.10 \
    --verify StableDebtTokenHarness:certora/specs/StableDebtToken.spec \
    --settings -assumeUnwindCond,-b=4 \
    --cache StableToken --staging