// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface Vm {
  // Set block.timestamp
  function warp(uint256) external;

  // Set block.number
  function roll(uint256) external;

  // Set block.basefee
  function fee(uint256) external;

  // Loads a storage slot from an address
  function load(address account, bytes32 slot) external returns (bytes32);

  // Stores a value to an address' storage slot
  function store(
    address account,
    bytes32 slot,
    bytes32 value
  ) external;

  // Signs data
  function sign(uint256 privateKey, bytes32 digest)
    external
    returns (
      uint8 v,
      bytes32 r,
      bytes32 s
    );

  // Computes address for a given private key
  function addr(uint256 privateKey) external returns (address);

  // Performs a foreign function call via terminal
  function ffi(string[] calldata) external returns (bytes memory);

  // Sets the *next* call's msg.sender to be the input address
  function prank(address) external;

  // Sets all subsequent calls' msg.sender to be the input address until `stopPrank` is called
  function startPrank(address) external;

  // Sets the *next* call's msg.sender to be the input address, and the tx.origin to be the second input
  function prank(address, address) external;

  // Sets all subsequent calls' msg.sender to be the input address until `stopPrank` is called, and the tx.origin to be the second input
  function startPrank(address, address) external;

  // Resets subsequent calls' msg.sender to be `address(this)`
  function stopPrank() external;

  // Sets an address' balance
  function deal(address who, uint256 newBalance) external;

  // Sets an address' code
  function etch(address who, bytes calldata code) external;

  // Expects an error on next call
  function expectRevert(bytes calldata) external;

  function expectRevert(bytes4) external;

  // Record all storage reads and writes
  function record() external;

  // Gets all accessed reads and write slot from a recording session, for a given address
  function accesses(address) external returns (bytes32[] memory reads, bytes32[] memory writes);

  // Prepare an expected log with (bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData).
  // Call this function, then emit an event, then call a function. Internally after the call, we check if
  // logs were emitted in the expected order with the expected topics and data (as specified by the booleans)
  function expectEmit(
    bool,
    bool,
    bool,
    bool
  ) external;

  // Mocks a call to an address, returning specified data.
  // Calldata can either be strict or a partial match, e.g. if you only
  // pass a Solidity selector to the expected calldata, then the entire Solidity
  // function will be mocked.
  function mockCall(
    address,
    bytes calldata,
    bytes calldata
  ) external;

  // Clears all mocked calls
  function clearMockedCalls() external;

  // Expect a call to an address with the specified calldata.
  // Calldata can either be strict or a partial match
  function expectCall(address, bytes calldata) external;

  function getCode(string calldata) external returns (bytes memory);

  // Label an address in test traces
  function label(address addr, string memory label) external;

  // When fuzzing, generate new inputs if conditional not met
  function assume(bool) external;
}
