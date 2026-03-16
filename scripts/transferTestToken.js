const { ethers } = require('ethers');

const STATUS_SEPOLIA_RPC = 'https://public.sepolia.rpc.status.network';

const TEST_TOKEN_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

async function main() {
  const pkRaw = process.env.PRIVATE_KEY;
  const tokenAddress = process.env.TEST_TOKEN_ADDRESS;
  const receiver = process.env.RECEIVER_ADDRESS;
  const amountRaw = process.env.AMOUNT || '5';

  if (!pkRaw || !tokenAddress || !receiver) {
    console.error('Set PRIVATE_KEY, TEST_TOKEN_ADDRESS, RECEIVER_ADDRESS (optional AMOUNT).');
    process.exit(1);
  }

  if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(receiver)) {
    console.error('Invalid TEST_TOKEN_ADDRESS or RECEIVER_ADDRESS.');
    process.exit(1);
  }

  const pk = pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`;
  const provider = new ethers.JsonRpcProvider(STATUS_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(tokenAddress, TEST_TOKEN_ABI, wallet);

  const amount = ethers.parseUnits(String(amountRaw), 18);

  console.log('Sending STT...');
  console.log('From:', wallet.address);
  console.log('To:', receiver);
  console.log('Amount:', amountRaw);

  const tx = await contract.transfer(receiver, amount, {
    gasPrice: 0n,
    gasLimit: 150000n,
  });

  const receipt = await tx.wait();

  console.log('TX_HASH:', tx.hash);
  console.log('Explorer:', `https://sepoliascan.status.network/tx/${tx.hash}`);
  console.log('EffectiveGasPrice:', String(receipt.effectiveGasPrice ?? 0n));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
