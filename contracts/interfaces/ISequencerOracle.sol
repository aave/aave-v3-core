// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

/**
 * @title ISequencerOracle
 * @author Aave
 * @notice Defines the basic interface for a Sequencer oracle.
 */
interface ISequencerOracle {
  /**
   * @notice Returns the health status of the sequencer.
   * @return roundId is the round ID from the aggregator for which the data was
   * retrieved combined with a phase to ensure that round IDs get larger as
   * time moves forward.   
   * @return answer Is the answer for the latest round. The answer coming from the feed can only be 0 or 1.
            0 - Sequencer is up
            1 - Sequencer is down
   * @return startedAt Is the timestamp when the round was started.
   * @return updatedAt Is the block timestamp of the block in which the answer was updated on L1 
   * @return answeredInRound is the round ID of the round in which the answer
   * was computed.
   */
  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
}
