# Deployment Guide

## Overview

This guide walks you through deploying the Human Work Protocol contracts to Hedera Testnet.

## Prerequisites

- ✅ Setup complete (see [SETUP.md](./SETUP.md))
- ✅ `.env.local` configured with private key
- ✅ Hedera testnet HBAR balance (> 50 HBAR recommended for all operations)
- ✅ Contracts built: `make build`

## Deployment Steps

### Step 1: Verify Configuration

```bash
# Check .env.local has correct values
cat .env.local | grep PRIVATE_KEY
cat .env.local | grep ORACLE_ADDRESS
```

Expected:
```
PRIVATE_KEY=0x...
ORACLE_ADDRESS=0xdceb742281388bdb5c7bc3da6d43ae1d7743f621
```

### Step 2: Check HBAR Balance

```bash
# Load environment
source .env.local

# Check balance
cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url https://testnet.hashio.io/api
```

Should be > 50 HBAR. If not:
- Visit https://testnet.hedera.com/
- Request more HBAR

### Step 3: Run Deployment Script

```bash
make deploy-testnet
```

This deploys:
1. MockUSDC stablecoin
2. UserRegistry contract
3. ProjectEscrow contract
4. AIOracle contract
5. DisputeJury contract
6. Sets up permissions & authorizations

### Step 4: Capture Deployment Output

The script outputs contract addresses in the logs. **Save these!** Look for:

```
Deploying Mocks...
    + MockUSDC deployed to: 0x...
    + MockVerifier deployed to: 0x...

Deploying Core Modules...
    + GasSponsor deployed to: 0x...
    + InsurancePool deployed to: 0x...

Deploying Identity & AI Layer (L1)...
    + UserRegistry deployed to: 0x...
    + AgencyRegistry deployed to: 0x...
    + AIOracle deployed to: 0x...
    + SkillTrial deployed to: 0x...

Deploying Commerce & Dispute Layer (L2)...
    + DisputeJury deployed to: 0x...
    + EnterpriseAccess deployed to: 0x...
    + ProjectEscrow deployed to: 0x...
```

### Step 5: Update Contract Addresses

Edit `.env.local` with the deployed addresses:

```dotenv
STABLECOIN_ADDRESS=0x...
USER_REGISTRY_ADDRESS=0x...
PROJECT_ESCROW_ADDRESS=0x...
AI_ORACLE_CONTRACT_ADDRESS=0x...
DISPUTE_JURY_CONTRACT_ADDRESS=0x...
```

Also update root `.env`:

```dotenv
STABLECOIN_ADDRESS=0x...
AI_ORACLE_CONTRACT_ADDRESS=0x...
DISPUTE_JURY_CONTRACT_ADDRESS=0x...
```

### Step 6: Verify Deployment

```bash
# Load environment
source .env.local

# Check contract exists
cast code $STABLECOIN_ADDRESS --rpc-url https://testnet.hashio.io/api

# Should output non-empty bytecode (0x...)
```

### Step 7: Run System Test

```bash
chmod +x test_system.sh
./test_system.sh
```

## Deployment Troubleshooting

### Partial Deployment Failures

If you see "Transaction Failure" errors but some contracts deployed:

**This is normal!** Some calls (like permissions) may fail due to:
- Network congestion
- Account nonce issues
- RPC timeouts

**Solution:**

1. **Extract successful deployments** from the logs
2. **Save the broadcast JSON** for reference:
   ```bash
   cat broadcast/Deploy.s.sol/296/run-latest.json
   ```

3. **Manual permission fixes** (if needed):
   ```bash
   # Example: Transfer AIOracle ownership
   source .env.local
   cast send $AI_ORACLE_CONTRACT_ADDRESS \
     "transferOwnership(address)" \
     $ORACLE_ADDRESS \
     --rpc-url https://testnet.hashio.io/api \
     --private-key $PRIVATE_KEY
   ```

### Error: "Insufficient funds"

```bash
source .env.local
# Check your balance
cast balance $(cast wallet address --private-key $PRIVATE_KEY) \
  --rpc-url https://testnet.hashio.io/api

# Get more HBAR: https://testnet.hedera.com/
```

### Error: "Private key not found"

```bash
# Verify .env.local
cat .env.local | grep PRIVATE_KEY

# Should be 0x followed by 64 hex characters
```

### Error: "Script not found"

Ensure `script/Deploy.s.sol` exists:
```bash
ls -la script/Deploy.s.sol
```

### Error: "nonce too low"

This means you've already sent transactions. Try:

```bash
make clean
make build
make deploy-testnet
```

Or wait a few blocks for nonce to reset.

## Post-Deployment

### 1. Verify on Block Explorer

Visit https://testnet.hashscan.io/ and search for contract addresses

### 2. Save Deployment Info

Create `DEPLOYMENT_LOG.md`:

```markdown
# Deployment: [Date]

## Contracts Deployed

- MockUSDC: 0x...
- UserRegistry: 0x...
- ProjectEscrow: 0x...
- AIOracle: 0x...
- DisputeJury: 0x...

## Network
- Chain ID: 296 (Hedera Testnet)
- RPC: https://testnet.hashio.io/api

## Deployer
- Address: 0x...
- Private Key: [Saved in .env.local]
```

### 3. Update Backend Configuration

Create `backend/.env.local`:

```dotenv
ORACLE_PRIVATE_KEY=your_oracle_private_key
AI_ORACLE_CONTRACT_ADDRESS=0x...
DISPUTE_JURY_CONTRACT_ADDRESS=0x...
```

### 4. Start Backend Service

```bash
cd backend
npm install
npm start
```

### 5. Run System Test

```bash
chmod +x test_system.sh
./test_system.sh
```

## Redeployment

To redeploy all contracts:

```bash
make clean
make build
make deploy-testnet
```

⚠️ **Warning**: Old contract addresses become invalid!

## Production Deployment (Mainnet)

When ready for production:

1. **Use Hedera Mainnet RPC**:
   ```bash
   HEDERA_RPC_URL=https://mainnet-public.hashio.io/api
   ```

2. **Use real private keys** (stored securely in vault)

3. **Test extensively on testnet** first

4. **Update all configuration files**

5. **Monitor deployment carefully**

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Transaction timeout | Wait 30 seconds, retry `make deploy-testnet` |
| Insufficient funds | Request more HBAR from faucet |
| Nonce conflicts | Run `make clean && make deploy-testnet` |
| RPC unreachable | Check network, verify RPC URL |
| Contract not found | Verify deployment completed, check address |

## Next Steps

1. ✅ Deployment complete: Verify in [Block Explorer](https://testnet.hashscan.io/)
2. ✅ Update contract addresses: Edit `.env.local` and `.env`
3. ✅ Run system test: `./test_system.sh`
4. ✅ Start backend service: `cd backend && npm start`

## Support

- [Hedera Docs](https://docs.hedera.com/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Cast Reference](https://book.getfoundry.sh/cast/)
