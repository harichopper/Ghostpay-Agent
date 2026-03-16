// SPDX-License-Identifier: MIT
// GhostPay Agent — Smart Contract
// This contract handles payment execution with agent-verified transactions.
// Deploy on Sepolia testnet for demo.

pragma solidity ^0.8.19;

/**
 * @title GhostPayAgent
 * @dev AI-Agent-verified payment execution contract.
 * 
 * Flow:
 *   1. User requests payment via mobile app
 *   2. AI Agent verifies against spending rules
 *   3. If approved, the contract executes the payment
 *   4. Transaction hash returned to the app
 *   5. Event emitted for transparency
 *
 * Features:
 *   - Agent-authorized payments only
 *   - On-chain spending limit enforcement
 *   - Daily limit reset mechanism
 *   - Full event logging for audit trail
 *   - Emergency pause functionality
 */
contract GhostPayAgent {

    // ─── State Variables ──────────────────────────────────────────

    address public owner;
    address public agent;
    
    uint256 public dailyLimit;        // Max daily spending in wei
    uint256 public maxSingleTx;       // Max single transaction in wei
    uint256 public dailySpent;        // Total spent today in wei
    uint256 public lastResetDay;      // Day number of last reset
    uint256 public totalTransactions; // Total executed transactions
    
    bool public paused;

    // ─── Structs ──────────────────────────────────────────────────

    struct Payment {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string agentDecisionId;
        bool executed;
    }

    // ─── Mappings ─────────────────────────────────────────────────

    mapping(uint256 => Payment) public payments;
    mapping(address => bool) public blacklisted;

    // ─── Events ───────────────────────────────────────────────────

    event PaymentExecuted(
        uint256 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string agentDecisionId,
        uint256 timestamp
    );

    event PaymentRejected(
        address indexed from,
        address indexed to,
        uint256 amount,
        string reason
    );

    event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event MaxSingleTxUpdated(uint256 oldLimit, uint256 newLimit);
    event AgentUpdated(address oldAgent, address newAgent);
    event AddressBlacklisted(address indexed addr);
    event AddressUnblacklisted(address indexed addr);
    event ContractPaused(bool paused);
    event FundsDeposited(address indexed from, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "GhostPay: Only owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent || msg.sender == owner, "GhostPay: Only agent");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "GhostPay: Contract is paused");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────

    /**
     * @param _agent Address of the AI agent's signing wallet
     * @param _dailyLimit Daily spending limit in wei
     * @param _maxSingleTx Max single transaction in wei
     */
    constructor(
        address _agent,
        uint256 _dailyLimit,
        uint256 _maxSingleTx
    ) {
        owner = msg.sender;
        agent = _agent;
        dailyLimit = _dailyLimit;
        maxSingleTx = _maxSingleTx;
        lastResetDay = block.timestamp / 1 days;
        paused = false;
    }

    // ─── Core Functions ───────────────────────────────────────────

    /**
     * @dev Execute an agent-approved payment
     * @param _to Recipient address
     * @param _agentDecisionId Off-chain agent decision reference ID
     */
    function executePayment(
        address payable _to,
        string calldata _agentDecisionId
    ) external payable onlyAgent whenNotPaused {
        require(_to != address(0), "GhostPay: Invalid recipient");
        require(msg.value > 0, "GhostPay: Amount must be > 0");
        require(!blacklisted[_to], "GhostPay: Recipient is blacklisted");

        // Reset daily spent if new day
        _resetDailyIfNeeded();

        // Check single transaction limit
        require(msg.value <= maxSingleTx, "GhostPay: Exceeds single tx limit");

        // Check daily limit
        require(dailySpent + msg.value <= dailyLimit, "GhostPay: Exceeds daily limit");

        // Execute payment
        (bool success, ) = _to.call{value: msg.value}("");
        require(success, "GhostPay: Transfer failed");

        // Update state
        dailySpent += msg.value;
        totalTransactions++;

        // Record payment
        payments[totalTransactions] = Payment({
            from: msg.sender,
            to: _to,
            amount: msg.value,
            timestamp: block.timestamp,
            agentDecisionId: _agentDecisionId,
            executed: true
        });

        emit PaymentExecuted(
            totalTransactions,
            msg.sender,
            _to,
            msg.value,
            _agentDecisionId,
            block.timestamp
        );
    }

    /**
     * @dev Deposit ETH into the contract for agent-managed payments
     */
    function deposit() external payable {
        require(msg.value > 0, "GhostPay: Deposit must be > 0");
        emit FundsDeposited(msg.sender, msg.value);
    }

    // ─── Admin Functions ──────────────────────────────────────────

    function setDailyLimit(uint256 _newLimit) external onlyOwner {
        emit DailyLimitUpdated(dailyLimit, _newLimit);
        dailyLimit = _newLimit;
    }

    function setMaxSingleTx(uint256 _newLimit) external onlyOwner {
        emit MaxSingleTxUpdated(maxSingleTx, _newLimit);
        maxSingleTx = _newLimit;
    }

    function setAgent(address _newAgent) external onlyOwner {
        require(_newAgent != address(0), "GhostPay: Invalid agent address");
        emit AgentUpdated(agent, _newAgent);
        agent = _newAgent;
    }

    function blacklistAddress(address _addr) external onlyOwner {
        blacklisted[_addr] = true;
        emit AddressBlacklisted(_addr);
    }

    function unblacklistAddress(address _addr) external onlyOwner {
        blacklisted[_addr] = false;
        emit AddressUnblacklisted(_addr);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }

    function withdrawAll() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "GhostPay: No funds");
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "GhostPay: Withdrawal failed");
    }

    // ─── View Functions ───────────────────────────────────────────

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getRemainingDailyLimit() external view returns (uint256) {
        if (block.timestamp / 1 days > lastResetDay) {
            return dailyLimit;
        }
        if (dailyLimit <= dailySpent) return 0;
        return dailyLimit - dailySpent;
    }

    function getPayment(uint256 _paymentId) external view returns (Payment memory) {
        return payments[_paymentId];
    }

    // ─── Internal Functions ───────────────────────────────────────

    function _resetDailyIfNeeded() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            dailySpent = 0;
            lastResetDay = currentDay;
        }
    }

    // ─── Receive ETH ─────────────────────────────────────────────

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
