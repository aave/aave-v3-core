// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.10;

contract MockAggregator {
  int256 private _latestAnswer;
  uint80 private _roundId;
  uint256 private _startedAt;
  uint256 private _updatedAt;

  event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

  constructor(int256 initialAnswer) {
    _latestAnswer = initialAnswer;
    _startedAt = block.timestamp;
    emit AnswerUpdated(initialAnswer, 0, block.timestamp);
  }

  function latestAnswer() external view returns (int256) {
    return _latestAnswer;
  }

  function getTokenType() external pure returns (uint256) {
    return 1;
  }

  function decimals() external pure returns (uint8) {
    return 8;
  }

  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    return (
      _roundId,
      _latestAnswer,
      _startedAt,
      _updatedAt == 0 ? block.timestamp : _updatedAt,
      _roundId
    );
  }

  function setLastUpdateTimestamp(uint256 updatedAt) external {
    _updatedAt = updatedAt;
  }
}
