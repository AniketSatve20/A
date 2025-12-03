import express, { Express, Request, Response } from 'express';
import {
  getProjectStats,
  getDisputeHistory,
  getUserReputation,
  getOrCreateUser,
  recordDispute,
  recordProject,
  updateDisputeVerdict,
} from './database';
import { analyzeDispute } from './ai-engine';
import { verifyWalletSignature, authMiddleware } from './auth';
import { logger } from './logger';

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`API Request: ${req.method} ${req.path}`);
  next();
});

// ============ PUBLIC ENDPOINTS ============

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    network: process.env.NETWORK || 'ethereum',
  });
});

// Get system stats
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = getProjectStats();
    logger.info('Stats retrieved');
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get dispute history
app.get('/api/disputes', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const disputes = getDisputeHistory(limit);
    logger.info(`Retrieved ${disputes.length} disputes`);
    res.json(disputes);
  } catch (error) {
    logger.error('Failed to get disputes', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get user reputation
app.get('/api/users/:address/reputation', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    const user = getOrCreateUser(address);
    logger.info(`User reputation retrieved: ${address}`);
    res.json(user);
  } catch (error) {
    logger.error('Failed to get user reputation', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Auth endpoints
app.post('/api/auth/verify', (req: Request, res: Response) => {
  try {
    const { address, message, signature } = req.body;
    
    if (!address || !message || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isValid = verifyWalletSignature(address, message, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Get or create user
    const user = getOrCreateUser(address);
    logger.info(`User authenticated: ${address}`);
    
    res.json({ 
      success: true, 
      user,
      token: Buffer.from(address + Date.now()).toString('base64')
    });
  } catch (error) {
    logger.error('Auth verification failed', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============ PROTECTED ENDPOINTS ============

// Get user profile (requires auth)
app.get('/api/users/:address/profile', authMiddleware, (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const user = getOrCreateUser(address);
    res.json(user);
  } catch (error) {
    logger.error('Failed to get user profile', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all projects
app.get('/api/projects', (req: Request, res: Response) => {
  try {
    // This is a placeholder - in production, fetch from database/blockchain
    const projects = [
      {
        id: 'proj_1',
        name: 'Smart Contract Audit',
        status: 'active',
        budget: '5 ETH',
        created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'proj_2',
        name: 'Frontend Development',
        status: 'active',
        budget: '3 ETH',
        created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'proj_3',
        name: 'API Integration',
        status: 'completed',
        budget: '2 ETH',
        created: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    logger.info(`Retrieved ${projects.length} projects`);
    res.json(projects);
  } catch (error) {
    logger.error('Failed to get projects', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create project
app.post('/api/projects', authMiddleware, (req: Request, res: Response) => {
  try {
    const { projectId, clientAddress, freelancerAddress, totalAmount, status } = req.body;
    
    if (!projectId || !clientAddress || !freelancerAddress || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    recordProject({
      projectId,
      clientAddress,
      freelancerAddress,
      totalAmount,
      status: status || 'ACTIVE'
    });

    logger.info(`Project created: ${projectId}`);
    res.json({ success: true, projectId });
  } catch (error) {
    logger.error('Failed to create project', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Submit dispute - AI Analysis
app.post('/api/disputes/analyze', authMiddleware, (req: Request, res: Response) => {
  try {
    const { projectId, milestoneId, initiator, details } = req.body;
    
    if (!projectId || !milestoneId || !initiator) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Run AI analysis
    analyzeDispute(projectId, milestoneId, initiator, details)
      .then(analysis => {
        logger.info(`Dispute analyzed: ${projectId}/${milestoneId}`);
        res.json(analysis);
      })
      .catch(err => {
        logger.error('AI analysis failed', err);
        res.status(500).json({ error: 'Analysis failed' });
      });
  } catch (error) {
    logger.error('Failed to analyze dispute', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Record dispute
app.post('/api/disputes', authMiddleware, (req: Request, res: Response) => {
  try {
    const { disputeId, projectId, milestoneId, initiator, verdict, confidence } = req.body;
    
    if (!disputeId || !projectId || !milestoneId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    recordDispute({
      disputeId,
      projectId,
      milestoneId,
      initiator,
      status: 'OPEN',
      aiVerdict: verdict,
      aiConfidence: confidence
    });

    logger.info(`Dispute recorded: ${disputeId}`);
    res.json({ success: true, disputeId });
  } catch (error) {
    logger.error('Failed to record dispute', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update dispute with jury verdict
app.put('/api/disputes/:disputeId/verdict', authMiddleware, (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;
    const { verdict, votesFor, votesAgainst } = req.body;
    
    if (!verdict) {
      return res.status(400).json({ error: 'Missing verdict' });
    }

    updateDisputeVerdict(parseInt(disputeId), verdict, votesFor || 0, votesAgainst || 0);
    logger.info(`Dispute verdict recorded: ${disputeId}`);
    res.json({ success: true, disputeId });
  } catch (error) {
    logger.error('Failed to update dispute', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get user disputes
app.get('/api/users/:address/disputes', authMiddleware, (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const allDisputes = getDisputeHistory(limit);
    const disputes = allDisputes.filter((d: any) => 
      d.initiator_address?.toLowerCase() === address.toLowerCase()
    );
    res.json(disputes);
  } catch (error) {
    logger.error('Failed to get user disputes', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get user projects
app.get('/api/users/:address/projects', authMiddleware, (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    // This would need to be implemented in database layer
    res.json({ message: 'Endpoint ready for contract integration' });
  } catch (error) {
    logger.error('Failed to get user projects', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============ EMAIL OTP ENDPOINTS ============

// Store OTPs in memory with expiration (in production, use Redis)
const otpStorage = new Map<string, { otp: string; expiresAt: number }>();

// Send OTP
app.post('/api/auth/email/send-otp', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStorage.set(email, { otp, expiresAt });

    // Log OTP for testing (in production, send via email service)
    console.log(`📧 OTP for ${email}: ${otp}`);
    logger.info(`OTP sent to ${email}`);

    res.json({ 
      success: true, 
      message: 'OTP sent to your email',
      email,
      // For testing: include OTP (remove in production)
      _devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    logger.error('Failed to send OTP', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Verify OTP
app.post('/api/auth/email/verify-otp', (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Missing email or OTP' });
    }

    const stored = otpStorage.get(email);
    
    if (!stored) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStorage.delete(email);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    if (stored.otp !== otp.toString()) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    // OTP verified - generate token and user
    otpStorage.delete(email);

    const user = {
      address: '', // Email-only login
      email,
      name: email.split('@')[0],
      verified: true,
      reputation: 0,
      totalProjects: 0,
      completedProjects: 0,
      skills: [],
      role: 'client' as const,
    };

    const token = Buffer.from(email + Date.now()).toString('base64');

    logger.info(`Email verified: ${email}`);
    res.json({ 
      success: true, 
      message: 'Email verified successfully',
      token,
      user 
    });
  } catch (error) {
    logger.error('OTP verification failed', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============ ERROR HANDLER ============

app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled API error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ 404 HANDLER ============

app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ============ SERVER START ============

export function startAPI() {
  app.listen(PORT, () => {
    console.log(`\n📡 HumanWork Backend API v1.0.0`);
    console.log(`   Running at http://localhost:${PORT}`);
    console.log(`\n📍 Public Endpoints:`);
    console.log(`   GET  /health - Server health check`);
    console.log(`   GET  /api/stats - System statistics`);
    console.log(`   GET  /api/disputes - Dispute history`);
    console.log(`   GET  /api/users/:address/reputation - User reputation`);
    console.log(`   POST /api/auth/verify - Wallet signature verification`);
    console.log(`\n🔐 Protected Endpoints (require auth):`);
    console.log(`   GET  /api/users/:address/profile - User profile`);
    console.log(`   POST /api/projects - Create project`);
    console.log(`   POST /api/disputes/analyze - AI dispute analysis`);
    console.log(`   POST /api/disputes - Record dispute`);
    console.log(`   PUT  /api/disputes/:id/verdict - Update verdict`);
    console.log(`   GET  /api/users/:address/disputes - User disputes`);
    console.log(`   GET  /api/users/:address/projects - User projects`);
  });
}

export default app;
