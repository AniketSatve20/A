"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const database_1 = require("./database");
const logger_1 = require("./logger");
const api_auth_1 = require("./api-auth");
const api_projects_1 = require("./api-projects");
const api_disputes_1 = require("./api-disputes");
const api_storage_1 = __importDefault(require("./api-storage"));
const database_2 = require("./database");
const auth_1 = require("./auth");
// Load env vars
dotenv_1.default.config();
dotenv_1.default.config({ path: '.env.local' });
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
    },
});
exports.io = io;
const PORT = process.env.PORT || 3000;
// Initialize database
(0, database_1.initializeDatabase)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`);
    next();
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
    });
});
// ============ PUBLIC ENDPOINTS ============
// Get system stats
app.get('/api/stats', (req, res) => {
    try {
        const stats = (0, database_2.getProjectStats)();
        logger_1.logger.info('Stats retrieved');
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Failed to get stats', error);
        res.status(500).json({ error: error.message });
    }
});
// Get dispute history
app.get('/api/disputes', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const disputes = (0, database_2.getDisputeHistory)(limit);
        logger_1.logger.info(`Retrieved ${disputes.length} disputes`);
        res.json(disputes);
    }
    catch (error) {
        logger_1.logger.error('Failed to get disputes', error);
        res.status(500).json({ error: error.message });
    }
});
// Get user reputation
app.get('/api/users/:address/reputation', (req, res) => {
    try {
        const { address } = req.params;
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        const user = (0, database_2.getOrCreateUser)(address);
        logger_1.logger.info(`User reputation retrieved: ${address}`);
        res.json(user);
    }
    catch (error) {
        logger_1.logger.error('Failed to get user reputation', error);
        res.status(500).json({ error: error.message });
    }
});
// Auth verify endpoint
app.post('/api/auth/verify', (req, res) => {
    try {
        const { address, message, signature } = req.body;
        if (!address || !message || !signature) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const isValid = (0, auth_1.verifyWalletSignature)(address, message, signature);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        const user = (0, database_2.getOrCreateUser)(address);
        logger_1.logger.info(`User authenticated: ${address}`);
        res.json({
            success: true,
            user,
            token: Buffer.from(address + Date.now()).toString('base64')
        });
    }
    catch (error) {
        logger_1.logger.error('Auth verification failed', error);
        res.status(500).json({ error: error.message });
    }
});
// Routes - Modular APIs
app.use('/api/auth', api_auth_1.authApi);
app.use('/api/projects', api_projects_1.projectApi);
app.use('/api/disputes', api_disputes_1.disputeApi);
app.use('/api/storage', api_storage_1.default);
// WebSocket connection
io.on('connection', (socket) => {
    logger_1.logger.info(`Client connected: ${socket.id}`);
    socket.on('join', ({ roomId }) => {
        try {
            socket.join(`dispute-${roomId}`);
            logger_1.logger.info(`Client ${socket.id} joined room dispute-${roomId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to join room', error);
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
            logger_1.logger.info(`Message sent to dispute-${roomId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to send message', error);
        }
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`Client disconnected: ${socket.id}`);
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, req, res, next) => {
    logger_1.logger.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Start server
httpServer.listen(PORT, () => {
    logger_1.logger.info(`🚀 Backend server running on http://localhost:${PORT}`);
    logger_1.logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger_1.logger.info(`🗄️  Storage API: http://localhost:${PORT}/api/storage`);
    logger_1.logger.info(`💬 WebSocket: ws://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map