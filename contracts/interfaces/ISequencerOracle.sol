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
   * @return True if the sequencer is down, false otherwise
   * @return The timestamp of last time the sequencer got up
   */
  function latestAnswer() external view returns (bool, uint256);
}
