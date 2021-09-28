// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.7;

import {Ownable} from '../../dependencies/openzeppelin/contracts/Ownable.sol';
import {ISequencerOracle} from '../../interfaces/ISequencerOracle.sol';

contract SequencerOracle is ISequencerOracle, Ownable {
  bool internal _isDown;
  uint256 internal _timestampGotUp;

  function setAnswer(bool isDown, uint256 timestamp) external onlyOwner {
    _isDown = isDown;
    _timestampGotUp = timestamp;
  }

  function latestAnswer() external view override returns (bool, uint256) {
    return (_isDown, _timestampGotUp);
  }
}
