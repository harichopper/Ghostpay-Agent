const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const STATUS_SEPOLIA = {
  rpcUrl: 'https://public.sepolia.rpc.status.network',
  chainId: 1660990954,
};

async function compile() {
  const solc = require('solc');
  const contractPath = path.join(process.cwd(), 'contracts', 'TestToken.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'TestToken.sol': { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      evmVersion: 'paris',
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contract = output?.contracts?.['TestToken.sol']?.TestToken;
  if (!contract) {
    throw new Error('Compilation failed for TestToken.sol');
  }

  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

async function main() {
  const pkRaw = process.env.PRIVATE_KEY;
  const supplyRaw = process.env.TOKEN_SUPPLY || '1000000';

  if (!pkRaw) {
    console.error('Set PRIVATE_KEY before running deploy:token');
    process.exit(1);
  }

  const pk = pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`;
  const supply = Number.parseInt(supplyRaw, 10);
  if (!Number.isFinite(supply) || supply <= 0) {
    console.error('TOKEN_SUPPLY must be a positive integer. Example: TOKEN_SUPPLY=1000000');
    process.exit(1);
  }

  const { abi, bytecode } = await compile();

  const provider = new ethers.JsonRpcProvider(STATUS_SEPOLIA.rpcUrl);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== STATUS_SEPOLIA.chainId) {
    console.error('Wrong network from provider. Expected 1660990954.');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(pk, provider);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log('Deploying TestToken on Status Sepolia...');
  console.log('Deployer:', wallet.address);
  console.log('Supply:', supply);

  const contract = await factory.deploy(supply, { gasPrice: 0n, gasLimit: 1000000n });
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('TEST_TOKEN_ADDRESS:', address);
  console.log('Explorer:', `https://sepoliascan.status.network/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
