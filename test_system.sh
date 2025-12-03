#!/bin/bash

set -e  # Exit on error

# Load environment variables
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found!"
  exit 1
fi

source .env.local

# --- CONFIGURATION ---
# Extract from deployment logs or .env.local
STABLECOIN_ADDRESS="${STABLECOIN_ADDRESS:-0x5859367F70f01CfaaaFCA81B0989dBF40f3B4fF4}"
USER_REGISTRY_ADDRESS="${USER_REGISTRY_ADDRESS:-0x407F513f37881a9b12667B63BA36F6f3052eEc88}"
PROJECT_ESCROW_ADDRESS="${PROJECT_ESCROW_ADDRESS:-0x9966f1CE354B662c7EFb8dB01b97f0e9f99bF1Ba}"

SENDER=$ORACLE_ADDRESS
AMOUNT_WEI=1000000000  # 1000 USDC (9 decimals for test)
PROJECT_ID=1
MILESTONE_ID=0
FREELANCER="0x9aaa47E69eB507a4510bbC7Ba745A5BBeA6c718c"

echo "🚀 Starting Full System Test..."
echo "Using Sender: $SENDER"
echo "RPC URL: $HEDERA_TESTNET_RPC"
echo ""
echo "Contract Addresses:"
echo "  Stablecoin: $STABLECOIN_ADDRESS"
echo "  UserRegistry: $USER_REGISTRY_ADDRESS"
echo "  ProjectEscrow: $PROJECT_ESCROW_ADDRESS"
echo ""

# Verify contracts exist
echo "Verifying contracts..."
if [ "$(cast code $STABLECOIN_ADDRESS --rpc-url $HEDERA_TESTNET_RPC)" = "0x" ]; then
  echo "❌ Error: Stablecoin not found at $STABLECOIN_ADDRESS"
  exit 1
fi
echo "✅ Contracts verified"
echo ""

# 1. REGISTER USER
echo "1️⃣  Registering User..."
if cast send $USER_REGISTRY_ADDRESS "registerBasic()" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY 2>/dev/null; then
  echo "✅ User registered successfully"
else
  echo "⚠️  User likely already registered. Continuing..."
fi

# 2. MINT USDC (To pay for project)
echo -e "\n2️⃣  Minting Mock USDC..."
cast send $STABLECOIN_ADDRESS "mint(address,uint256)" "$SENDER" "$AMOUNT_WEI" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

# 3. APPROVE ESCROW (To spend USDC)
echo -e "\n3️⃣  Approving Escrow Contract to spend USDC..."
cast send $STABLECOIN_ADDRESS "approve(address,uint256)" "$PROJECT_ESCROW_ADDRESS" "$AMOUNT_WEI" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

# 4. CREATE PROJECT
echo -e "\n4️⃣  Creating Project..."
cast send $PROJECT_ESCROW_ADDRESS "createProject(address,uint256[],string[])" \
  "$FREELANCER" \
  "[1000000]" \
  "['Milestone 1: Complete Setup']" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

# 5. RAISE DISPUTE
echo -e "\n5️⃣  Raising Dispute on Project..."
cast send $PROJECT_ESCROW_ADDRESS "createDispute(uint256,uint256)" "$PROJECT_ID" "$MILESTONE_ID" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

echo -e "\n✅ Test Sequence Complete!"
echo "Check your Backend Terminal for AI-PM Logs!"