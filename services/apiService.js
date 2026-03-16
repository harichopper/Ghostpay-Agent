// GhostPay Agent — API Service
// Handles external API calls (price feeds, gas estimates).

import axios from 'axios';

/**
 * Fetch current ETH price in USD
 */
export async function getEthPrice() {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'
    );
    return {
      usd: response.data.ethereum.usd.toFixed(2),
      change24h: response.data.ethereum.usd_24h_change?.toFixed(2) ?? '0.00',
    };
  } catch (error) {
    return { usd: '0.00', change24h: '0.00' };
  }
}

/**
 * Fetch gas price estimate (Status Network is gasless; returns zeros)
 */
export async function getGasEstimate() {
  return { low: '0', medium: '0', high: '0', unit: 'Gwei' };
}
