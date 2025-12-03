import { ethers } from 'ethers';
import dotenv from 'dotenv';
import {
  initializeDatabase,
  insertDispute,
  insertAIAnalysis,
  getOrCreateUser,
  insertProject,
} from './database';
import { analyzeDispute } from './ai-engine';
import { updateReputationOnDisputeResolution } from './reputation';
import { logger } from './logger';
import { startAPI } from './api';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const RPC_URL = process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api';
const RPC_TIMEOUT = parseInt(process.env.RPC_TIMEOUT || '30000');
const RPC_MAX_RETRIES = parseInt(process.env.RPC_MAX_RETRIES || '3');
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AI_ORACLE_ADDRESS = process.env.AI_ORACLE_CONTRACT_ADDRESS;
const DISPUTE_JURY_ADDRESS = process.env.DISPUTE_JURY_CONTRACT_ADDRESS;
const PROJECT_ESCROW_ADDRESS = process.env.PROJECT_ESCROW_ADDRESS;
const POLL_INTERVAL = 1000;

// Validate private key format
if (!ORACLE_PRIVATE_KEY) {
  console.error('❌ Error: ORACLE_PRIVATE_KEY not set in environment');
  process.exit(1);
}

const cleanPrivateKey = ORACLE_PRIVATE_KEY
  .replace(/['"]/g, '')
  .replace(/^0x/, '');
const formattedPrivateKey = '0x' + cleanPrivateKey;

if (!/^0x[0-9a-fA-F]{64}$/.test(formattedPrivateKey)) {
  console.error('❌ Error: Invalid private key format');
  process.exit(1);
}

// ABI for ProjectEscrow events
const PROJECT_ESCROW_ABI = [
  'event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer)',
  'event MilestoneSubmitted(uint256 indexed projectId, uint256 indexed milestoneId)',
  'event DisputeCreated(uint256 indexed projectId, uint256 indexed milestoneId, address indexed initiator)',
  'event DisputeResolved(uint256 indexed projectId, uint256 indexed milestoneId, uint8 verdict)',
];

// ABI for AIOracle events
const AI_ORACLE_ABI = [
  'event JudgmentRequested(uint256 indexed disputeId, string evidence)',
  'event JudgmentFulfilled(uint256 indexed disputeId, uint8 verdict, string reasoning)',
];

// ABI for DisputeJury events
const DISPUTE_JURY_ABI = [
  'event VoteCasted(uint256 indexed disputeId, address indexed juror, uint8 verdict)',
  'event DisputeFinalized(uint256 indexed disputeId, uint8 finalVerdict)',
];

interface ListenerConfig {
  name: string;
  address: string;
  abi: string[];
  lastBlock: number;
  processedTxs: Set<string>;
  errorCount: number;
  eventCount: number;
}

const listeners: ListenerConfig[] = [
  {
    name: 'ProjectEscrow',
    address: PROJECT_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000',
    abi: PROJECT_ESCROW_ABI,
    lastBlock: 0,
    processedTxs: new Set(),
    errorCount: 0,
    eventCount: 0,
  },
  {
    name: 'AIOracle',
    address: AI_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000',
    abi: AI_ORACLE_ABI,
    lastBlock: 0,
    processedTxs: new Set(),
    errorCount: 0,
    eventCount: 0,
  },
  {
    name: 'DisputeJury',
    address: DISPUTE_JURY_ADDRESS || '0x0000000000000000000000000000000000000000',
    abi: DISPUTE_JURY_ABI,
    lastBlock: 0,
    processedTxs: new Set(),
    errorCount: 0,
    eventCount: 0,
  },
];

async function createProviderWithRetry(): Promise<ethers.JsonRpcProvider> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RPC_MAX_RETRIES; attempt++) {
    try {
      logger.info(`📡 Connecting to RPC (Attempt ${attempt}/${RPC_MAX_RETRIES})...`);
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      await provider.getNetwork();
      logger.info('✅ Connected to RPC successfully');
      return provider;
    } catch (error) {
      lastError = error as Error;
      logger.warn(`⚠️  Connection attempt ${attempt} failed: ${lastError.message}`);
      
      if (attempt < RPC_MAX_RETRIES) {
        const delay = parseInt(process.env.RPC_RETRY_DELAY || '1000');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to connect to RPC after ${RPC_MAX_RETRIES} attempts: ${lastError?.message}`);
}

async function startListeners() {
  // Initialize database
  initializeDatabase();
  logger.info('🗄️ Database initialized');

  let provider: ethers.JsonRpcProvider;
  
  try {
    provider = await createProviderWithRetry();
  } catch (error) {
    logger.error('❌ Error connecting to RPC:', error);
    process.exit(1);
  }

  let workerAddress: string;
  try {
    workerAddress = ethers.computeAddress(formattedPrivateKey);
  } catch (error) {
    logger.error('❌ Error computing address from private key:', error);
    process.exit(1);
  }

  console.log('🔗 AI Worker (Full Startup Mode) Starting...');
  console.log(`📍 Worker Wallet: ${workerAddress}`);
  console.log(`🌐 RPC Endpoint: ${RPC_URL}`);
  console.log('');

  const missingAddresses: string[] = [];
  
  if (!PROJECT_ESCROW_ADDRESS || PROJECT_ESCROW_ADDRESS === '0x0000000000000000000000000000000000000000') {
    missingAddresses.push('PROJECT_ESCROW_ADDRESS');
  }
  if (!AI_ORACLE_ADDRESS || AI_ORACLE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    missingAddresses.push('AI_ORACLE_ADDRESS');
  }
  if (!DISPUTE_JURY_ADDRESS || DISPUTE_JURY_ADDRESS === '0x0000000000000000000000000000000000000000') {
    missingAddresses.push('DISPUTE_JURY_ADDRESS');
  }

  if (missingAddresses.length > 0) {
    console.warn('⚠️  Missing contract addresses:');
    missingAddresses.forEach(addr => console.warn(`   - ${addr}`));
    console.log('\n');
  }

  try {
    const currentBlock = await provider.getBlockNumber();
    listeners.forEach(listener => {
      listener.lastBlock = currentBlock - 5;
    });
    logger.info(`📍 Starting from block: ${currentBlock - 5}`);
  } catch (error) {
    logger.error('❌ Error getting current block:', error);
    process.exit(1);
  }

  console.log(`📡 Setting up event polling (every ${POLL_INTERVAL}ms)...`);
  console.log('');
  
  listeners.forEach(listener => {
    if (listener.address === '0x0000000000000000000000000000000000000000') {
      console.warn(`⚠️  ${listener.name} address not configured, skipping...`);
      return;
    }

    console.log(`📡 Monitoring ${listener.name} at ${listener.address}...`);

    const pollInterval = setInterval(async () => {
      try {
        const currentBlock = await provider.getBlockNumber();
        
        if (currentBlock > listener.lastBlock) {
          try {
            const logs = await provider.getLogs({
              address: listener.address,
              fromBlock: listener.lastBlock + 1,
              toBlock: currentBlock,
            });

            if (logs.length > 0) {
              logger.info(`📊 [${listener.name}] Found ${logs.length} logs in blocks ${listener.lastBlock + 1}-${currentBlock}`);
              
              const iface = new ethers.Interface(listener.abi);
              let parsedCount = 0;
              
              logs.forEach(log => {
                try {
                  if (listener.processedTxs.has(log.transactionHash)) {
                    return;
                  }

                  const parsed = iface.parseLog(log);
                  if (parsed) {
                    parsedCount++;
                    listener.processedTxs.add(log.transactionHash);
                    listener.eventCount++;

                    console.log(`\n${'='.repeat(60)}`);
                    console.log(`✨ Event from ${listener.name}: ${parsed.name}`);
                    console.log(`${'='.repeat(60)}`);
                    console.log(`📦 Event Data:`, parsed.args);
                    console.log(`🔗 Transaction: ${log.transactionHash}`);
                    console.log(`📍 Block: ${log.blockNumber}`);

                    handleEvent(listener.name, parsed.name, parsed.args);
                  }
                } catch (error) {
                  // Silently skip logs that don't match ABI
                }
              });
              
              if (parsedCount > 0) {
                logger.info(`✅ [${listener.name}] Successfully parsed ${parsedCount} events`);
              }
            }

            listener.lastBlock = currentBlock;
            
            // Reset error count on success
            if (listener.errorCount > 0) {
              listener.errorCount = 0;
            }
          } catch (logError) {
            listener.errorCount++;
            if (listener.errorCount <= 3) {
              logger.error(`⚠️  Error fetching logs for ${listener.name}:`, logError);
            }
            
            // Stop if too many errors
            if (listener.errorCount > 10) {
              logger.error(`❌ Too many errors fetching ${listener.name} logs`);
              clearInterval(pollInterval);
            }
          }
        }
      } catch (error) {
        listener.errorCount++;
        if (listener.errorCount <= 3) {
          logger.error(`⚠️  Error polling ${listener.name}:`, error);
        }
      }
    }, POLL_INTERVAL);

    // Prevent process from exiting
    (pollInterval as any).unref = () => {};
  });

  console.log('✅ All listeners active and monitoring blockchain...');
  console.log('⏳ Waiting for events...\n');

  // Print stats every 30 seconds
  setInterval(() => {
    console.log(`\n📊 Stats Update:`);
    listeners.forEach(l => {
      console.log(`  ${l.name}: ${l.eventCount} events captured, last block ${l.lastBlock}`);
    });
  }, 30000);
}

function handleEvent(contractName: string, eventName: string, args: any) {
  logger.info(`Processing ${contractName}.${eventName}`, args);

  switch (eventName) {
    case 'DisputeCreated':
      handleDisputeCreated(args);
      break;
    case 'ProjectCreated':
      handleProjectCreated(args);
      break;
    default:
      logger.debug(`Unhandled event: ${eventName}`);
  }
}

function handleDisputeCreated(args: any) {
  const projectId = args[0];
  const milestoneId = args[1];
  const initiator = args[2];

  console.log(`
    🚨 DISPUTE CREATED!
    Project ID: ${projectId}
    Milestone ID: ${milestoneId}
    Initiator: ${initiator}
    
    ➡️  AI-PM Analysis Starting...
  `);

  try {
    insertDispute(projectId, projectId, milestoneId, initiator);
    logger.info('Dispute saved to database', { projectId, milestoneId, initiator });
  } catch (error) {
    logger.error('Failed to save dispute', error);
  }

  handleDisputeWithAI(projectId, milestoneId, initiator);
}

function handleProjectCreated(args: any) {
  const projectId = args[0];
  const client = args[1];
  const freelancer = args[2];

  console.log(`
    ✨ PROJECT CREATED!
    Project ID: ${projectId}
    Client: ${client}
    Freelancer: ${freelancer}
  `);

  try {
    getOrCreateUser(client);
    getOrCreateUser(freelancer);
    logger.info('Users created', { client, freelancer });
  } catch (error) {
    logger.error('Failed to create users', error);
  }
}

async function handleDisputeWithAI(
  projectId: number,
  milestoneId: number,
  initiatorAddress: string
) {
  console.log(`
    🤖 AI-PM ANALYSIS IN PROGRESS...
    
    Step 1: Analyze dispute context
    Step 2: Review milestone requirements
    Step 3: Evaluate freelancer performance
    Step 4: Generate AI verdict
    Step 5: Submit to blockchain
    
    ⏳ Processing...
  `);

  try {
    const analysis = await analyzeDispute(
      projectId,
      milestoneId,
      initiatorAddress,
      'Dispute raised for evaluation'
    );

    insertAIAnalysis(
      projectId,
      analysis.complianceScore,
      analysis.qualityScore,
      analysis.timelineScore,
      analysis.verdict,
      analysis.confidence,
      analysis.reasoning
    );

    logger.info('AI analysis completed', analysis);

    console.log(`
      ✨ AI Analysis Complete!
      
      📊 Analysis Results:
      - Contract Compliance: ${analysis.complianceScore.toFixed(1)}%
      - Work Quality: ${analysis.qualityScore.toFixed(1)}%
      - Timeline Adherence: ${analysis.timelineScore.toFixed(1)}%
      
      🎯 Recommended Verdict: ${analysis.verdict}
      🔐 Confidence Score: ${(analysis.confidence * 100).toFixed(1)}%
    `);
  } catch (error) {
    logger.error('AI analysis failed', error);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('❌ Unhandled Rejection:', reason);
});

// Start the listeners
startListeners().catch((error) => {
  logger.error('❌ Error starting listeners:', error);
  process.exit(1);
});

// Start API server
startAPI();

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down AI Worker...');
  process.exit(0);
});

// Keep process alive
setInterval(() => {
  // Heartbeat
}, 60000);