// GhostPay Agent — Blockchain Service
// Routes payments through the GhostPay smart contract on Status Network Sepolia.
// Also supports gasless STT (ERC20) token transfers — no ETH value needed.

import { ethers } from 'ethers';
import { BLOCKCHAIN } from '../config/constants';
import { CONTRACT_ADDRESS, GHOSTPAY_ABI } from '../contracts/contractConfig';
import { uniqueId } from '../utils/helper';

const ETH_SEPOLIA_CHAIN_ID = 11155111;
const ETH_SEPOLIA_CHAIN_HEX = '0xaa36a7';
const STATUS_SEPOLIA_CHAIN_HEX = '0x6300b5ea';

// ─── STT Token Config ─────────────────────────────────────────────
// TestToken (STT) deployed on Status Sepolia — used for gasless ERC20 transfers
export const STT_TOKEN_ADDRESS = '0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047';

const ERC20_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol',   outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

function getConfiguredPayerSigner() {
  const raw =
    process.env.EXPO_PUBLIC_PAYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    BLOCKCHAIN.sponsorPrivateKey ||
    '';
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const privateKey = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  try {
    const provider = new ethers.JsonRpcProvider(BLOCKCHAIN.rpcUrl);
    return new ethers.Wallet(privateKey, provider);
  } catch {
    return null;
  }
}

async function getFreshInjectedSignerIfAvailable() {
  if (typeof globalThis === 'undefined' || !globalThis?.ethereum) {
    return null;
  }

  try {
    const freshProvider = new ethers.BrowserProvider(globalThis.ethereum);
    return await freshProvider.getSigner();
  } catch {
    return null;
  }
}

// ─── Wallet Functions ─────────────────────────────────────────

/**
 * Get wallet balance from chain
 */
export async function getWalletBalance(address, rpcUrl = BLOCKCHAIN.rpcUrl) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    const ethBalance = ethers.formatEther(balance);
    return {
      balance: parseFloat(ethBalance).toFixed(6),
      currency: BLOCKCHAIN.currencySymbol,
      usdValue: (parseFloat(ethBalance) * 2450).toFixed(2),
    };
  } catch (error) {
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }
}

// ─── Smart Contract Payment Execution ─────────────────────────

/**
 * Execute payment through the GhostPay contract
 *
 * @param {string} receiver - Recipient address
 * @param {string|number} amount - Amount in ETH
 * @param {string} agentDecisionId - Reference to off-chain agent decision
 * @returns {object} Transaction result
 */
export async function sendPayment(receiver, amount, agentDecisionId = null, options = {}) {
  const decisionId = agentDecisionId || uniqueId();
  const requireContract = options.requireContract === true;
  const waitForConfirmation = options.waitForConfirmation === true;

  try {
    const signer = options.signer || null;
    if (!signer) {
      throw new Error('No connected wallet signer available. Connect MetaMask (web) or WalletConnect signer first.');
    }

    const provider = signer.provider;
    if (!provider) {
      throw new Error('Signer has no provider. Reconnect your wallet and try again.');
    }

    const sender = await signer.getAddress();
    const amountWei = ethers.parseEther(amount.toString());
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const gaslessOverrides = chainId === BLOCKCHAIN.chainId ? { gasPrice: 0n } : {};

    const getSpendContext = async () => {
      const feeData = await provider.getFeeData();
      const pricePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
      const senderBalance = await provider.getBalance(sender);
      return { pricePerGas, senderBalance };
    };

    const buildInsufficientFundsError = async (requiredWei, connectedBalanceWei) => {
      // Helpful hint: many users fund Ethereum Sepolia while wallet is connected to Status Sepolia.
      if (chainId !== ETH_SEPOLIA_CHAIN_ID) {
        try {
          const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
          const sepoliaBalance = await sepoliaProvider.getBalance(sender);
          if (sepoliaBalance >= requiredWei) {
            return `Insufficient funds on connected network (chainId: ${chainId}). Your address has ${ethers.formatEther(sepoliaBalance)} ETH on Ethereum Sepolia (11155111). Please switch MetaMask network to Sepolia Testnet and retry.`;
          }
        } catch {
          // Ignore hint failures and fall back to generic message.
        }
      }

      return `Insufficient funds on connected network (chainId: ${chainId}). Balance: ${ethers.formatEther(connectedBalanceWei)} ETH, required (amount + fee): ${ethers.formatEther(requiredWei)} ETH.`;
    };

    const trySwitchToEthSepoliaWithFunds = async (requiredWei) => {
      if (chainId === ETH_SEPOLIA_CHAIN_ID || typeof provider.send !== 'function') {
        return false;
      }

      try {
        const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        const sepoliaBalance = await sepoliaProvider.getBalance(sender);
        if (sepoliaBalance < requiredWei) {
          return false;
        }

        await provider.send('wallet_switchEthereumChain', [{ chainId: ETH_SEPOLIA_CHAIN_HEX }]);
        const switchedChainHex = await provider.send('eth_chainId', []);
        return switchedChainHex?.toLowerCase?.() === ETH_SEPOLIA_CHAIN_HEX;
      } catch {
        return false;
      }
    };

    const executeDirectTransfer = async () => {
      const transferGas = 21000n;
      const { pricePerGas, senderBalance } = await getSpendContext();
      const totalCost = amountWei + (transferGas * pricePerGas);
      if (senderBalance < totalCost) {
        const switched = await trySwitchToEthSepoliaWithFunds(totalCost);
        if (switched) {
          // Re-evaluate with fresh signer after network change to avoid ethers NETWORK_ERROR.
          const refreshedSigner = await getFreshInjectedSignerIfAvailable();
          return sendPayment(receiver, amount, agentDecisionId, {
            ...options,
            signer: refreshedSigner || signer,
            requireContract: false,
          });
        }
        throw new Error(await buildInsufficientFundsError(totalCost, senderBalance));
      }

      const tx = await signer.sendTransaction({
        to: receiver,
        value: amountWei,
        gasLimit: transferGas,
        ...gaslessOverrides,
      });
      const receipt = waitForConfirmation ? await tx.wait() : null;

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber ?? null,
        gasUsed: receipt?.gasUsed?.toString?.() || null,
        gasPrice: pricePerGas.toString(),
        contractAddress: null,
        agentDecisionId: decisionId,
        method: 'wallet-direct',
        confirmationStatus: waitForConfirmation ? 'confirmed' : 'submitted',
        timestamp: new Date().toISOString(),
      };
    };

    if (requireContract && chainId !== BLOCKCHAIN.chainId) {
      if (typeof provider.send === 'function') {
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: STATUS_SEPOLIA_CHAIN_HEX }]);
          // Allow wallet time to process the switch (100ms buffer for network RPC).
          await new Promise(resolve => setTimeout(resolve, 100));
          const switchedChainHex = await provider.send('eth_chainId', []);
          if (switchedChainHex?.toLowerCase?.() === STATUS_SEPOLIA_CHAIN_HEX) {
            // Wallet switched successfully. Refresh signer and provider to avoid ethers NETWORK_ERROR.
            const refreshedSigner = await getFreshInjectedSignerIfAvailable();
            return sendPayment(receiver, amount, agentDecisionId, {
              ...options,
              signer: refreshedSigner || signer,
            });
          }
        } catch (switchError) {
          // Add chain if wallet does not know Status Network yet (e.g. error code 4902).
          if (switchError?.code === 4902 || /unrecognized chain|unknown chain/i.test(String(switchError?.message || ''))) {
            try {
              await provider.send('wallet_addEthereumChain', [{
                chainId: STATUS_SEPOLIA_CHAIN_HEX,
                chainName: BLOCKCHAIN.chainName,
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: [BLOCKCHAIN.rpcUrl],
                blockExplorerUrls: [BLOCKCHAIN.blockExplorer],
              }]);
              // Allow wallet time to process the add and auto-switch.
              await new Promise(resolve => setTimeout(resolve, 100));
              const switchedChainHex = await provider.send('eth_chainId', []);
              if (switchedChainHex?.toLowerCase?.() === STATUS_SEPOLIA_CHAIN_HEX) {
                // Chain added and switched successfully. Refresh signer and provider.
                const refreshedSigner = await getFreshInjectedSignerIfAvailable();
                return sendPayment(receiver, amount, agentDecisionId, {
                  ...options,
                  signer: refreshedSigner || signer,
                });
              }
            } catch {
              // Continue to explicit error below.
            }
          }
        }
      }
      throw new Error(`Contract-only mode requires Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}). Current chainId: ${chainId}. Switch may have failed or wallet rejected it. Please manually switch to Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}, hex: ${STATUS_SEPOLIA_CHAIN_HEX}).`);
    }

    // UX fallback: if connected to Status chain with 0 balance but ETH exists on Sepolia,
    // attempt a wallet network switch and continue as a direct transfer.
    if (chainId === BLOCKCHAIN.chainId) {
      const { pricePerGas, senderBalance } = await getSpendContext();
      const minTransferCost = amountWei + (21000n * pricePerGas);
      if (requireContract && senderBalance < amountWei) {
        const sponsorSigner = getConfiguredPayerSigner();
        if (sponsorSigner) {
          try {
            const sponsorAddress = await sponsorSigner.getAddress();
            const sponsorBalance = await sponsorSigner.provider.getBalance(sponsorAddress);
            if (sponsorBalance >= amountWei) {
              const sponsorContract = new ethers.Contract(CONTRACT_ADDRESS, GHOSTPAY_ABI, sponsorSigner);
              const tx = await sponsorContract.sendPayment(receiver, amountWei, decisionId, {
                value: amountWei,
                gasPrice: 0n,
                gasLimit: 200000n,
              });
              const receipt = waitForConfirmation ? await tx.wait() : null;

              return {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt?.blockNumber ?? null,
                gasUsed: receipt?.gasUsed?.toString?.() || null,
                gasPrice: '0',
                contractAddress: CONTRACT_ADDRESS,
                agentDecisionId: decisionId,
                method: 'contract-sponsor',
                sponsoredBy: sponsorAddress,
                confirmationStatus: waitForConfirmation ? 'confirmed' : 'submitted',
                timestamp: new Date().toISOString(),
              };
            }
          } catch {
            // Fall through to explicit balance error.
          }
        }

        throw new Error(
          `Contract-only mode requires funds on Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}). ` +
          `Connected balance: ${ethers.formatEther(senderBalance)} ETH, required value: ${ethers.formatEther(amountWei)} ETH. ` +
          `Fund this wallet via faucet or configure sponsor key (EXPO_PUBLIC_PAYER_PRIVATE_KEY or BLOCKCHAIN.sponsorPrivateKey) for sponsored contract calls.`
        );
      }
      if (senderBalance < minTransferCost && typeof provider.send === 'function') {
        if (requireContract) {
          throw new Error(
            `Contract-only mode requires enough balance on Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}). ` +
            `Balance: ${ethers.formatEther(senderBalance)} ETH, required (amount + fee estimate): ${ethers.formatEther(minTransferCost)} ETH.`
          );
        }
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: ETH_SEPOLIA_CHAIN_HEX }]);
          // Allow wallet time to process the switch before continuing.
          await new Promise(resolve => setTimeout(resolve, 100));
          return executeDirectTransfer();
        } catch {
          // If user rejects or provider does not support switching, continue existing logic.
        }
      }
    }

    // If wallet is not on Status Sepolia, send directly to recipient for test flows.
    if (chainId !== BLOCKCHAIN.chainId) {
      if (requireContract) {
        throw new Error(`Contract-only mode requires Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}). Current chainId: ${chainId}.`);
      }
      return executeDirectTransfer();
    }

    const contractCode = await provider.getCode(CONTRACT_ADDRESS);
    if (!contractCode || contractCode === '0x') {
      if (requireContract) {
        throw new Error(`Contract-only mode failed: no contract code at ${CONTRACT_ADDRESS} on chain ${chainId}.`);
      }
      return executeDirectTransfer();
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, GHOSTPAY_ABI, signer);
    let tx;
    try {
      const txReq = await contract.sendPayment.populateTransaction(
        receiver,
        amountWei,
        decisionId,
        { value: amountWei }
      );

      const { pricePerGas, senderBalance } = await getSpendContext();
      const estimatedGas = await provider.estimateGas({ ...txReq, from: sender });
      const totalCost = amountWei + (estimatedGas * pricePerGas);
      if (senderBalance < totalCost) {
        throw new Error(await buildInsufficientFundsError(totalCost, senderBalance));
      }

      tx = await contract.sendPayment(
        receiver,
        amountWei,
        decisionId,
        { value: amountWei, gasLimit: estimatedGas, ...gaslessOverrides }
      );
    } catch (_estimateOrCallError) {
      // Fallback for providers that fail on contract estimate/call with missing revert data.
      if (requireContract) {
        throw new Error('Contract execution failed during estimate/call. Contract-only mode will not use direct transfer fallback.');
      }
      return executeDirectTransfer();
    }

    const receipt = waitForConfirmation ? await tx.wait() : null;

    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null,
      gasUsed: receipt?.gasUsed?.toString?.() || null,
      gasPrice: '0',
      contractAddress: CONTRACT_ADDRESS,
      agentDecisionId: decisionId,
      method: 'wallet-signer',
      confirmationStatus: waitForConfirmation ? 'confirmed' : 'submitted',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      txHash: null,
      method: 'wallet-signer',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get smart contract info
 */
export async function getContractInfo() {
  return {
    address: CONTRACT_ADDRESS,
    network: BLOCKCHAIN.chainName,
    gasLimit: 200000,
    gasPrice: 0,
  };
}

// ─── STT Token Gasless Transfer ───────────────────────────────────

/**
 * Get STT token balance for an address
 */
export async function getSTTBalance(address) {
  try {
    const provider = new ethers.JsonRpcProvider(BLOCKCHAIN.rpcUrl);
    const token = new ethers.Contract(STT_TOKEN_ADDRESS, ERC20_ABI, provider);
    const [rawBal, decimals, symbol] = await Promise.all([
      token.balanceOf(address),
      token.decimals(),
      token.symbol(),
    ]);
    return {
      balance: ethers.formatUnits(rawBal, decimals),
      symbol,
      tokenAddress: STT_TOKEN_ADDRESS,
    };
  } catch (error) {
    return { balance: '0', symbol: 'STT', tokenAddress: STT_TOKEN_ADDRESS, error: error.message };
  }
}

/**
 * Execute a gasless STT token transfer — the primary bounty-qualifying transaction.
 *
 * ERC20 transfer requires NO ETH value (msg.value = 0), only gasPrice = 0.
 * This works even when the wallet has 0 ETH on Status Sepolia.
 *
 * @param {string} receiver - Recipient wallet address
 * @param {string|number} amountSTT - Amount of STT tokens to send
 * @param {string} agentDecisionId - AI agent decision reference
 * @param {object} options - { signer } — connected MetaMask signer (optional; uses sponsor key if not provided)
 * @returns {object} { success, txHash, method, gaslessProof, ... }
 */
export async function sendSTTPayment(receiver, amountSTT, agentDecisionId = null, options = {}) {
  const decisionId = agentDecisionId || uniqueId();

  try {
    // Resolve signer: prefer connected MetaMask signer, fall back to sponsor key
    let signer = options.signer || null;
    if (!signer) {
      signer = getConfiguredPayerSigner();
      if (!signer) {
        throw new Error('No signer available. Connect MetaMask or set sponsor key.');
      }
    }

    const provider = signer.provider || new ethers.JsonRpcProvider(BLOCKCHAIN.rpcUrl);
    const network  = await provider.getNetwork();
    const chainId  = Number(network.chainId);

    // Ensure we're on Status Sepolia
    if (chainId !== BLOCKCHAIN.chainId) {
      // Try to switch via MetaMask
      if (typeof provider.send === 'function') {
        try {
          await provider.send('wallet_switchEthereumChain', [{ chainId: STATUS_SEPOLIA_CHAIN_HEX }]);
          // Allow wallet time to process the switch.
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (switchErr) {
          if (switchErr?.code === 4902 || /unrecognized chain/i.test(String(switchErr?.message || ''))) {
            await provider.send('wallet_addEthereumChain', [{
              chainId: STATUS_SEPOLIA_CHAIN_HEX,
              chainName: BLOCKCHAIN.chainName,
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [BLOCKCHAIN.rpcUrl],
              blockExplorerUrls: [BLOCKCHAIN.blockExplorer],
            }]);
            // Allow wallet time to process the add and auto-switch.
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            throw new Error(`Please switch MetaMask to Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}).`);
          }
        }
      } else {
        throw new Error(`STT transfer requires Status Network Sepolia (chainId: ${BLOCKCHAIN.chainId}). Current: ${chainId}`);
      }
    }

    const token    = new ethers.Contract(STT_TOKEN_ADDRESS, ERC20_ABI, signer);
    const decimals = await token.decimals();
    const amount   = ethers.parseUnits(String(amountSTT), decimals);

    // Check balance
    const sender     = await signer.getAddress();
    const rawBalance = await token.balanceOf(sender);
    if (rawBalance < amount) {
      throw new Error(
        `Insufficient STT balance. Have: ${ethers.formatUnits(rawBalance, decimals)} STT, ` +
        `need: ${amountSTT} STT.`
      );
    }

    // Execute token transfer — gasPrice=0, NO msg.value needed
    const tx = await token.transfer(receiver, amount, {
      gasPrice:  0n,
      gasLimit:  150_000n,
    });

    const receipt = await tx.wait();
    const effectiveGasPrice = receipt?.effectiveGasPrice ?? 0n;
    const gasUsed           = receipt?.gasUsed ?? 0n;

    return {
      success:          true,
      txHash:           tx.hash,
      blockNumber:      receipt?.blockNumber ?? null,
      gasUsed:          gasUsed.toString(),
      gasPrice:         '0',
      tokenAddress:     STT_TOKEN_ADDRESS,
      agentDecisionId:  decisionId,
      method:           'stt-token-transfer',
      gaslessProof: {
        effectiveGasPrice: effectiveGasPrice.toString(),
        gaslessByPrice:    effectiveGasPrice === 0n,
        gaslessByCost:     (gasUsed * effectiveGasPrice) === 0n,
      },
      explorerUrl:      `${BLOCKCHAIN.blockExplorer}/tx/${tx.hash}`,
      timestamp:        new Date().toISOString(),
    };
  } catch (error) {
    return {
      success:    false,
      error:      error.message,
      txHash:     null,
      method:     'stt-token-transfer',
      timestamp:  new Date().toISOString(),
    };
  }
}
