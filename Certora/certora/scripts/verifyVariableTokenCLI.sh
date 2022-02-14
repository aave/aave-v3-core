certoraRun contracts/protocol/tokenization/VariableDebtToken.sol \
    --solc solc8.10 \
    --verify VariableDebtToken:certora/specs/VariableDebtToken.spec \
    --path contracts \
    --optimistic_loop \
    --staging \
    --msg "variable debt token" 