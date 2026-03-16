/**
 * GhostPay Contract Deploy Script — Status Network Sepolia
 *
 * Deploy via Remix (recommended): https://remix.ethereum.org
 * 1. Create GhostPay.sol, paste contract code
 * 2. Compile (0.8.20)
 * 3. Injected Provider → MetaMask on Status Sepolia (Chain ID 1660990954)
 * 4. Deploy, copy address to contracts/contractConfig.js
 *
 * Or run: PRIVATE_KEY=0x... node scripts/deploy.js
 * Requires: npm install solc
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const STATUS_SEPOLIA = {
  rpcUrl: 'https://public.sepolia.rpc.status.network',
  chainId: 1660990954,
};

async function compile() {
  try {
    const solc = require('solc');
    const contractPath = path.join(process.cwd(), 'contracts', 'GhostPay.sol');
    const source = fs.readFileSync(contractPath, 'utf8');
    const input = {
      language: 'Solidity',
      sources: { 'GhostPay.sol': { content: source } },
      settings: {
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
        evmVersion: 'paris',  // Avoid PUSH0 (Shanghai) - L2 compatibility
      },
    };
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const contract = output.contracts['GhostPay.sol'].GhostPay;
    if (!contract) throw new Error('Compilation failed');
    return { abi: contract.abi, bytecode: '0x' + contract.evm.bytecode.object };
  } catch (e) {
    console.error('Compile failed. Install solc: npm install solc');
    console.error('Or deploy via Remix: https://remix.ethereum.org');
    throw e;
  }
}

async function main() {
  let pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error('Set PRIVATE_KEY (e.g. PRIVATE_KEY=0x... node scripts/deploy.js)');
    process.exit(1);
  }

  if (!pk.startsWith('0x')) pk = '0x' + pk;
  const { abi, bytecode } = await compile();
  const provider = new ethers.JsonRpcProvider(STATUS_SEPOLIA.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  console.log('Deploying to Status Network Sepolia (Chain ID: 1660990954)');
  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy({ gasLimit: 800000, gasPrice: 0 });
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log('\n✅ GhostPay deployed at:', addr);
  console.log('Update CONTRACT_ADDRESS in contracts/contractConfig.js');
  console.log('Verify: https://sepoliascan.status.network/address/' + addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
