/**
 * Verify wallet signature for authentication
 * Frontend signs: wallet_address + timestamp
 * Backend verifies signature
 */
export declare function verifyWalletSignature(address: string, message: string, signature: string): boolean;
/**
 * Create auth message for user to sign
 */
export declare function createAuthMessage(address: string): string;
/**
 * Middleware to verify auth (express)
 */
export declare function authMiddleware(req: any, res: any, next: any): any;
//# sourceMappingURL=auth.d.ts.map