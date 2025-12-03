"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWalletSignature = verifyWalletSignature;
exports.generateAuthMessage = generateAuthMessage;
exports.extractAddressFromSignature = extractAddressFromSignature;
const ethers_1 = require("ethers");
const logger_1 = require("../../logger");
/**
 * Verify wallet signature
 */
async function verifyWalletSignature(address, message, signature) {
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
        if (isValid) {
            logger_1.logger.info(`Signature verified for ${address}`);
        }
        else {
            logger_1.logger.warn(`Signature verification failed for ${address}`);
        }
        return isValid;
    }
    catch (error) {
        logger_1.logger.error('Signature verification error', error);
        return false;
    }
}
/**
 * Generate authentication message
 */
function generateAuthMessage() {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15);
    return `Sign this message to authenticate with HumanWork Protocol\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
/**
 * Extract address from authentication message
 */
async function extractAddressFromSignature(message, signature) {
    try {
        const address = ethers_1.ethers.verifyMessage(message, signature);
        return address;
    }
    catch (error) {
        logger_1.logger.error('Failed to extract address from signature', error);
        return null;
    }
}
//# sourceMappingURL=wallet.js.map