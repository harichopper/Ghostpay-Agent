/**
 * Status Track Compliance Check
 *
 * Validates the key Go Gasless submission requirements against on-chain data:
 * - Network is Status Sepolia (1660990954)
 * - Contract address has deployed bytecode
 * - Transaction exists and succeeded
 * - Transaction targets your contract
 * - Gasless proof checks (effectiveGasPrice == 0 and gasUsed * effectiveGasPrice == 0)
 *
 * Usage:
 *   CONTRACT_ADDRESS=0x... TX_HASH=0x... node scripts/checkTrackCompliance.js
 */

const { ethers } = require('ethers');

const RPC = 'https://public.sepolia.rpc.status.network';
const STATUS_CHAIN_ID = 1660990954;
const BLOCKSCOUT_BASE = 'https://sepoliascan.status.network/api/v2';

function fail(message) {
  console.error('FAIL:', message);
}

function pass(message) {
  console.log('PASS:', message);
}

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const txHash = process.env.TX_HASH;

  if (!contractAddress || !txHash) {
    console.error('Usage: CONTRACT_ADDRESS=0x... TX_HASH=0x... node scripts/checkTrackCompliance.js');
    process.exit(1);
  }

  if (!ethers.isAddress(contractAddress)) {
    console.error('Invalid CONTRACT_ADDRESS:', contractAddress);
    process.exit(1);
  }

  if (!/^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
    console.error('Invalid TX_HASH:', txHash);
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  let allGood = true;

  if (chainId === STATUS_CHAIN_ID) {
    pass('Connected to Status Network Sepolia (1660990954).');
  } else {
    allGood = false;
    fail(`Connected to wrong chain: ${chainId}. Expected 1660990954.`);
  }

  const code = await provider.getCode(contractAddress);
  const hasCode = code && code !== '0x';
  if (hasCode) {
    pass('Contract address has deployed bytecode.');
  } else {
    allGood = false;
    fail('No deployed contract bytecode at CONTRACT_ADDRESS on Status Sepolia.');
  }

  try {
    const addressRes = await fetch(`${BLOCKSCOUT_BASE}/addresses/${contractAddress}`);
    if (addressRes.ok) {
      const addressData = await addressRes.json();
      const isVerified = Boolean(addressData?.is_verified);
      if (isVerified) {
        pass('Contract is verified on explorer.');
      } else {
        allGood = false;
        fail('Contract is not verified on explorer yet. Verify source code before submission.');
      }
    } else {
      allGood = false;
      fail(`Could not verify contract verification status (HTTP ${addressRes.status}).`);
    }
  } catch (e) {
    allGood = false;
    fail(`Could not verify contract verification status: ${e?.message || 'unknown error'}`);
  }

  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!tx || !receipt) {
    allGood = false;
    fail('Transaction not found on Status Sepolia for TX_HASH.');
  } else {
    pass('Transaction exists on Status Sepolia.');

    if (receipt.status === 1) {
      pass('Transaction status is successful.');
    } else {
      allGood = false;
      fail(`Transaction failed with status ${receipt.status}.`);
    }

    const txTo = (tx.to || '').toLowerCase();
    if (txTo === contractAddress.toLowerCase()) {
      pass('Transaction targets your contract address.');
    } else {
      allGood = false;
      fail(`Transaction target mismatch. tx.to=${tx.to || 'null'} CONTRACT_ADDRESS=${contractAddress}`);
    }

    // sendPayment selector = first 4 bytes of keccak('sendPayment(address,uint256,string)')
    const sendPaymentSelector = '0x44d6dcae';
    if (typeof tx.data === 'string' && tx.data.startsWith(sendPaymentSelector)) {
      pass('Transaction method matches sendPayment(address,uint256,string).');
    } else {
      allGood = false;
      fail('Transaction input does not match sendPayment(address,uint256,string).');
    }

    const effectiveGasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? 0n;
    const gasUsed = receipt.gasUsed ?? 0n;
    const gaslessByPrice = effectiveGasPrice === 0n;
    const gaslessByCost = (gasUsed * effectiveGasPrice) === 0n;

    if (gaslessByPrice) {
      pass('Gasless check passed: effectiveGasPrice == 0.');
    } else {
      allGood = false;
      fail(`Gasless check failed: effectiveGasPrice=${effectiveGasPrice.toString()}.`);
    }

    if (gaslessByCost) {
      pass('Gasless check passed: gasUsed * effectiveGasPrice == 0.');
    } else {
      allGood = false;
      fail(`Gasless cost check failed: gasUsed=${gasUsed.toString()} effectiveGasPrice=${effectiveGasPrice.toString()}.`);
    }

    const proof = {
      chainId,
      contractAddress,
      txHash,
      txStatus: receipt.status,
      gasUsed: gasUsed.toString(),
      effectiveGasPrice: effectiveGasPrice.toString(),
      gaslessByPrice,
      gaslessByCost,
    };

    console.log('\nProof JSON:');
    console.log(JSON.stringify(proof, null, 2));
  }

  if (!allGood) {
    console.error('\nResult: NOT READY for strict Status track submission.');
    process.exit(1);
  }

  console.log('\nResult: READY for strict Status track submission checks.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
