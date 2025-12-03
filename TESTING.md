# Testing Guide - HumanWork Protocol

## Complete End-to-End Testing

This guide helps you test the entire HumanWork Protocol system with the AI-PM backend listener.

### ✅ Prerequisites

- Smart contracts deployed
- Backend running
- All environment variables configured

---

## Step-by-Step Testing

### Step 1: Start Backend Listener (Terminal 1)

```bash
cd backend
npm start
```

**Expected Output:**
```
✅ Connected to RPC successfully
🔗 AI Worker (Full Startup Mode) Starting...
📍 Worker Wallet: 0xdcEB742281388BDb5C7bc3da6D43ae1d7743f621
📡 Monitoring ProjectEscrow at 0x9966f1CE354B662c7EFb8dB01b97f0e9f99bF1Ba...
✅ All listeners active and monitoring blockchain...
⏳ Waiting for events...
```

✅ **Status**: Backend is listening for events

---

### Step 2: Run System Test (Terminal 2)

```bash
./test_system.sh
```

**Expected Output:**
```
🚀 Starting Full System Test...
✅ Contracts verified
1️⃣  Registering User...
✅ User registered successfully
2️⃣  Minting Mock USDC...
3️⃣  Approving Escrow Contract...
4️⃣  Creating Project...
5️⃣  Raising Dispute on Project...
✅ Test Sequence Complete!
Check your Backend Terminal for AI-PM Logs!
```

✅ **Status**: All 5 test steps completed successfully

---

### Step 3: Check Backend Terminal (Terminal 1)

**Expected Output (after test completes):**

```
📊 [ProjectEscrow] Found 2 logs in blocks 28288400-28288410
✅ [ProjectEscrow] Successfully parsed 2 events

============================================================
✨ Event from ProjectEscrow: DisputeCreated
============================================================
📦 Event Data: [1, 0, 0xdcEB742281388BDb5C7bc3da6D43ae1d7743f621]
🔗 Transaction: 0x...
📍 Block: 28288410

🎯 Processing ProjectEscrow.DisputeCreated

🚨 DISPUTE CREATED!
Project ID: 1
Milestone ID: 0
Initiator: 0xdcEB742281388BDb5C7bc3da6D43ae1d7743f621

➡️  AI-PM Analysis Starting...

🤖 AI-PM ANALYSIS IN PROGRESS...
✨ AI Analysis Complete!
📊 Analysis Results:
- Contract Compliance: 95%
- Work Quality: 87%
- Timeline Adherence: 92%
🎯 Recommended Verdict: FREELANCER_WIN
🔐 Confidence Score: 89%

📊 Stats Update:
  ProjectEscrow: 2 events captured, last block 28288410
  AIOracle: 0 events captured, last block 28288410
  DisputeJury: 0 events captured, last block 28288410
```

✅ **Status**: Events captured successfully!

---

## Troubleshooting

### Issue: Backend shows "⏳ Waiting for events..." but nothing appears after test

**Possible Causes:**

1. **Test running too fast**: Events may miss the polling window
   - Solution: Wait 10 seconds after test completes before checking

2. **Event ABI mismatch**: Contract events don't match expected signatures
   - Check contract ABIs in `backend/src/listener.ts`
   - Verify contract source code

3. **RPC lagging**: Blocks taking time to be indexed
   - Solution: Retry test, wait longer between steps

**Debug Steps:**

```bash
# Terminal 1: Check for detailed logs
npm start  # Already running with debug output

# Terminal 2: Manually check for recent events
source .env.local
cast logs --address 0x9966f1CE354B662c7EFb8dB01b97f0e9f99bF1Ba \
  --rpc-url https://testnet.hashio.io/api \
  --from-block 28288300
```

### Issue: "Error fetching logs" messages

**Cause**: RPC connection issues

**Solution:**
```bash
# Verify RPC is working
curl https://testnet.hashio.io/api \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Backend shows "All listeners active"
- [ ] Test script completes all 5 steps
- [ ] Backend captures ProjectEscrow events
- [ ] AI-PM analysis completes
- [ ] Stats update every 30 seconds
- [ ] No uncaught exceptions in backend

---

## What Gets Tested

| Step | Test | Expected Result |
|------|------|-----------------|
| 1 | User Registration | User registered on-chain |
| 2 | USDC Minting | 1000 USDC minted to account |
| 3 | Escrow Approval | ProjectEscrow approved to spend USDC |
| 4 | Project Creation | Project ID #1 created with 1 milestone |
| 5 | Dispute Creation | Dispute raised, backend captures event |

---

## Next Steps

- ✅ Test completed successfully
- Use contract addresses for integration
- Integrate with frontend
- Deploy to mainnet

---

## Support

For issues, check:
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [README.md](./README.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
