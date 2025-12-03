/**
 * Verify wallet signature
 */
export declare function verifyWalletSignature(address: string, message: string, signature: string): Promise<boolean>;
/**
 * Generate authentication message
 */
export declare function generateAuthMessage(): string;
/**
 * Extract address from authentication message
 */
export declare function extractAddressFromSignature(message: string, signature: string): Promise<string | null>;
//# sourceMappingURL=wallet.d.ts.map