certoraRun certora/harness/SimpleERC20.sol \
            certora/harness/ATokenHarness.sol \
    --verify ATokenHarness:certora/specs/AToken.spec \
    --link ATokenHarness:_underlyingAsset=SimpleERC20 \
    --optimistic_loop \
    --solc solc8.10 \
    --cloud \
    --msg "aToken spec - all rules" 