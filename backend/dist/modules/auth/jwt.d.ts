export interface TokenPayload {
    address: string;
    email: string;
    iat?: number;
    exp?: number;
}
/**
 * Generate JWT token for user
 */
export declare function generateToken(address: string, email: string): string;
/**
 * Verify JWT token
 */
export declare function verifyToken(token: string): TokenPayload;
/**
 * Decode token without verification (for debugging)
 */
export declare function decodeToken(token: string): TokenPayload | null;
/**
 * Refresh token
 */
export declare function refreshToken(token: string): string;
//# sourceMappingURL=jwt.d.ts.map