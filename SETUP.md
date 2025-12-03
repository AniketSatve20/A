# Setup Guide

## Step 1: Install Dependencies

### macOS
```bash
brew install foundry
brew install solhint
```

### Linux
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
sudo apt-get install solhint
```

### Windows
Download from https://github.com/foundry-rs/foundry/releases

## Step 2: Clone Repository

```bash
git clone <your-repo>
cd HumanWorkProtocol
```

## Step 3: Install Forge Dependencies

```bash
make install
```

This installs:
- `foundry-rs/forge-std`
- `OpenZeppelin/openzeppelin-contracts@v5.0.0`

## Step 4: Create Local Environment File

```bash
cp .env .env.local
```

## Step 5: Add Your Credentials

Edit `.env.local`:

```dotenv
# Your Hedera Testnet Private Key (from your wallet)
PRIVATE_KEY=0x...your_64_char_hex_key

# Your backend AI worker address (already configured)
ORACLE_ADDRESS=0xdceb742281388bdb5c7bc3da6d43ae1d7743f621

# Network RPC (default is correct)
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
```

## Step 6: Get Hedera Testnet Funds

1. Go to https://testnet.hedera.com/
2. Create/import account
3. Request testnet HBAR (free)
4. Note your private key (ECDSA format)

## Step 7: Verify Installation

```bash
forge --version
cast --version
```

Expected output:
```
forge 0.2.0
cast 0.2.0
```

## Step 8: Build Contracts

```bash
make build
```

## Step 9: Run Tests

```bash
make test
```

## Step 10: Deploy (Optional - See DEPLOYMENT.md)

```bash
make deploy-testnet
```

## Troubleshooting

### Error: "Command not found: forge"
- Ensure Foundry is installed
- Try running: `foundryup`

### Error: "Private key not found"
- Check `.env.local` exists
- Verify `PRIVATE_KEY` is set correctly (0x prefix required)

### Error: "Cannot connect to RPC"
- Verify internet connection
- Check RPC URL in `.env`
- Visit https://testnet.hashio.io/api to verify

### Error: "Insufficient funds"
- Request more HBAR from testnet faucet
- Check balance: https://testnet.hashscan.io/

## Next Steps

1. Deploy contracts: See [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Run system test: `./test_system.sh`
3. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
