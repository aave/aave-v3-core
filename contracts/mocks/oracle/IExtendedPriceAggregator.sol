// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

interface IExtendedPriceAggregator {
  event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 timestamp);

  function getToken() external view returns (address);

  function getTokenType() external view returns (uint256);

  function getPlatformId() external view returns (uint256);

  function getSubTokens() external view returns (address[] memory);

  function latestAnswer() external view returns (int256);
}
