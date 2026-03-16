# 👻 GhostPay Agent — Status Network Hackathon

<p align="center">

![Status](https://img.shields.io/badge/Status-Ready%20for%20Submission-brightgreen)  
![Network](https://img.shields.io/badge/Network-Status%20Sepolia-purple)  
![Gasless](https://img.shields.io/badge/Gas%20Price-$0-success)  
![License](https://img.shields.io/badge/License-MIT-blue)

</p>

<p align="center">

🤖 <b>AI-powered gasless payments</b> on Status Network Sepolia  
Chain ID: <b>1660990954</b>

Built for the <b>Status Network “Go Gasless” Hackathon</b> — $2,000 prize pool

</p>

<p align="center">

<a href="#-final-submission-packet">Submission Ready</a> •
<a href="#-quick-start">Quick Start</a> •
<a href="#-deploy--execute-gasless-stt-transaction">Deployment</a> •
<a href="#-run-compliance-check">Compliance Check</a>

</p>

---
## 🎥 Demo Video

<p align="center">

<a href="https://drive.google.com/file/d/1LWf0_01ZGSg_oIxUDgC43xEmtNTe0k76/view?usp=drive_link">
  <img src="https://img.shields.io/badge/Click%20to%20Watch-Demo%20Video-red?style=for-the-badge&logo=google-drive">
</a>

</p>

## 📱 Download APK

<p align="center">

<a href="https://drive.google.com/file/d/1GvuuJb1GA_tkprEary9bkX0FSZTEMUY2/view?usp=sharing">
  <img src="https://img.shields.io/badge/Download-GhostPay%20APK-green?style=for-the-badge&logo=android">
</a>

</p>

# 📋 Table of Contents

- Features  
- Deployed Contracts  
- Gasless Proof  
- Quick Start  
- AI Agent Flow  
- Deployment  
- Compliance Check  
- Final Submission Packet  
- Project Structure  
- Configuration  

---

# ✨ Features

| Feature | Status |
|-------|-------|
| Verified Smart Contract | ✅ Status Network Sepolia |
| Gasless Transactions | ✅ `effectiveGasPrice = 0` |
| Gasless ERC20 (STT) | ✅ No ETH required |
| AI Agent Component | ✅ Rules engine + LLM parsing |
| Compliance Ready | ✅ Passes Status Track checks |
| Production UI | ✅ React Native + Expo |

---

# 🪙 Deployed Contracts

| Contract | Address | Explorer |
|--------|--------|--------|
| **TestToken (STT)** | `0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047` | https://sepoliascan.status.network/address/0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047 |
| **GhostPay** | `0x56c33B35f979200FF17ff76678a6780024daDD4B` | https://sepoliascan.status.network/address/0x56c33B35f979200FF17ff76678a6780024daDD4B |

**Why STT?**

Status Network Sepolia is **gasless at the protocol level**.

```
gasPrice = 0
```

This allows ERC20 transfers without paying gas fees.

---

# ⚡ Gasless Transaction Proof

Network

```
Status Network Sepolia
Chain ID: 1660990954
```

Transaction Hash

```
0xef29b8ac4f75dd238b0eedd3d2962dad72491dc5339b70e9dec3045e7b45a520
```

Explorer

https://sepoliascan.status.network/tx/0xef29b8ac4f75dd238b0eedd3d2962dad72491dc5339b70e9dec3045e7b45a520

Gas Information

```
effectiveGasPrice: 0
gaslessByPrice: true
gaslessByCost: true
```

This confirms the transaction executed **with zero gas cost**.

---

# 🚀 Quick Start

Install dependencies

```bash
npm install
```

Run the app

```bash
npm start
```

For Android (Expo)

```
Press 'a'
```

---

# 🤖 AI Agent Flow

```
User Prompt
      ↓
AI parses intent (amount + receiver)
      ↓
Rule engine verification
      ↓
Sponsor wallet signs transaction
      ↓
Gasless STT transfer on Status Network
      ↓
Transaction hash returned to user
```

---

# 🧠 AI Components

### services/agentService.js

Rule-based engine for:

- daily spending limits
- blacklist checks
- cooldown validation

### services/ollamaAgentService.js

LLM intent parsing using **Ollama**

Example command:

```
Send 10 STT to 0x123...
```

### services/blockchainService.js

Handles blockchain interaction.

```
sendSTTPayment()
```

Executes the gasless ERC20 transfer.

---

# ⛓️ Deploy & Execute Gasless STT Transaction

### Option A — One Command

```
npm run gasless:stt
```

Custom receiver

```
RECEIVER_ADDRESS=0xYourAddress npm run gasless:stt
```

Use existing token

```
TEST_TOKEN_ADDRESS=0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047 npm run gasless:stt
```

---

### Option B — MetaMask

Add network

```
Chain ID: 1660990954
RPC: https://public.sepolia.rpc.status.network
Explorer: https://sepoliascan.status.network
```

Import STT token

```
0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047
```

Then send STT through the app UI.

---

# ✅ Run Compliance Check

```
TOKEN_ADDRESS=0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047 \
TX_HASH=0xef29b8ac4f75dd238b0eedd3d2962dad72491dc5339b70e9dec3045e7b45a520 \
npm run check:stt
```

Expected Output

```
READY for Status Network submission
```

---

# 📦 Final Submission Packet

```
Track: Status Network — Go Gasless
Network: Status Network Sepolia (Chain ID: 1660990954)

Token (STT)
0x2a7AB4Bb55bF459eB3F25D2f84e29d7CF6095047

GhostPay Contract
0x56c33B35f979200FF17ff76678a6780024daDD4B

Gasless Transaction
0xef29b8ac4f75dd238b0eedd3d2962dad72491dc5339b70e9dec3045e7b45a520

effectiveGasPrice: 0
gaslessByPrice: true
gaslessByCost: true

AI Agent
services/agentService.js  
services/ollamaAgentService.js

Status: READY FOR SUBMISSION
```

---

# 📁 Project Structure

```
ghostpay-agent
│
├─ contracts
│  ├─ TestToken.sol
│  ├─ GhostPay.sol
│  ├─ GhostPayAgent.sol
│  └─ contractConfig.js
│
├─ scripts
│  ├─ deployTestToken.js
│  ├─ transferTestToken.js
│  ├─ deployAndTransferSTT.js
│  └─ checkSTTCompliance.js
│
├─ services
│  ├─ agentService.js
│  ├─ ollamaAgentService.js
│  └─ blockchainService.js
│
├─ screens
│  ├─ PaymentScreen.js
│  ├─ WalletScreen.js
│  └─ HomeScreen.js
│
└─ config
   └─ constants.js
```

---

# ⚙️ Configuration

Update these files if deploying your own contracts.

```
contracts/contractConfig.js
services/blockchainService.js
config/constants.js
```

Optional environment variable

```
EXPO_PUBLIC_PAYER_PRIVATE_KEY
```

---

# 📄 License

MIT License

Built for the **Status Network Gasless Hackathon**
