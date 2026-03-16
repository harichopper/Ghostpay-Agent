/**
 * Find latest contract transactions on Status explorer.
 *
 * Usage:
 *   CONTRACT_ADDRESS=0x... node scripts/findLatestContractTx.js
 */

const BLOCKSCOUT_BASE = 'https://sepoliascan.status.network/api/v2';

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error('Usage: CONTRACT_ADDRESS=0x... node scripts/findLatestContractTx.js');
    process.exit(1);
  }

  const url = `${BLOCKSCOUT_BASE}/addresses/${contractAddress}/transactions`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`Failed to fetch transactions: HTTP ${res.status}`);
    process.exit(1);
  }

  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  if (!items.length) {
    console.log('No transactions found for this contract address.');
    return;
  }

  console.log('Latest transactions for contract:');
  for (const tx of items.slice(0, 10)) {
    const hash = tx?.hash || 'unknown';
    const status = tx?.status || 'unknown';
    const to = tx?.to?.hash || tx?.to || null;
    const method = tx?.method || 'unknown';
    const gasPrice = tx?.gas_price ?? 'unknown';
    const timestamp = tx?.timestamp || 'unknown';

    console.log(JSON.stringify({
      hash,
      status,
      method,
      to,
      gasPrice,
      timestamp,
      explorerUrl: `https://sepoliascan.status.network/tx/${hash}`,
    }));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
