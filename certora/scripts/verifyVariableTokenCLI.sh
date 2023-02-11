certoraRun certora/harness/VariableDebtTokenHarness.sol \
    --verify VariableDebtTokenHarness:certora/specs/VariableDebtToken.spec \
    --optimistic_loop \
    --solc solc8.10 \
    --cloud master \
    --msg "variable debt token" 