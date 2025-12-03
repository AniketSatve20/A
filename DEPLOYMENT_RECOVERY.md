# Deployment Recovery Guide

If your deployment had transaction failures but some contracts deployed, use this guide to recover.

## Step 1: Extract Successful Deployments

```bash
# Find the broadcast log
cat broadcast/Deploy.s.sol/296/run-latest.json | jq .

# Look for successful transactions (status: 1)
```

## Step 2: Create Deployment Summary

From the logs you provided, here are the **successful** deployments:

```
✅ MockUSDC: 0x5859367F70f01CfaaaFCA81B0989dBF40f3B4fF4
✅ MockVerifier: 0x5339a844ECCd883F6401E4Ad579d1B99af668ff1

Check logs for other successful deploys:
- GasSponsor
- InsurancePool
- UserRegistry
- AgencyRegistry
- AIOracle
- SkillTrial
- DisputeJury
- EnterpriseAccess
- ProjectEscrow
```

## Step 3: Update .env.local

```bash
# Edit .env.local with successful addresses
nano .env.local

# Add these from logs:
STABLECOIN_ADDRESS=0x5859367F70f01CfaaaFCA81B0989dBF40f3B4fF4
MOCK_VERIFIER_ADDRESS=0x5339a844ECCd883F6401E4Ad579d1B99af668ff1
# Add others from deployment logs
```

## Step 4: Manual Permission Setup (if needed)

If permission calls failed, fix them manually:

```bash
source .env.local

# Transfer AIOracle ownership
cast send $AI_ORACLE_CONTRACT_ADDRESS \
  "transferOwnership(address)" \
  $ORACLE_ADDRESS \
  --rpc-url https://testnet.hashio.io/api \
  --private-key $PRIVATE_KEY

# Set SkillTrial in AIOracle
cast send $AI_ORACLE_CONTRACT_ADDRESS \
  "setSkillTrialAddress(address)" \
  $SKILL_TRIAL_ADDRESS \
  --rpc-url https://testnet.hashio.io/api \
  --private-key $PRIVATE_KEY
```

## Step 5: Verify All Contracts

```bash
source .env.local

# Check each deployed contract
echo "Checking MockUSDC..."
cast code $STABLECOIN_ADDRESS --rpc-url https://testnet.hashio.io/api

echo "Checking AIOracle..."
cast code $AI_ORACLE_CONTRACT_ADDRESS --rpc-url https://testnet.hashio.io/api

# If output is 0x, contract doesn't exist
# If output is long bytecode, contract exists ✅
```

## Step 6: Test System

```bash
chmod +x test_system.sh
./test_system.sh
```

## Step 7: If Tests Fail

Check the error, then try:

```bash
# Option 1: Retry with fresh nonce
make clean
make deploy-testnet

# Option 2: Manual contract interaction
source .env.local
cast call $STABLECOIN_ADDRESS "balanceOf(address)" $ORACLE_ADDRESS \
  --rpc-url https://testnet.hashio.io/api
```

## Troubleshooting Failed Transactions

### Check Transaction Status

```bash
source .env.local

# Replace with hash from error
HASH="0x6ca51b602916c2e06e2f2458eceba6ed933ec0249d8ff18e5d3fb0de9744555b"

cast receipt $HASH --rpc-url https://testnet.hashio.io/api
```

### Reasons for Failures

- **Status 0**: Transaction reverted (check contract logic)
- **Status 1 but logs show error**: RPC returned old state
- **No status**: Transaction still pending (wait 1 min)

### Recovery Steps

1. **Wait 5 minutes** for network to settle
2. **Check gas price**:
   ```bash
   cast gas-price --rpc-url https://testnet.hashio.io/api
   ```
3. **Retry with explicit gas**:
   ```bash
   cast send $CONTRACT "function()" \
     --rpc-url https://testnet.hashio.io/api \
     --private-key $PRIVATE_KEY \
     --gas-price 640000000001
   ```

## When to Redeploy

Redeploy completely if:
- ❌ Core contracts didn't deploy (MockUSDC, UserRegistry, AIOracle)
- ❌ Multiple contracts showing as 0x
- ❌ Permission matrix completely broken

```bash
make clean
make build
make deploy-testnet
```

## Need Help?

1. Check `broadcast/Deploy.s.sol/296/run-latest.json` for full details
2. Search transaction hash on https://testnet.hashscan.io/
3. Review error messages for specific revert reasons
4. Consult [Hedera Docs](https://docs.hedera.com/)
