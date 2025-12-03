# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (UI)                        │
│              (React/Vue/Next.js)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                Backend API Service                      │
│            (Node.js / Python)                          │
│  - User authentication                                 │
│  - AI-PM (Dispute resolution)                          │
│  - Notification system                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────────┐  ┌────▼──────────────┐
│  Smart Contracts   │  │  Hedera Network   │
│  (Solidity)        │  │  (Testnet)        │
└────────────────────┘  └───────────────────┘
```

## Smart Contracts

### 1. MockUSDC (ERC-20)
**Purpose**: Test stablecoin for payments

**Key Functions**:
- `mint(address to, uint256 amount)` - Create test tokens
- `transfer()` - Standard ERC-20 transfer
- `approve()` / `transferFrom()` - Allowance-based transfers

**Used By**:
- Clients paying for projects
- Escrow contract holding funds

---

### 2. UserRegistry
**Purpose**: Track users (clients, freelancers, arbiters)

**Key Functions**:
- `registerBasic()` - Register as client/freelancer
- `registerArbitrator()` - Register as dispute jury member
- `getUser(address)` - Retrieve user info
- `updateProfile()` - Modify user details

**Data Structure**:
```solidity
struct User {
    address wallet;
    string username;
    uint8 role;           // 1=Client, 2=Freelancer, 3=Arbitrator
    uint256 reputationScore;
    bool active;
}
```

---

### 3. ProjectEscrow
**Purpose**: Hold funds and manage project lifecycle

**Key Functions**:
- `createProject()` - Client creates project with milestones
- `submitMilestone()` - Freelancer submits work
- `releaseFunds()` - Client approves milestone
- `createDispute()` - Raise dispute on milestone
- `refundProject()` - Return funds if project fails

**Workflow**:
```
1. Client deposits funds (locked in escrow)
2. Freelancer completes milestone
3. Either: Client approves → Funds released
          OR: Dispute raised → Goes to jury
4. Jury votes on resolution
5. Funds distributed based on verdict
```

**Data Structure**:
```solidity
struct Milestone {
    uint256 amount;
    string description;
    uint8 status;        // 1=Pending, 2=Submitted, 3=Approved, 4=Disputed
    uint256 dueDate;
}

struct Project {
    address client;
    address freelancer;
    uint256 totalAmount;
    Milestone[] milestones;
    uint8 status;        // 1=Active, 2=Completed, 3=Cancelled
}
```

---

### 4. AIOracle
**Purpose**: AI-powered dispute resolution (Off-chain computation)

**Key Functions**:
- `requestJudgment(disputeId, evidence)` - Submit evidence to AI
- `fulfillJudgment(disputeId, verdict)` - Receive AI verdict
- `getJudgment(disputeId)` - Retrieve verdict

**Process**:
```
1. Dispute raised on-chain
2. Backend listens for event
3. Backend runs AI-PM analysis
4. Backend calls fulfillJudgment() with verdict
5. Contract stores verdict on-chain
```

**AI Analysis Includes**:
- Contract terms matching
- Timeline verification
- Work quality assessment
- Communication history analysis

---

### 5. DisputeJury
**Purpose**: Community-based final verdict

**Key Functions**:
- `submitVote(disputeId, verdict)` - Juror votes
- `finalizeDispute(disputeId)` - Tally votes
- `getVerdictStats(disputeId)` - See voting results

**Voting Process**:
```
1. Jury members vote (weighted by reputation)
2. Need 66% consensus for verdict
3. Losing party stakes lose reputation
4. Winners gain reputation
```

---

## Data Flow Diagram

### Happy Path (No Dispute)
```
Client                Escrow              Freelancer
  │                     │                      │
  ├─ Deposit funds ────→ │                      │
  │                     │                      │
  │                     │ ← Submit milestone ──┤
  │                     │                      │
  ├─ Approve work ─────→ │                      │
  │                     ├─ Release funds ─────→│
```

### Dispute Path
```
Freelancer           Escrow              AIOracle            DisputeJury
  │                   │                      │                    │
  ├─ Submit work ────→│                      │                    │
  │                   │                      │                    │
  │                   │ ←─── Dispute ────────│                    │
  │                   │                      │                    │
  │                   ├─ Request judgment ─→ │                    │
  │                   │                      │                    │
  │                   │ ←─ Return verdict ──┤│                    │
  │                   │                      │ ├─ Jury votes ────→│
  │                   │                      │ ←─ Tally votes ────│
  │ ← Release funds ──┤                      │                    │
```

## Backend Service

### Responsibilities

1. **Event Listener**
   - Watches for `DisputeCreated` events
   - Triggers AI analysis

2. **AI-PM (Project Manager)**
   - Analyzes dispute evidence
   - Reviews contract terms
   - Generates verdict recommendation
   - Stores reasoning on IPFS (optional)

3. **Blockchain Interaction**
   - Calls `AIOracle.fulfillJudgment()`
   - Updates jury system
   - Logs all actions

4. **API Server**
   - REST endpoints for frontend
   - User authentication
   - Project queries
   - Dispute status

### Environment Variables

```bash
# Hedera Network
HEDERA_RPC_URL=https://testnet.hashio.io/api
ORACLE_PRIVATE_KEY=0x...

# Contract Addresses
AI_ORACLE_CONTRACT_ADDRESS=0x...
DISPUTE_JURY_CONTRACT_ADDRESS=0x...

# Optional
IPFS_GATEWAY=https://gateway.pinata.cloud
LOG_LEVEL=debug
```

## Security Considerations

### Smart Contracts

1. **Reentrancy Protection**
   - Checks-Effects-Interactions pattern
   - OpenZeppelin ReentrancyGuard

2. **Access Control**
   - Only escrow can release funds
   - Only oracle can submit judgments
   - Role-based permissions

3. **Fund Safety**
   - Funds locked until dispute resolved
   - No infinite loops
   - Proper overflow/underflow protection

### Backend

1. **Private Key Management**
   - Never log private keys
   - Store in secure vault (e.g., AWS Secrets Manager)
   - Rotate regularly

2. **AI Analysis**
   - Cannot be manipulated by single party
   - Cross-checked by jury system
   - Reasoning transparent

3. **Signature Verification**
   - All blockchain calls signed
   - Nonce management for ordering
   - Timestamp verification

## Scalability

### Current Limitations

- All transactions on-chain
- Gas fees for each milestone
- Jury voting requires multiple transactions

### Future Improvements

- Layer 2 scaling (Hedera State Channels)
- Batch processing (Multiple disputes per tx)
- Optimized jury selection
- Reputation-based jury incentives

## Testing Strategy

### Unit Tests (Solidity)
```bash
make test  # Run all tests
```

### Integration Tests
```bash
./test_system.sh  # Full workflow
```

### Load Testing
```bash
# Test with multiple concurrent disputes
npm run test:load
```

## Monitoring & Observability

### Key Metrics

- Gas usage per operation
- Dispute resolution time
- AI accuracy rate
- Jury participation rate
- Network latency

### Logging

```
[2024-01-15 10:30:45] INFO: Dispute #42 created
[2024-01-15 10:30:46] INFO: AI analysis starting...
[2024-01-15 10:31:02] INFO: AI verdict: FREELANCER (confidence: 0.92)
[2024-01-15 10:31:15] INFO: Jury voting started
[2024-01-15 10:35:42] INFO: Dispute resolved: FREELANCER (66% votes)
```

## References

- [Solidity Docs](https://docs.soliditylang.org/)
- [Hedera Docs](https://docs.hedera.com/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Foundry Book](https://book.getfoundry.sh/)
