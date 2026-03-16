// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * GhostPay Agent — Status Network Bounty Contract
 *
 * AI-governed payment contract for gasless transactions on Status Network Sepolia.
 * Status Network has gas = 0 at the protocol level — no gas fees required.
 *
 * Chain ID: 1660990954
 * Network: Status Network Sepolia Testnet
 */
contract GhostPay {
    event Payment(
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string agentDecisionId
    );

    constructor() {}

    /**
     * Execute a payment — called after AI agent verification.
     * Caller sends ETH via msg.value; contract forwards to receiver.
     * Status Network: gasPrice=0, gas=0 (protocol-level gasless).
     * @param receiver Recipient address
     * @param amount Amount in wei to transfer (must equal msg.value)
     * @param agentDecisionId Reference to off-chain AI agent decision
     */
    function sendPayment(
        address receiver,
        uint256 amount,
        string calldata agentDecisionId
    ) external payable {
        require(receiver != address(0), "Invalid receiver");
        require(amount > 0 && msg.value == amount, "Amount must equal msg.value");

        (bool success, ) = receiver.call{value: amount}("");
        require(success, "Transfer failed");

        emit Payment(msg.sender, receiver, amount, agentDecisionId);
    }

    receive() external payable {}
}
