// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import {IERC20} from '../munged/dependencies/openzeppelin/contracts/IERC20.sol';
/**
A simple ERC implementation used as the underlying_asset for the verification process.
 */
contract SimpleERC20 is IERC20 {
    uint256 t;
    mapping (address => uint256) b;
    mapping (address => mapping (address => uint256)) a;

    function add(uint a, uint b) internal pure returns (uint256) {
        uint c = a +b;
        require (c >= a);
        return c;
    }
    
    function sub(uint a, uint b) internal pure returns (uint256) {
        require (a>=b);
        return a-b;
    }

    function totalSupply() external override view returns (uint256) {
        return t;
    }
    
    function balanceOf(address account) external override view returns (uint256) {
        return b[account];
    }
    
    function transfer(address recipient, uint256 amount) external override returns (bool) {
        b[msg.sender] = sub(b[msg.sender], amount);
        b[recipient] = add(b[recipient], amount);
        return true;
    }
 
    function allowance(address owner, address spender) external override view returns (uint256) {
        return a[owner][spender];
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        a[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        b[sender] = sub(b[sender], amount);
        b[recipient] = add(b[recipient], amount);
        a[sender][msg.sender] = sub(a[sender][msg.sender], amount);
        return true;
    }
}