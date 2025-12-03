"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
exports.refreshToken = refreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../../logger");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
/**
 * Generate JWT token for user
 */
function generateToken(address, email) {
    try {
        const token = jsonwebtoken_1.default.sign({
            address: address.toLowerCase(),
            email: email.toLowerCase(),
        }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        logger_1.logger.info(`JWT token generated for ${address}`);
        return token;
    }
    catch (error) {
        logger_1.logger.error('Failed to generate JWT token', error);
        throw error;
    }
}
/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        logger_1.logger.error('JWT token verification failed', error);
        throw new Error('Invalid token');
    }
}
/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
/**
 * Refresh token
 */
function refreshToken(token) {
    try {
        const payload = verifyToken(token);
        return generateToken(payload.address, payload.email);
    }
    catch (error) {
        logger_1.logger.error('Failed to refresh token', error);
        throw error;
    }
}
//# sourceMappingURL=jwt.js.map