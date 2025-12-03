# Getting Started with Human Work Protocol

## Quick Status ✅

**Deployment**: Complete
**Network**: Hedera Testnet
**Status**: All systems operational

## Current Deployment

See [DEPLOYMENT_LOG.md](./DEPLOYMENT_LOG.md) for contract addresses.

## Quick Start

### 1. Setup Environment

```bash
cp .env .env.local
# Edit .env.local with your private key (already configured)
```

### 2. Test System

```bash
./test_system.sh
```

Expected output: All 5 steps pass ✅

### 3. Start Backend Service

```bash
cd backend
npm install
npm start
```

Watch for "AI-PM" logs when disputes are created.

### 4. Monitor on Block Explorer

https://testnet.hashscan.io/

## What Works Now

- ✅ User registration
- ✅ USDC stablecoin transfers
- ✅ Project creation with escrow
- ✅ Dispute raising
- ✅ Automated AI analysis (backend service)

## Common Tasks

### Run Tests
```bash
make test
```

### Deploy Again (if needed)
```bash
make deploy-testnet
```

### View Contract Events
```bash
source .env.local
cast logs --address $PROJECT_ESCROW_ADDRESS --rpc-url $HEDERA_TESTNET_RPC
```

### Check Balance
```bash
source .env.local
cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url $HEDERA_TESTNET_RPC
```

## Architecture

- **Smart Contracts**: Solidity (Foundry)
- **Network**: Hedera Testnet
- **Backend**: Node.js + AI-PM service
- **Storage**: On-chain (no external DB needed)

## Next Steps

1. Deploy backend AI-PM service
2. Test dispute resolution
3. Monitor gas costs
4. Plan mainnet migration

See [README.md](./README.md) for full documentation.
