// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FaucetToken is ERC20 {
    address public owner;
    uint256 public constant AMOUNT = 100 * 10 ** 18;
    uint256 public constant INTERVAL = 5 minutes;

    mapping(address => uint256) public lastClaimTime;

    event SendToken(address indexed Receiver, uint256 indexed Amount);

    constructor() ERC20("WSJ Token", "WSJ") {
        owner = msg.sender;
        _mint(address(this), 1_000_000 * 10 ** 18);
    }

    function claim() external {
        require(block.timestamp >= lastClaimTime[msg.sender] + INTERVAL, "The interval between each collection is 5 minutes");
        require(balanceOf(address(this)) >= AMOUNT, "Faucet is empty");
        lastClaimTime[msg.sender] = block.timestamp;
        _transfer(address(this), msg.sender, AMOUNT);
        emit SendToken(msg.sender, AMOUNT);
    }

    function refill(uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        _mint(address(this), amount);
    }

}

