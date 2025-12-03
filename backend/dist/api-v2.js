"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAPI = startAPI;
const express_1 = __importDefault(require("express"));
const logger_1 = require("../../logger");
const jwt_1 = require("../modules/auth/jwt");
const email_1 = require("../modules/auth/email");
const wallet_1 = require("../modules/auth/wallet");
const filecoin_1 = require("../modules/storage/filecoin");
const huggingface_1 = require("../modules/ai/huggingface");
const kyc_1 = require("../modules/verification/kyc");
const resolver_1 = require("../modules/disputes/resolver");
const app = (0, express_1.default)();
const PORT = process.env.API_PORT || 3000;
// Middleware
app.use(express_1.default.json());
// Auth middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
// Request logging
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`);
    next();
});
// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
    });
});
// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================
// Generate auth message
app.get('/api/auth/message', (req, res) => {
    try {
        const message = (0, wallet_1.generateAuthMessage)();
        res.json({ message });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Send verification email
app.post('/api/auth/send-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        await (0, email_1.sendVerificationEmail)(email);
        res.json({ success: true, message: 'Verification email sent' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Verify email with OTP
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ error: 'Email and code required' });
        }
        const verified = (0, email_1.verifyEmailCode)(email, code);
        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        res.json({ success: true, message: 'Email verified successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Wallet login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { address, signature, message } = req.body;
        if (!address || !signature || !message) {
            return res
                .status(400)
                .json({ error: 'Address, signature, and message required' });
        }
        const isValid = await (0, wallet_1.verifyWalletSignature)(address, message, signature);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        const token = (0, jwt_1.generateToken)(address, '');
        res.json({
            success: true,
            token,
            address,
            expiresIn: '7d',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Refresh token
app.post('/api/auth/refresh', authMiddleware, (req, res) => {
    try {
        const oldToken = req.headers.authorization?.split(' ')[1];
        if (!oldToken) {
            return res.status(400).json({ error: 'No token to refresh' });
        }
        const newToken = (0, jwt_1.refreshToken)(oldToken);
        res.json({ success: true, token: newToken });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================
// STORAGE ENDPOINTS
// ============================================================
// Upload file to Filecoin
app.post('/api/storage/upload', authMiddleware, async (req, res) => {
    try {
        const { fileName, fileData } = req.body;
        if (!fileName || !fileData) {
            return res
                .status(400)
                .json({ error: 'fileName and fileData required' });
        }
        const buffer = Buffer.from(fileData, 'base64');
        const result = await (0, filecoin_1.uploadToFilecoin)(fileName, buffer);
        res.json({
            success: true,
            cid: result.cid,
            url: result.url,
            size: result.size,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Retrieve file from IPFS
app.get('/api/storage/:cid', authMiddleware, async (req, res) => {
    try {
        const { cid } = req.params;
        const buffer = await (0, filecoin_1.getFromIPFS)(cid);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================
// AI & VERIFICATION ENDPOINTS
// ============================================================
// Analyze text
app.post('/api/ai/analyze-text', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text required' });
        }
        const result = await (0, huggingface_1.analyzeText)(text);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Verify skills
app.post('/api/ai/verify-skills', authMiddleware, async (req, res) => {
    try {
        const { skillTest, submittedWork } = req.body;
        if (!skillTest || !submittedWork) {
            return res
                .status(400)
                .json({ error: 'skillTest and submittedWork required' });
        }
        const result = await (0, huggingface_1.verifySkills)(skillTest, submittedWork);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Analyze dispute
app.post('/api/ai/analyze-dispute', authMiddleware, async (req, res) => {
    try {
        const { clientFeedback, freelancerResponse, projectDescription } = req.body;
        if (!clientFeedback || !freelancerResponse || !projectDescription) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const result = await (0, huggingface_1.analyzeDispute)(clientFeedback, freelancerResponse, projectDescription);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Initiate KYC verification
app.post('/api/verification/kyc', authMiddleware, async (req, res) => {
    try {
        const { fullName, email, documentType, documentId, dateOfBirth } = req.body;
        const address = req.user.address;
        const result = await (0, kyc_1.initiateKYCVerification)(address, {
            fullName,
            email,
            documentType,
            documentId,
            proofOfAddress: '',
            dateOfBirth,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Verify GST
app.post('/api/verification/gst', authMiddleware, async (req, res) => {
    try {
        const { gstNumber } = req.body;
        if (!gstNumber) {
            return res.status(400).json({ error: 'GST number required' });
        }
        const result = await (0, kyc_1.verifyGST)(gstNumber);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Verify PAN
app.post('/api/verification/pan', authMiddleware, async (req, res) => {
    try {
        const { panNumber } = req.body;
        if (!panNumber) {
            return res.status(400).json({ error: 'PAN number required' });
        }
        const result = await (0, kyc_1.verifyPAN)(panNumber);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================
// DISPUTE ENDPOINTS
// ============================================================
// Create dispute resolution
app.post('/api/disputes/:disputeId/resolve', authMiddleware, async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { clientFeedback, freelancerResponse, projectDescription, escrowAmount } = req.body;
        const result = await (0, resolver_1.createDisputeResolution)(parseInt(disputeId), clientFeedback, freelancerResponse, projectDescription, escrowAmount);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get dispute resolution
app.get('/api/disputes/:disputeId/resolution', authMiddleware, (req, res) => {
    try {
        const { disputeId } = req.params;
        const resolution = (0, resolver_1.getDisputeResolution)(parseInt(disputeId));
        if (!resolution) {
            return res.status(404).json({ error: 'Resolution not found' });
        }
        res.json(resolution);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Record jury vote
app.post('/api/disputes/:disputeId/vote', authMiddleware, async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { vote } = req.body;
        const juryMember = req.user.address;
        if (!vote) {
            return res.status(400).json({ error: 'Vote required' });
        }
        await (0, resolver_1.recordJuryVote)(parseInt(disputeId), juryMember, vote);
        res.json({ success: true, message: 'Vote recorded' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ============================================================
// ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});
// ============================================================
// START SERVER
// ============================================================
function startAPI() {
    app.listen(PORT, () => {
        console.log(`\n📡 API Server running at http://localhost:${PORT}`);
        console.log(`  - Health: http://localhost:${PORT}/health`);
        console.log(`  - Auth: http://localhost:${PORT}/api/auth/*`);
        console.log(`  - Storage: http://localhost:${PORT}/api/storage/*`);
        console.log(`  - AI: http://localhost:${PORT}/api/ai/*`);
        console.log(`  - Disputes: http://localhost:${PORT}/api/disputes/*`);
        console.log(`  - Verification: http://localhost:${PORT}/api/verification/*`);
    });
}
exports.default = app;
//# sourceMappingURL=api-v2.js.map