import express, { Express, Request, Response } from 'express';
import {
  getProjectStats,
  getDisputeHistory,
  getUserReputation,
  getOrCreateUser,
} from './database';
import { logger } from './logger';

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`API Request: ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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
    const user = getOrCreateUser(address);
    logger.info(`User reputation retrieved: ${address}`);
    res.json(user);
  } catch (error) {
    logger.error('Failed to get user reputation', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled API error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
export function startAPI() {
  app.listen(PORT, () => {
    console.log(`\n📡 Admin API running at http://localhost:${PORT}`);
    console.log(`  - Health: http://localhost:${PORT}/health`);
    console.log(`  - Stats: http://localhost:${PORT}/api/stats`);
    console.log(`  - Disputes: http://localhost:${PORT}/api/disputes`);
  });
}

export default app;
