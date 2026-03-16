// GhostPay Agent — Wallet Context
// Connects via deep-links (MetaMask, Trust, Coinbase). Supports STT token gasless transfers.

import { ethers } from 'ethers';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { BLOCKCHAIN } from '../config/constants';
import { getWalletBalance, sendPayment, sendSTTPayment, getSTTBalance } from '../services/blockchainService';
import { formatWalletAddress } from '../services/walletConnectService';

const WalletContext = createContext(null);

const WALLET_APPS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', scheme: 'metamask://', deepLinkPath: 'wc', playStore: 'https://play.google.com/store/apps/details?id=io.metamask', appStore: 'https://apps.apple.com/app/metamask/id1438144202' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️', scheme: 'trust://', deepLinkPath: 'wc', playStore: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp', appStore: 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '💰', scheme: 'cbwallet://', deepLinkPath: 'wc', playStore: 'https://play.google.com/store/apps/details?id=org.toshi', appStore: 'https://apps.apple.com/app/coinbase-wallet/id1278383455' },
];

const TESTNET_BALANCE_SOURCES = [
  { chainName: 'Ethereum Sepolia', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com' },
  { chainName: 'Ethereum Sepolia', rpcUrl: 'https://sepolia.gateway.tenderly.co' },
  { chainName: 'Ethereum Sepolia', rpcUrl: 'https://1rpc.io/sepolia' },
  { chainName: 'Status Network Sepolia', rpcUrl: BLOCKCHAIN.rpcUrl },
];

export function WalletProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [sttBalance, setSttBalance] = useState('0');
  const [chainName, setChainName] = useState(BLOCKCHAIN.chainName);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [preferredRpc, setPreferredRpc] = useState(BLOCKCHAIN.rpcUrl);
  const [walletSigner, setWalletSigner] = useState(null);

  const withTimeout = useCallback((promise, timeoutMs, timeoutMessage) => Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]), []);

  const fetchBestTestnetBalance = useCallback(async (address) => {
    const probes = await Promise.all(TESTNET_BALANCE_SOURCES.map(async (source) => {
      try {
        const info = await getWalletBalance(address, source.rpcUrl);
        const numericBalance = Number.parseFloat(info.balance || '0');
        return { source, info, numericBalance };
      } catch {
        return null;
      }
    }));

    const valid = probes.filter(Boolean);
    if (!valid.length) {
      throw new Error('Failed to fetch balance from all configured testnet RPCs.');
    }

    valid.sort((a, b) => b.numericBalance - a.numericBalance);
    return valid[0];
  }, []);

  const connectWalletApp = useCallback(async (walletId) => {
    const wallet = WALLET_APPS.find(w => w.id === walletId);
    if (!wallet) return;

    setIsConnecting(true);

    try {
      // Web MetaMask path: creates a real signer and address for tx signing.
      if (Platform.OS === 'web' && walletId === 'metamask' && typeof globalThis !== 'undefined' && globalThis?.ethereum) {
        const provider = new ethers.BrowserProvider(globalThis.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const network = await provider.getNetwork();

        setWalletSigner(signer);
        setWalletAddress(addr);
        setChainName(`Chain ${network.chainId.toString()}`);
        setConnectedWallet(wallet);
        setIsConnected(true);
        setIsConnecting(false);

        try {
          const best = await fetchBestTestnetBalance(addr);
          setBalance(best.info.balance);
          setPreferredRpc(best.source.rpcUrl);
          setChainName(best.source.chainName);
        } catch { setBalance('0'); }
        Alert.alert(`${wallet.icon} Connected`, `${wallet.name}\n${formatWalletAddress(addr)}`, [{ text: 'OK' }]);
        return;
      }

      const canOpen = await Linking.canOpenURL(wallet.scheme + 'test');

      if (!canOpen) {
        setIsConnecting(false);
        const storeUrl = Platform.OS === 'ios' ? wallet.appStore : wallet.playStore;
        Alert.alert(
          `${wallet.icon} ${wallet.name} Not Installed`,
          `Install ${wallet.name} to connect.`,
          [
            { text: `Install ${wallet.name}`, onPress: () => Linking.openURL(storeUrl) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      const wcUri = `wc:ghostpay-${Date.now()}@2?relay-protocol=irn&projectId=da928d87f8f64eb22a02df47d0e79244`;
      const deepLink = `${wallet.scheme}${wallet.deepLinkPath}?uri=${encodeURIComponent(wcUri)}`;
      await Linking.openURL(deepLink);

      setTimeout(async () => {
        // Deep-link fallback only opens wallet app; no signer/session returned yet.
        // Keep address empty until user syncs a real address to avoid fake 0-balance results.
        setWalletAddress(null);
        setBalance(null);
        setChainName('Status Network Sepolia');
        setConnectedWallet(wallet);
        setWalletSigner(null);
        setIsConnected(true);
        setIsConnecting(false);
        Alert.alert(
          `${wallet.icon} Connected`,
          `${wallet.name}\nNetwork: Status Sepolia\n\nSync your wallet address in the app to fetch the real balance.`,
          [{ text: 'OK' }]
        );
      }, 3000);
    } catch (err) {
      setIsConnecting(false);
      Alert.alert('Connection Error', `Could not open ${wallet.name}.`);
    }
  }, [fetchBestTestnetBalance, preferredRpc]);

  const connect = useCallback(async (id) => {
    connectWalletApp(id || 'metamask');
  }, [connectWalletApp]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof globalThis === 'undefined' || !globalThis?.ethereum) {
      return;
    }

    let unmounted = false;

    const restoreWebWallet = async () => {
      try {
        const provider = new ethers.BrowserProvider(globalThis.ethereum);
        const accounts = await provider.send('eth_accounts', []);

        if (!accounts?.length) {
          if (!unmounted) {
            setIsConnected(false);
            setWalletSigner(null);
            setWalletAddress(null);
            setConnectedWallet(null);
          }
          return;
        }

        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        const network = await provider.getNetwork();

        if (unmounted) return;

        setWalletSigner(signer);
        setWalletAddress(addr);
        setChainName(`Chain ${network.chainId.toString()}`);
        setConnectedWallet(WALLET_APPS.find(w => w.id === 'metamask'));
        setIsConnected(true);

        try {
          const best = await fetchBestTestnetBalance(addr);
          if (unmounted) return;
          setBalance(best.info.balance);
          setPreferredRpc(best.source.rpcUrl);
          setChainName(best.source.chainName);
        } catch {
          if (!unmounted) setBalance('0');
        }
      } catch {
        // Silent restore failure; user can connect manually.
      }
    };

    restoreWebWallet();

    const eth = globalThis.ethereum;
    const handleAccountsChanged = () => {
      restoreWebWallet();
    };
    const handleChainChanged = () => {
      restoreWebWallet();
    };

    if (typeof eth?.on === 'function') {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', handleChainChanged);
    }

    return () => {
      unmounted = true;
      if (typeof eth?.removeListener === 'function') {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [fetchBestTestnetBalance]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setWalletAddress(null);
    setBalance(null);
    setSttBalance('0');
    setConnectedWallet(null);
    setWalletSigner(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const best = await fetchBestTestnetBalance(walletAddress);
      setBalance(best.info.balance);
      setPreferredRpc(best.source.rpcUrl);
      setChainName(best.source.chainName);
    } catch { /* silent */ }
    // Also refresh STT balance from Status Sepolia
    try {
      const sttInfo = await getSTTBalance(walletAddress);
      setSttBalance(sttInfo.balance || '0');
    } catch { /* silent */ }
  }, [fetchBestTestnetBalance, walletAddress]);

  const syncWalletAddress = useCallback(async (address) => {
    const normalized = (address || '').trim();
    if (!ethers.isAddress(normalized)) {
      return { success: false, error: 'Enter a valid wallet address.' };
    }
    setWalletAddress(normalized);
    try {
      const best = await fetchBestTestnetBalance(normalized);
      setBalance(best.info.balance);
      setPreferredRpc(best.source.rpcUrl);
      setChainName(best.source.chainName);
      return { success: true, balance: best.info.balance, network: best.source.chainName };
    } catch (err) {
      setBalance('0');
      return { success: false, error: err?.message || 'Failed to fetch balance.' };
    }
  }, [fetchBestTestnetBalance]);

  const payWithConnectedWallet = useCallback(async (receiver, amount, agentDecisionId = null) => {
    let activeSigner = walletSigner;
    const canRefreshWebSigner = Platform.OS === 'web' && typeof globalThis !== 'undefined' && globalThis?.ethereum;

    if (!activeSigner && canRefreshWebSigner) {
      try {
        const provider = new ethers.BrowserProvider(globalThis.ethereum);
        activeSigner = await provider.getSigner();
        const addr = await activeSigner.getAddress();
        const network = await provider.getNetwork();
        setWalletSigner(activeSigner);
        setWalletAddress(addr);
        setChainName(`Chain ${network.chainId.toString()}`);
      } catch {
        activeSigner = null;
      }
    }

    if (!activeSigner) {
      return {
        success: false,
        error: 'No connected wallet signer available. Use MetaMask on web or complete WalletConnect signer integration.',
      };
    }

    const runPaymentAttempt = async (params) => {
      try {
        const first = await sendPayment(receiver, amount, agentDecisionId, params);
        const networkChanged = /network changed|NETWORK_ERROR/i.test(String(first?.error || ''));

        if (!first?.success && networkChanged && canRefreshWebSigner) {
          try {
            const freshProvider = new ethers.BrowserProvider(globalThis.ethereum);
            const freshSigner = await freshProvider.getSigner();
            const freshAddress = await freshSigner.getAddress();
            const freshNetwork = await freshProvider.getNetwork();

            setWalletSigner(freshSigner);
            setWalletAddress(freshAddress);
            setChainName(`Chain ${freshNetwork.chainId.toString()}`);

            return await sendPayment(receiver, amount, agentDecisionId, {
              ...params,
              signer: freshSigner,
            });
          } catch {
            return first;
          }
        }

        return first;
      } catch (err) {
        return {
          success: false,
          error: err?.message || 'Transaction attempt failed.',
          txHash: null,
          method: 'wallet-signer',
          timestamp: new Date().toISOString(),
        };
      }
    };

    const firstAttempt = await runPaymentAttempt({ signer: activeSigner, requireContract: true, waitForConfirmation: false });
    if (firstAttempt?.success) {
      try {
        const senderAddress = await activeSigner.getAddress();
        const best = await fetchBestTestnetBalance(senderAddress);
        setBalance(best.info.balance);
        setPreferredRpc(best.source.rpcUrl);
        setChainName(best.source.chainName);
      } catch {
        // Ignore balance refresh failures after successful send.
      }
      return firstAttempt;
    }

    const needsStatusFunds = /Contract-only mode requires funds on Status Network Sepolia|Contract-only mode requires enough balance on Status Network Sepolia/i.test(String(firstAttempt?.error || ''));
    if (needsStatusFunds) {
      const directFallback = await runPaymentAttempt({ signer: activeSigner, requireContract: false, waitForConfirmation: false });
      if (directFallback?.success) {
        return {
          ...directFallback,
          warning: 'Used Ethereum Sepolia fallback because Status Sepolia balance was zero. This fallback payment is not contract-routed for track proof.',
        };
      }

      // Preserve the most useful fallback error when fallback is attempted but fails.
      return {
        ...directFallback,
        error: directFallback?.error || firstAttempt?.error || 'Transaction failed.',
      };
    }

    if (!canRefreshWebSigner) {
      return {
        ...firstAttempt,
        error: firstAttempt?.error || 'Transaction failed. Contract execution is required for this flow.',
      };
    }

    try {
      const provider = new ethers.BrowserProvider(globalThis.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const network = await provider.getNetwork();

      setWalletSigner(signer);
      setWalletAddress(addr);
      setChainName(`Chain ${network.chainId.toString()}`);

      const retry = await runPaymentAttempt({ signer, requireContract: true, waitForConfirmation: false });
      if (retry?.success) {
        try {
          const best = await fetchBestTestnetBalance(addr);
          setBalance(best.info.balance);
          setPreferredRpc(best.source.rpcUrl);
          setChainName(best.source.chainName);
        } catch {
          // Ignore balance refresh failures after successful send.
        }
      }
      return retry;
    } catch {
      return {
        ...firstAttempt,
        error: firstAttempt?.error || 'Transaction failed after retries. Please ensure wallet is on Status Sepolia and approve contract call.',
      };
    }
  }, [fetchBestTestnetBalance, walletSigner, withTimeout]);

  // ─── STT Payment ─────────────────────────────────────────────
  /**
   * Send STT tokens gaslessly.
   * Tries MetaMask signer first; falls back to embedded sponsor key.
   */
  const payWithSTT = useCallback(async (receiver, amountSTT, agentDecisionId = null) => {
    let activeSigner = walletSigner;

    // Try to refresh signer on web if not present
    if (!activeSigner && Platform.OS === 'web' && typeof globalThis !== 'undefined' && globalThis?.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(globalThis.ethereum);
        activeSigner = await provider.getSigner();
        const addr = await activeSigner.getAddress();
        setWalletSigner(activeSigner);
        setWalletAddress(addr);
      } catch {
        activeSigner = null;
      }
    }

    // sendSTTPayment handles sponsor key fallback internally when signer is null
    const result = await sendSTTPayment(receiver, amountSTT, agentDecisionId, {
      signer: activeSigner || null,
    });

    if (result?.success && walletAddress) {
      // Refresh STT balance after successful transfer
      try {
        const sttInfo = await getSTTBalance(walletAddress);
        setSttBalance(sttInfo.balance || '0');
      } catch { /* silent */ }
    }
    return result;
  }, [walletSigner, walletAddress]);

  const value = {
    isConnected,
    isConnecting,
    walletAddress,
    balance,
    sttBalance,
    chainName,
    connectedWallet,
    preferredRpc,
    setPreferredRpc,
    walletSigner,
    displayAddress: walletAddress ? formatWalletAddress(walletAddress) : 'Address Not Synced',
    connect,
    disconnect,
    refreshBalance,
    syncWalletAddress,
    payWithConnectedWallet,
    payWithSTT,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be inside WalletProvider');
  return ctx;
}

export default WalletContext;
