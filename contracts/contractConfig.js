// GhostPay Agent — Status Network Contract Config
// ABI and Address for the GhostPay.sol contract on Status Sepolia

// export const CONTRACT_ADDRESS = '0xb01f12468046Eb795Cd4f768D4257C163dCC5515';
export const CONTRACT_ADDRESS = '0x56c33B35f979200FF17ff76678a6780024daDD4B';
export const GHOSTPAY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "agentDecisionId",
        "type": "string"
      }
    ],
    "name": "Payment",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "receiver", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "agentDecisionId", "type": "string" }
    ],
    "name": "sendPayment",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];
