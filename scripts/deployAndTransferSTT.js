/**
 * GhostPay Agent — Deploy STT Token & Execute Gasless Transfer
 * 
 * Status Network Sepolia (Chain ID: 1660990954) is gasless at the protocol level.
 * ERC20 token transfers require NO ETH value — only gasPrice=0.
 * This script:
 *   1. Deploys the TestToken (STT) contract if not already deployed
 *   2. Executes a gasless STT transfer (gasPrice=0, no msg.value)
 *   3. Prints the proof JSON for hackathon submission
 * 
 * Usage:
 *   node scripts/deployAndTransferSTT.js
 *   PRIVATE_KEY=0x... node scripts/deployAndTransferSTT.js
 *   TEST_TOKEN_ADDRESS=0x... node scripts/deployAndTransferSTT.js   (skip deploy, just transfer)
 * 
 * Private key defaults to the sponsor key in config if not set via env.
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────
const STATUS_SEPOLIA_RPC = 'https://public.sepolia.rpc.status.network';
const STATUS_CHAIN_ID    = 1660990954;
const EXPLORER_BASE      = 'https://sepoliascan.status.network';

// Fallback sponsor key — same key as in config/constants.js
const FALLBACK_PRIVATE_KEY = '0xe73e43f2fb5505e7981dfa6ed7bf41f516708f37b4fb1ade3371d344208f6b29';

// Minimal ERC20 ABI needed for transfer + decimals + balanceOf
const ERC20_ABI = [
  { inputs: [], name: 'name',     outputs: [{ type: 'string' }],  stateMutability: 'view',        type: 'function' },
  { inputs: [], name: 'symbol',   outputs: [{ type: 'string' }],  stateMutability: 'view',        type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8'  }],  stateMutability: 'view',        type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }], name: 'Transfer', type: 'event' },
];

// ─── Compile TestToken ────────────────────────────────────────────
async function compileTestToken() {
  console.log('📦 Compiling TestToken.sol...');
  let solc;
  try {
    solc = require('solc');
  } catch {
    throw new Error('solc not found. Run: npm install solc  (it is in devDependencies)');
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
      evmVersion: 'paris',
    },
  };

  const result = JSON.parse(solc.compile(JSON.stringify(input)));
  if (result.errors) {
    const fatals = result.errors.filter(e => e.severity === 'error');
    if (fatals.length > 0) throw new Error('Compilation errors:\n' + fatals.map(e => e.message).join('\n'));
  }

  const compiled = result?.contracts?.['TestToken.sol']?.TestToken;
  if (!compiled) throw new Error('Compilation produced no output for TestToken');

  return {
    abi:      compiled.abi,
    bytecode: '0x' + compiled.evm.bytecode.object,
  };
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n════════════════════════════════════════════════════');
  console.log(' GhostPay Agent — Gasless STT Deploy & Transfer');
  console.log(' Status Network Sepolia (Chain ID: 1660990954)');
  console.log('════════════════════════════════════════════════════\n');

  // Resolve private key
  const pkRaw = process.env.PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
  const pk = pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`;

  // Connect to Status Sepolia
  const provider = new ethers.JsonRpcProvider(STATUS_SEPOLIA_RPC);
  const network  = await provider.getNetwork();
  const chainId  = Number(network.chainId);

  if (chainId !== STATUS_CHAIN_ID) {
    throw new Error(`Wrong network! Expected ${STATUS_CHAIN_ID} (Status Sepolia), got ${chainId}`);
  }
  console.log(`✅ Connected to Status Network Sepolia (chainId: ${chainId})\n`);

  const wallet = new ethers.Wallet(pk, provider);
  console.log(`👤 Wallet address : ${wallet.address}`);

  const ethBal = await provider.getBalance(wallet.address);
  console.log(`💰 ETH balance    : ${ethers.formatEther(ethBal)} ETH (expected 0 — gasless chain!)\n`);

  // ─── Step 1: Deploy or use existing STT token ───────────────────
  let tokenAddress = process.env.TEST_TOKEN_ADDRESS;
  let tokenContract;

  if (tokenAddress && ethers.isAddress(tokenAddress)) {
    console.log(`🔍 Using existing STT token : ${tokenAddress}`);
    tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    const code = await provider.getCode(tokenAddress);
    if (!code || code === '0x') {
      throw new Error(`No contract found at TEST_TOKEN_ADDRESS=${tokenAddress} on Status Sepolia`);
    }
    console.log('✅ Contract found at provided address.\n');
  } else {
    console.log('🚀 Deploying TestToken (STT) on Status Sepolia...');
    console.log('   gasPrice = 0  (protocol-level gasless — no ETH needed)\n');

    const { abi, bytecode } = await compileTestToken();
    const supply = 1_000_000; // 1M STT tokens

    const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
    const deployed = await factory.deploy(supply, {
      gasPrice: 0n,
      gasLimit: 2_000_000n,
    });
    await deployed.waitForDeployment();
    tokenAddress  = await deployed.getAddress();
    tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    console.log(`✅ STT Token deployed!`);
    console.log(`   Address  : ${tokenAddress}`);
    console.log(`   Explorer : ${EXPLORER_BASE}/address/${tokenAddress}\n`);
  }

  // ─── Step 2: Read token info & balance ─────────────────────────
  const [name, symbol, decimals, rawBalance] = await Promise.all([
    tokenContract.name(),
    tokenContract.symbol(),
    tokenContract.decimals(),
    tokenContract.balanceOf(wallet.address),
  ]);
  const balance = ethers.formatUnits(rawBalance, decimals);
  console.log(`🪙  Token     : ${name} (${symbol})`);
  console.log(`   Balance   : ${balance} ${symbol}\n`);

  if (rawBalance === 0n) {
    throw new Error(`Wallet has 0 ${symbol}. Deploy the token first (this wallet must be the minter).`);
  }

  // ─── Step 3: Execute gasless STT transfer ──────────────────────
  const receiver   = process.env.RECEIVER_ADDRESS || wallet.address; // self-send demo if not set
  const amountSTT  = process.env.AMOUNT || '10';                     // 10 STT default
  const amountWei  = ethers.parseUnits(amountSTT, decimals);

  console.log(`📤 Executing gasless ${amountSTT} ${symbol} transfer...`);
  console.log(`   From     : ${wallet.address}`);
  console.log(`   To       : ${receiver}${receiver === wallet.address ? ' (self-send demo)' : ''}`);
  console.log(`   Amount   : ${amountSTT} ${symbol}`);
  console.log(`   gasPrice : 0  ← Key gasless proof`);
  console.log(`   gas      : 0  ← Status Network protocol level\n`);

  const tx = await tokenContract.transfer(receiver, amountWei, {
    gasPrice:  0n,
    gasLimit:  150_000n,
  });

  console.log(`⏳ Waiting for confirmation...`);
  const receipt = await tx.wait();

  // ─── Step 4: Output proof ───────────────────────────────────────
  const effectiveGasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? 0n;
  const gasUsed           = receipt.gasUsed ?? 0n;
  const gaslessByPrice    = effectiveGasPrice === 0n;
  const gaslessByCost     = (gasUsed * effectiveGasPrice) === 0n;

  console.log('\n════════════════════════════════════════════════════');
  console.log(' ✅  GASLESS TRANSACTION PROOF');
  console.log('════════════════════════════════════════════════════');
  console.log(`TX Hash       : ${tx.hash}`);
  console.log(`Explorer      : ${EXPLORER_BASE}/tx/${tx.hash}`);
  console.log(`Token Address : ${tokenAddress}`);
  console.log(`Token Explorer: ${EXPLORER_BASE}/address/${tokenAddress}`);
  console.log(`Gas Used      : ${gasUsed.toString()}`);
  console.log(`effectiveGasPrice : ${effectiveGasPrice.toString()}`);
  console.log(`Gasless (price=0) : ${gaslessByPrice ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Gasless (cost=0)  : ${gaslessByCost  ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`TX Status         : ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
  console.log('');

  const proof = {
    chainId:          chainId,
    tokenAddress:     tokenAddress,
    tokenSymbol:      symbol,
    txHash:           tx.hash,
    txStatus:         receipt.status,
    gasUsed:          gasUsed.toString(),
    effectiveGasPrice: effectiveGasPrice.toString(),
    gaslessByPrice,
    gaslessByCost,
    explorerUrl:      `${EXPLORER_BASE}/tx/${tx.hash}`,
  };

  console.log('Proof JSON:');
  console.log(JSON.stringify(proof, null, 2));

  console.log('\n════════════════════════════════════════════════════');
  console.log(' 📋  SUBMISSION PACKET');
  console.log('════════════════════════════════════════════════════');
  console.log(`Track         : Status Network - Go Gasless`);
  console.log(`Network       : Status Network Sepolia (Chain ID: 1660990954)`);
  console.log(`Token Address : ${tokenAddress}`);
  console.log(`Token URL     : ${EXPLORER_BASE}/address/${tokenAddress}`);
  console.log(`Gasless TX    : ${tx.hash}`);
  console.log(`TX URL        : ${EXPLORER_BASE}/tx/${tx.hash}`);
  console.log(`AI Agent      : Rule engine + intent parsing in services/agentService.js`);
  console.log(`README        : Included in repo`);
  console.log('════════════════════════════════════════════════════\n');

  if (!gaslessByPrice || !gaslessByCost || receipt.status !== 1) {
    console.error('❌ One or more gasless checks FAILED. Do not submit until fixed.');
    process.exit(1);
  }
  console.log('🎉 All checks PASSED — ready for Status Network submission!\n');
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message || e);
  process.exit(1);
});
