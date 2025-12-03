# Human Work Protocol - Freelancing Platform

A decentralized freelancing platform built on Hedera with AI-powered dispute resolution and smart contract escrow.

## 🎯 Features

- **Smart Contract Escrow**: Secure milestone-based payments
- **AI-Powered Dispute Resolution**: Automated conflict resolution with AI-PM
- **User Registry**: Track freelancers and clients
- **Mock Stablecoin**: Test payments with MockUSDC
- **Jury System**: Dispute resolution with jury voting

## 📋 Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Cast](https://book.getfoundry.sh/cast/) (comes with Foundry)
- Hedera Testnet account with balance
- Node.js 16+ (for backend)

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone <your-repo>
cd HumanWorkProtocol
cp .env.local.example .env.local  # Create local config
make install
make build
```

### 2. Configure Environment

Edit `.env.local` with your credentials:
```bash
PRIVATE_KEY=your_hedera_private_key
ORACLE_ADDRESS=0x...your_oracle_address
```

### 3. Deploy Contracts

```bash
make deploy-testnet
```

After deployment, update contract addresses in `.env.local`:
```
AI_ORACLE_CONTRACT_ADDRESS=0x...
STABLECOIN_ADDRESS=0x...
```

### 4. Run System Test

```bash
chmod +x test_system.sh
./test_system.sh
```

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Detailed setup instructions
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

## 🧪 Testing

```bash
make test          # Run all tests
make gas-report    # Generate gas usage report
make fmt           # Format code
make lint          # Lint Solidity
```

## 📁 Project Structure

```
HumanWorkProtocol/
├── contracts/          # Solidity smart contracts
├── script/            # Deployment scripts
├── test/              # Test files
├── backend/           # Backend AI service
├── makefile           # Build commands
├── .env              # Environment template (commit)
├── .env.local        # Local secrets (DO NOT commit)
└── test_system.sh    # System integration test
```

## 🔑 Security

- ⚠️ **Never commit `.env.local`** - contains private keys
- Use environment variables in production
- Keep Hedera private keys safe
- Validate all inputs in smart contracts

## 🔗 Network Info

- **Network**: Hedera Testnet
- **RPC Endpoint**: https://testnet.hashio.io/api
- **Explorer**: https://testnet.hashscan.io/

## 📝 License

MIT

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run `make fmt && make lint && make test`
4. Submit pull request

## 📞 Support

For issues, check:
- [Hedera Docs](https://docs.hedera.com/)
- [Foundry Book](https://book.getfoundry.sh/)
- Project issues page