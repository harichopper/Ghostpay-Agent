/**
 * GhostPay Agent — Deploy STT Token & Execute Gasless Transfer (SECURE VERSION)
 * 
 * 🔒 SECURITY FIXES:
 * - Removed hardcoded private key
 * - Uses environment variables (.env)
 * - Fails safely if key missing
 */

require('dotenv').config();

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────
const STATUS_SEPOLIA_RPC = 'https://public.sepolia.rpc.status.network';
const STATUS_CHAIN_ID = 1660990954;
const EXPLORER_BASE = 'https://sepoliascan.status.network';

// Minimal ERC20 ABI
const ERC20_ABI = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// ─── Compile Contract ─────────────────────────────────────────────
async function compileTestToken() {
  console.log('📦 Compiling TestToken.sol...');

  let solc;
  try {
    solc = require('solc');
  } catch {
    throw new Error('Install solc: npm install solc');
  }

  const contractPath = path.join(process.cwd(), 'contracts', 'TestToken.sol');

  if (!fs.existsSync(contractPath)) {
    throw new Error(`TestToken.sol not found at ${contractPath}`);
  }

  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'TestToken.sol': { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  };

  const result = JSON.parse(solc.compile(JSON.stringify(input)));

  if (result.errors) {
    const errors = result.errors.filter(e => e.severity === 'error');
    if (errors.length) {
      throw new Error(errors.map(e => e.message).join('\n'));
    }
  }

  const compiled = result.contracts['TestToken.sol'].TestToken;

  return {
    abi: compiled.abi,
    bytecode: '0x' + compiled.evm.bytecode.object,
  };
}

// ─── Validate ENV ─────────────────────────────────────────────────
function getPrivateKey() {
  const pkRaw = process.env.PRIVATE_KEY;

  if (!pkRaw) {
    throw new Error('❌ PRIVATE_KEY missing in .env');
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(pkRaw)) {
    throw new Error('❌ Invalid PRIVATE_KEY format');
  }

  return pkRaw;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 GhostPay Agent (SECURE)\n');

  const PRIVATE_KEY = getPrivateKey();

  const provider = new ethers.JsonRpcProvider(STATUS_SEPOLIA_RPC);
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== STATUS_CHAIN_ID) {
    throw new Error('Wrong network');
  }

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Wallet:', wallet.address);

  // ─── Deploy or Use Token ───────────────────────────────────────
  let tokenAddress = process.env.TEST_TOKEN_ADDRESS;
  let token;

  if (tokenAddress && ethers.isAddress(tokenAddress)) {
    console.log('Using existing token:', tokenAddress);
    token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  } else {
    console.log('Deploying TestToken...');

    const { abi, bytecode } = await compileTestToken();

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    const contract = await factory.deploy(1_000_000, {
      gasPrice: 0n,
      gasLimit: 2_000_000n,
    });

    await contract.waitForDeployment();

    tokenAddress = await contract.getAddress();
    token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    console.log('Deployed at:', tokenAddress);
  }

  // ─── Token Info ────────────────────────────────────────────────
  const [symbol, decimals, balanceRaw] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.balanceOf(wallet.address),
  ]);

  const balance = ethers.formatUnits(balanceRaw, decimals);

  console.log(`Balance: ${balance} ${symbol}`);

  if (balanceRaw === 0n) {
    throw new Error('No tokens to send');
  }

  // ─── Transfer ──────────────────────────────────────────────────
  const receiver = process.env.RECEIVER_ADDRESS || wallet.address;
  const amount = process.env.AMOUNT || '10';

  const value = ethers.parseUnits(amount, decimals);

  console.log(`Sending ${amount} ${symbol} → ${receiver}`);

  const tx = await token.transfer(receiver, value, {
    gasPrice: 0n,
    gasLimit: 150000n,
  });

  const receipt = await tx.wait();

  console.log('\n✅ GASLESS PROOF');
  console.log('TX:', tx.hash);
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Gas Price:', receipt.effectiveGasPrice.toString());

  const isGasless =
    receipt.effectiveGasPrice === 0n ||
    receipt.gasUsed * receipt.effectiveGasPrice === 0n;

  console.log('Gasless:', isGasless ? '✅ YES' : '❌ NO');

  console.log('\nExplorer:');
  console.log(`${EXPLORER_BASE}/tx/${tx.hash}`);
}

// ─── Run ─────────────────────────────────────────────────────────
main().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
