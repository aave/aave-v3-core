certoraRun contracts/protocol/pool/Pool.sol \
    --solc solc8.10 \
    --verify Pool:certora/specs/eModeAndIsolation.spec \
    --staging \
    --msg "eMode and isolation spec"