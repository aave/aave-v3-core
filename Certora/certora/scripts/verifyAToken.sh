certoraRun certora/harness/SimpleERC20.sol certora/harness/ATokenHarness.sol \
    --solc solc8.10 \
    --verify ATokenHarness:certora/specs/AToken.spec \
    --msg "aToken spec - all " \
    --link ATokenHarness:_underlyingAsset=SimpleERC20 \
    --path contracts \
    --optimistic_loop \
    --staging \
    --settings -enableGhostGrounding=true