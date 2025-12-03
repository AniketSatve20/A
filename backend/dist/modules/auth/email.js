"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
exports.verifyEmailCode = verifyEmailCode;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.testEmailConfiguration = testEmailConfiguration;
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../logger");
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@humanwork.io';
// Store verification codes temporarily (in production, use Redis)
const verificationCodes = new Map();
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes
const transporter = nodemailer_1.default.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});
/**
 * Generate verification code
 */
function generateVerificationCode() {
    return crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
}
/**
 * Send verification email with OTP
 */
async function sendVerificationEmail(email) {
    try {
        const code = generateVerificationCode();
        verificationCodes.set(email, {
            code,
            createdAt: Date.now(),
        });
        const mailOptions = {
            from: EMAIL_FROM,
            to: email,
            subject: 'HumanWork Protocol - Email Verification',
            html: `
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #2563eb; letter-spacing: 2px;">${code}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger_1.logger.info(`Verification email sent to ${email}`);
        return code;
    }
    catch (error) {
        logger_1.logger.error('Failed to send verification email', error);
        throw error;
    }
}
/**
 * Verify email with OTP
 */
function verifyEmailCode(email, code) {
    try {
        const stored = verificationCodes.get(email);
        if (!stored) {
            logger_1.logger.warn(`No verification code found for ${email}`);
            return false;
        }
        if (Date.now() - stored.createdAt > VERIFICATION_CODE_EXPIRY) {
            verificationCodes.delete(email);
            logger_1.logger.warn(`Verification code expired for ${email}`);
            return false;
        }
        if (stored.code !== code.toUpperCase()) {
            logger_1.logger.warn(`Invalid verification code for ${email}`);
            return false;
        }
        verificationCodes.delete(email);
        logger_1.logger.info(`Email verified successfully for ${email}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to verify email code', error);
        return false;
    }
}
/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetToken) {
    try {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: EMAIL_FROM,
            to: email,
            subject: 'HumanWork Protocol - Password Reset',
            html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
        };
        await transporter.sendMail(mailOptions);
        logger_1.logger.info(`Password reset email sent to ${email}`);
    }
    catch (error) {
        logger_1.logger.error('Failed to send password reset email', error);
        throw error;
    }
}
/**
 * Test email configuration
 */
async function testEmailConfiguration() {
    try {
        await transporter.verify();
        logger_1.logger.info('Email configuration verified successfully');
        return true;
    }
    catch (error) {
        logger_1.logger.error('Email configuration failed', error);
        return false;
    }
}
//# sourceMappingURL=email.js.map