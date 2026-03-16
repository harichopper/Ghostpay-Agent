/**
 * Status Track Compliance Check — STT Token (ERC20 gasless transfer)
 *
 * Validates all Go Gasless submission requirements for ERC20/token transactions:
 *   ✅ Connected to Status Network Sepolia (1660990954)
 *   ✅ Token contract has deployed bytecode
 *   ✅ Transaction exists and succeeded
 *   ✅ Transaction targets the token contract
 *   ✅ Gasless proof: effectiveGasPrice == 0
 *   ✅ Gasless proof: gasUsed * effectiveGasPrice == 0
 *
 * Usage:
 *   TOKEN_ADDRESS=0x... TX_HASH=0x... node scripts/checkSTTCompliance.js
 */

const { ethers } = require('ethers');

const RPC              = 'https://public.sepolia.rpc.status.network';
const STATUS_CHAIN_ID  = 1660990954;
const EXPLORER_BASE    = 'https://sepoliascan.status.network';
const BLOCKSCOUT_API   = `${EXPLORER_BASE}/api/v2`;

// ERC20 Transfer event topic
const TRANSFER_TOPIC   = ethers.id('Transfer(address,address,uint256)');

function pass(msg) { console.log(`  ✅ PASS: ${msg}`); }
function fail(msg) { console.error(`  ❌ FAIL: ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const txHash       = process.env.TX_HASH;

  if (!tokenAddress || !txHash) {
    console.error('Usage: TOKEN_ADDRESS=0x... TX_HASH=0x... node scripts/checkSTTCompliance.js');
    process.exit(1);
  }

  if (!ethers.isAddress(tokenAddress)) { console.error('Invalid TOKEN_ADDRESS:', tokenAddress); process.exit(1); }
  if (!/^0x([A-Fa-f0-9]{64})$/.test(txHash)) { console.error('Invalid TX_HASH:', txHash); process.exit(1); }

  console.log('\n════════════════════════════════════════════════════');
  console.log(' Status Track Compliance Check — STT Gasless Token');
  console.log('════════════════════════════════════════════════════\n');

  const provider = new ethers.JsonRpcProvider(RPC);
  const network  = await provider.getNetwork();
  const chainId  = Number(network.chainId);
  let allGood    = true;

  // ─── Check 1: Network ───────────────────────────────────────────
  console.log('1. Network Check:');
  if (chainId === STATUS_CHAIN_ID) {
    pass(`Connected to Status Network Sepolia (${chainId})`);
  } else {
    allGood = false;
    fail(`Wrong chain: ${chainId}. Expected ${STATUS_CHAIN_ID}`);
  }

  // ─── Check 2: Contract bytecode ────────────────────────────────
  console.log('\n2. Token Contract Bytecode:');
  const code = await provider.getCode(tokenAddress);
  const hasCode = code && code !== '0x';
  if (hasCode) {
    pass(`Token contract has deployed bytecode at ${tokenAddress}`);
    info(`Explorer: ${EXPLORER_BASE}/address/${tokenAddress}`);
  } else {
    allGood = false;
    fail(`No contract bytecode at ${tokenAddress} on Status Sepolia`);
  }

  // ─── Check 3: Transaction ───────────────────────────────────────
  console.log('\n3. Transaction Check:');
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!tx || !receipt) {
    allGood = false;
    fail(`Transaction not found on Status Sepolia: ${txHash}`);
    console.log('\n❌ Result: NOT READY for submission (transaction not found).');
    process.exit(1);
  }

  pass(`Transaction found on Status Sepolia`);
  info(`Explorer: ${EXPLORER_BASE}/tx/${txHash}`);

  // ─── Check 4: TX success ────────────────────────────────────────
  console.log('\n4. Transaction Status:');
  if (receipt.status === 1) {
    pass('Transaction succeeded (status = 1)');
  } else {
    allGood = false;
    fail(`Transaction failed (status = ${receipt.status})`);
  }

  // ─── Check 5: TX targets token contract ────────────────────────
  console.log('\n5. Transaction Target:');
  const txTo = (tx.to || '').toLowerCase();
  if (txTo === tokenAddress.toLowerCase()) {
    pass(`Transaction targets token contract: ${tx.to}`);
  } else {
    allGood = false;
    fail(`Target mismatch: tx.to=${tx.to} but TOKEN_ADDRESS=${tokenAddress}`);
  }

  // ─── Check 6: ERC20 Transfer event ─────────────────────────────
  console.log('\n6. ERC20 Transfer Event:');
  const transferLog = receipt.logs.find(l =>
    l.address.toLowerCase() === tokenAddress.toLowerCase() &&
    l.topics[0] === TRANSFER_TOPIC
  );
  if (transferLog) {
    const iface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]);
    const decoded = iface.parseLog({ topics: transferLog.topics, data: transferLog.data });
    const amount = ethers.formatUnits(decoded.args.value, 18);
    pass(`ERC20 Transfer event found: ${amount} tokens from ${decoded.args.from} to ${decoded.args.to}`);
  } else {
    // Not fatal for STT (could be direct transfer method check instead)
    info('No ERC20 Transfer event found in logs (may be fine if tx is a direct transfer check)');
  }

  // ─── Check 7: Gasless proof ─────────────────────────────────────
  console.log('\n7. Gasless Proof:');
  const effectiveGasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? 0n;
  const gasUsed           = receipt.gasUsed ?? 0n;
  const gaslessByPrice    = effectiveGasPrice === 0n;
  const gaslessByCost     = (gasUsed * effectiveGasPrice) === 0n;

  if (gaslessByPrice) {
    pass(`effectiveGasPrice == 0 ← Core gasless proof`);
  } else {
    allGood = false;
    fail(`effectiveGasPrice = ${effectiveGasPrice.toString()} (expected 0)`);
  }

  if (gaslessByCost) {
    pass(`gasUsed × effectiveGasPrice == 0 ← Zero gas cost`);
  } else {
    allGood = false;
    fail(`Gas cost = ${(gasUsed * effectiveGasPrice).toString()} (expected 0)`);
  }

  info(`Gas used: ${gasUsed.toString()}`);
  info(`Effective gas price: ${effectiveGasPrice.toString()}`);

  // ─── Proof JSON ─────────────────────────────────────────────────
  const proof = {
    chainId,
    tokenAddress,
    txHash,
    txStatus:         receipt.status,
    gasUsed:          gasUsed.toString(),
    effectiveGasPrice: effectiveGasPrice.toString(),
    gaslessByPrice,
    gaslessByCost,
    explorerUrl:      `${EXPLORER_BASE}/tx/${txHash}`,
  };

  console.log('\n────────────────────────────────────────────────────');
  console.log('Proof JSON (paste into submission):');
  console.log(JSON.stringify(proof, null, 2));

  // ─── Final result ───────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  if (allGood) {
    console.log('🎉 Result: READY for strict Status track submission checks.\n');
  } else {
    console.error('❌ Result: NOT READY — fix the failing checks above.\n');
    process.exit(1);
  }
}

main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
