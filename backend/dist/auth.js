"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWalletSignature = verifyWalletSignature;
exports.createAuthMessage = createAuthMessage;
exports.authMiddleware = authMiddleware;
const ethers_1 = require("ethers");
/**
 * Verify wallet signature for authentication
 * Frontend signs: wallet_address + timestamp
 * Backend verifies signature
 */
function verifyWalletSignature(address, message, signature) {
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    }
    catch (error) {
        return false;
    }
}
/**
 * Create auth message for user to sign
 */
function createAuthMessage(address) {
    const timestamp = Date.now();
    return `Authenticate to HumanWork: ${address}\nTimestamp: ${timestamp}`;
}
/**
 * Middleware to verify auth (express)
 */
function authMiddleware(req, res, next) {
    const { signature, address, message } = req.headers;
    if (!signature || !address || !message) {
        return res.status(401).json({ error: 'Missing auth headers' });
    }
    if (!verifyWalletSignature(address, message, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    req.walletAddress = address;
    next();
}
//# sourceMappingURL=auth.js.map