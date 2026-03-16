// GhostPay Agent — WalletConnect Service
// Manages wallet connection state and transaction signing via WalletConnect v2.
// No private keys stored in the app — the user's wallet (MetaMask, Trust, etc.) signs everything.

import { ethers } from 'ethers';
import { BLOCKCHAIN } from '../config/constants';
import { uniqueId } from '../utils/helper';

/**
 * WalletConnect Project ID
 * Get yours free at: https://cloud.walletconnect.com
 * This is required for WalletConnect v2.
 */
export const WALLETCONNECT_PROJECT_ID = 'da928d87f8f64eb22a02df47d0e79244'; // Replace with your project ID

/**
 * WalletConnect session metadata
 */
export const WALLETCONNECT_METADATA = {
  name: 'GhostPay Agent',
  description: 'AI-Powered Blockchain Payment Agent',
  url: 'https://ghostpay.agent',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
  redirect: {
    native: 'ghostpay://',
    universal: 'https://ghostpay.agent',
  },
};

/**
 * Supported chains for WalletConnect
 */
export const SUPPORTED_CHAINS = [
  `eip155:${BLOCKCHAIN.chainId}`, // Sepolia
  'eip155:1',                      // Ethereum Mainnet
  'eip155:11155111',               // Sepolia explicit
];

/**
 * Build a transaction request object for WalletConnect
 * Agent prepares the tx → user's wallet signs it
 * 
 * @param {string} from - Sender (connected wallet address)
 * @param {string} to - Receiver address
 * @param {string|number} amount - Amount in ETH
 * @param {string} agentDecisionId - Reference to the agent's decision
 * @returns {object} Transaction request ready for WalletConnect signing
 */
export function buildTransactionRequest(from, to, amount, agentDecisionId) {
  const amountWei = ethers.parseEther(amount.toString());
  
  return {
    from: from,
    to: to,
    value: ethers.toQuantity(amountWei),
    data: '0x', // Simple ETH transfer
    gasLimit: ethers.toQuantity(21000n),
    // Agent metadata embedded in the transaction context (off-chain)
    _metadata: {
      agentDecisionId,
      agentVersion: '1.0.0',
      appName: 'GhostPay',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Build a contract interaction request for WalletConnect
 * Calls GhostPayAgent.sol executePayment() through the user's wallet
 * 
 * @param {string} from - Sender (connected wallet address)
 * @param {string} contractAddress - Deployed GhostPayAgent contract
 * @param {string} to - Payment receiver
 * @param {string|number} amount - Amount in ETH
 * @param {string} agentDecisionId - Agent decision reference
 * @returns {object} Contract call transaction for WalletConnect
 */
export function buildContractPaymentRequest(from, contractAddress, to, amount, agentDecisionId) {
  const iface = new ethers.Interface([
    'function executePayment(address _to, string calldata _agentDecisionId) external payable',
  ]);

  const data = iface.encodeFunctionData('executePayment', [to, agentDecisionId]);
  const amountWei = ethers.parseEther(amount.toString());

  return {
    from: from,
    to: contractAddress,
    value: ethers.toQuantity(amountWei),
    data: data,
    gasLimit: ethers.toQuantity(100000n), // Higher gas for contract call
  };
}

/**
 * Parse a transaction receipt/hash from WalletConnect response
 */
export function parseWalletConnectResponse(response) {
  if (typeof response === 'string') {
    // Response is a tx hash
    return {
      success: true,
      txHash: response,
      method: 'walletconnect',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: false,
    error: 'Unexpected response format',
    method: 'walletconnect',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format wallet address for display
 */
export function formatWalletAddress(address) {
  if (!address) return 'Not Connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId) {
  const chains = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon',
    80001: 'Mumbai Testnet',
    42161: 'Arbitrum One',
  };
  return chains[chainId] || `Chain ${chainId}`;
}
