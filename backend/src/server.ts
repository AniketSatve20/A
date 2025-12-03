import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeDatabase } from './database';
import { logger } from './logger';
import { authApi } from './api-auth';
import { projectApi } from './api-projects';
import { disputeApi } from './api-disputes';
import storageApi from './api-storage';
import { 
  getProjectStats,
  getDisputeHistory,
  getUserReputation,
  getOrCreateUser,
} from './database';
import { verifyWalletSignature } from './auth';

// Load env vars
dotenv.config();
dotenv.config({ path: '.env.local' });

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// ============ PUBLIC ENDPOINTS ============

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

// Auth verify endpoint
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

// Routes - Modular APIs
app.use('/api/auth', authApi);
app.use('/api/projects', projectApi);
app.use('/api/disputes', disputeApi);
app.use('/api/storage', storageApi);

// WebSocket connection
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join', ({ roomId }) => {
    try {
      socket.join(`dispute-${roomId}`);
      logger.info(`Client ${socket.id} joined room dispute-${roomId}`);
    } catch (error) {
      logger.error('Failed to join room', error);
    }
  });

  socket.on('message', ({ roomId, message, sender }) => {
    try {
      io.to(`dispute-${roomId}`).emit('message', {
        id: Date.now(),
        text: message,
        sender,
        timestamp: new Date().toISOString(),
      });
      logger.info(`Message sent to dispute-${roomId}`);
    } catch (error) {
      logger.error('Failed to send message', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(PORT, () => {
  logger.info(`🚀 Backend server running on http://localhost:${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🗄️  Storage API: http://localhost:${PORT}/api/storage`);
  logger.info(`💬 WebSocket: ws://localhost:${PORT}`);
});

export { app, io };
