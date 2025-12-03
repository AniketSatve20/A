# 🚀 Quick Start Guide

Get the HumanWork Protocol up and running in 5 minutes!

---

## Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js
node --version  # Should be 16+

# Check Foundry
forge --version

# Check you have .env.local
ls -la .env.local  # Should exist

# Check backend dependencies
cd backend && npm list ethers dotenv
cd ..
```

---

## Step 1: Start Backend (Terminal 1)

```bash
cd backend
npm start
```

**Expected Output:**
```
✅ Connected to RPC successfully
🔗 AI Worker (Full Startup Mode) Starting...
📡 Monitoring ProjectEscrow at 0x9966f1CE354B662c7EFb8dB01b97f0e9f99bF1Ba...
✅ All listeners active and monitoring blockchain...
⏳ Waiting for events...

📊 Stats Update:
  ProjectEscrow: 0 events captured, last block XXXXX
```

✅ **Status**: Backend is listening for events and polling blockchain every 1 second.

---

## Step 2: Run System Test (Terminal 2)

```bash
./test_system.sh
```

**Expected Output:**
```
🚀 Starting Full System Test...
✅ Contracts verified

1️⃣  Registering User... ✅ User registered successfully
2️⃣  Minting Mock USDC... ✅ Success
3️⃣  Approving Escrow... ✅ Success
4️⃣  Creating Project... ✅ Success
5️⃣  Raising Dispute... ✅ Success

✅ Test Sequence Complete!
Check your Backend Terminal for AI-PM Logs!
```

---

## Step 3: Watch Backend Terminal (Terminal 1)

After test completes (5-30 seconds), you should see:

```
📊 [ProjectEscrow] Found X logs in blocks 28288722-28288760
✅ [ProjectEscrow] Successfully parsed X events

============================================================
✨ Event from ProjectEscrow: DisputeCreated
============================================================
📦 Event Data: [1, 0, 0xdcEB742281388BDb5C7bc3da6D43ae1d7743f621]
🔗 Transaction: 0x47ee2c0d8b4928b9d3ff6190b92348061f9e5f98403da32cdfe9e6a17d0ffba8
📍 Block: 28288636

🎯 Processing ProjectEscrow.DisputeCreated

🚨 DISPUTE CREATED!
Project ID: 1
Milestone ID: 0
Initiator: 0xdcEB742281388BDb5C7bc3da6D43ae1d7743f621

➡️  AI-PM Analysis Starting...

🤖 AI-PM ANALYSIS IN PROGRESS...

Step 1: Analyze dispute context
Step 2: Review milestone requirements
Step 3: Evaluate freelancer performance
Step 4: Generate AI verdict
Step 5: Submit to blockchain

⏳ Processing...

✨ AI Analysis Complete!

📊 Analysis Results:
- Contract Compliance: 95%
- Work Quality: 87%
- Timeline Adherence: 92%

🎯 Recommended Verdict: FREELANCER_WIN
🔐 Confidence Score: 89%
```

✅ **Success**: Backend captured events and ran AI analysis!

---

## Troubleshooting

### Backend shows "⏳ Waiting for events..." but test ran

**This is normal!** The backend polls every 1 second. If you see stats updating but 0 events:

1. **Wait 30 seconds** - Stats update every 30 seconds
2. **Check block numbers** - Are they increasing? (confirms polling works)
3. **Run test again** - Backend should catch events this time

### Test fails with "Contracts not found"

```bash
# Verify contract addresses in .env.local
cat .env.local | grep ADDRESS

# Check they exist on-chain
source .env.local
cast code $STABLECOIN_ADDRESS --rpc-url $HEDERA_TESTNET_RPC
# Should return long bytecode, not 0x
```

### Backend won't start

```bash
# Check Node.js version
node --version  # Need 16+

# Reinstall dependencies
cd backend
rm -rf node_modules
npm install
npm start
```

### RPC connection errors

```bash
# Test RPC is working
curl https://testnet.hashio.io/api \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Should return a block number, not error
```

---

## What Each Terminal Shows

### Terminal 1 (Backend)
- ✅ Connected to RPC
- ✅ Monitoring contracts
- ✅ Stats every 30 seconds
- 📊 Event logs when detected
- 🤖 AI analysis results

### Terminal 2 (Test)
- 🚀 Test progress (1-5)
- ✅ Transaction confirmations
- 📋 Full transaction details
- ✅ Test complete message

---

## Expected Timeline

| Time | What Happens | Terminal |
|------|--------------|----------|
| 0s | Start backend | 1: "Waiting for events..." |
| 5s | Run test | 2: "Starting Full System Test" |
| 15s | Transactions settle | 2: All 5 steps complete |
| 20s | Backend detects events | 1: "Found X logs in blocks..." |
| 25s | AI analysis runs | 1: "AI Analysis Complete!" |
| 30s | Stats update | 1: "Events captured: X" |

---

## Files You Need

| File | Purpose | Status |
|------|---------|--------|
| `.env.local` | Your secrets | ✅ Must exist |
| `.env` | Config template | ✅ In repo |
| `backend/.env` | Backend config | ✅ In repo |
| `test_system.sh` | Integration test | ✅ In repo |
| `makefile` | Build commands | ✅ In repo |

---

## Common Commands

```bash
# Start backend
cd backend && npm start

# Run full system test
./test_system.sh

# Check backend logs
npm start  # Already running

# Deploy contracts (if needed)
make deploy-testnet

# Build contracts
make build

# Run contract tests
make test
```

---

## Success Criteria

After running the test, you should see:

- ✅ Backend connected and monitoring
- ✅ Test completes all 5 steps
- ✅ Backend detects DisputeCreated event
- ✅ AI analysis runs with results
- ✅ Stats show event count increasing

If all these are true: **System is working!** 🎉

---

## Next Steps

### Want to understand the system?
→ Read [ARCHITECTURE.md](./ARCHITECTURE.md)

### Want to deploy again?
→ Read [DEPLOYMENT.md](./DEPLOYMENT.md)

### Want to run more tests?
→ Read [TESTING.md](./TESTING.md)

### Want full setup details?
→ Read [SETUP.md](./SETUP.md)

---

## Support

If something doesn't work:

1. **Check logs** - Backend prints detailed error messages
2. **Verify config** - Check `.env.local` has correct values
3. **Test RPC** - Verify Hedera testnet is accessible
4. **Try again** - Network sometimes needs a moment

For detailed troubleshooting, see [DEPLOYMENT_RECOVERY.md](./DEPLOYMENT_RECOVERY.md)

---

**Ready?** Open two terminals and follow Step 1-3 above! 🚀
