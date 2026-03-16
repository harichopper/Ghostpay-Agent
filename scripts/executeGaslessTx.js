/**
 * Execute one gasless transaction on Status Network Sepolia — for hackathon proof
 *
 * Run after deploying contract and funding it (or use direct ETH transfer).
 * Outputs tx hash for submission proof (gasPrice=0, gas=0).
 *
 * Usage: node scripts/executeGaslessTx.js
 * Requires: PRIVATE_KEY, CONTRACT_ADDRESS env vars (and optionally RECEIVER_ADDRESS)
 */

const { ethers } = require('ethers');

const RPC = 'https://public.sepolia.rpc.status.network';
const ETH_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const STATUS_CHAIN_ID = 1660990954;
const ABI = [
  { inputs: [{ name: 'receiver', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'agentDecisionId', type: 'string' }], name: 'sendPayment', outputs: [], stateMutability: 'payable', type: 'function' },
];

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const contractAddr = process.env.CONTRACT_ADDRESS;
  const receiver = process.env.RECEIVER_ADDRESS;

  if (!pk || !contractAddr) {
    console.error('Set PRIVATE_KEY and CONTRACT_ADDRESS');
    console.error('Optional: RECEIVER_ADDRESS (default: deployer self-send for demo)');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC);
  const ethSepoliaProvider = new ethers.JsonRpcProvider(ETH_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== STATUS_CHAIN_ID) {
    console.error('Wrong network. Expected chainId 1660990954 (Status Network Sepolia). Got:', network.chainId.toString());
    process.exit(1);
  }
  const to = receiver || wallet.address; // self-send for demo proof
  const amount = ethers.parseEther('0.0001');
  const decisionId = 'status-hackathon-proof-' + Date.now();

  // Preflight: contract sendPayment forwards msg.value, so sender must hold amount on Status chain.
  const [statusBal, ethSepBal] = await Promise.all([
    provider.getBalance(wallet.address),
    ethSepoliaProvider.getBalance(wallet.address),
  ]);

  if (statusBal < amount) {
    console.error('Insufficient STATUS Sepolia balance for msg.value transfer.');
    console.error('Wallet:', wallet.address);
    console.error('Status Sepolia (1660990954):', ethers.formatEther(statusBal), 'ETH');
    console.error('Ethereum Sepolia (11155111):', ethers.formatEther(ethSepBal), 'ETH');
    console.error('Fund the same address on Status Sepolia faucet and retry: https://faucet.status.network');
    process.exit(1);
  }

  const contract = new ethers.Contract(contractAddr, ABI, wallet);

  console.log('Executing gasless tx on Status Network Sepolia...');
  console.log('Contract:', contractAddr);
  console.log('From:', wallet.address);
  console.log('To:', to);
  console.log('Amount: 0.0001 ETH');
  console.log('gasPrice: 0, gasLimit: 200000\n');

  const tx = await contract.sendPayment(to, amount, decisionId, {
    value: amount,
    gasPrice: 0n,
    gasLimit: 200000,
  });

  const receipt = await tx.wait();
  const effectiveGasPrice = receipt.effectiveGasPrice ?? 0n;
  const gaslessByPrice = effectiveGasPrice === 0n;
  const gaslessByCost = (receipt.gasUsed * effectiveGasPrice) === 0n;

  console.log('TX HASH:', tx.hash);
  console.log('Explorer: https://sepoliascan.status.network/tx/' + tx.hash);
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('Effective gas price:', effectiveGasPrice.toString());
  console.log('Gasless proof (gasPrice=0):', gaslessByPrice ? 'PASS' : 'FAIL');
  console.log('Gasless proof (gasUsed * gasPrice = 0):', gaslessByCost ? 'PASS' : 'FAIL');
  console.log('Proof JSON:', JSON.stringify({
    chainId: Number(network.chainId),
    txHash: tx.hash,
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: effectiveGasPrice.toString(),
    gaslessByPrice,
    gaslessByCost,
  }));
}

main().catch((e) => { console.error(e); process.exit(1); });
