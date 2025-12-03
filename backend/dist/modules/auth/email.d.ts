/**
 * Send verification email with OTP
 */
export declare function sendVerificationEmail(email: string): Promise<string>;
/**
 * Verify email with OTP
 */
export declare function verifyEmailCode(email: string, code: string): boolean;
/**
 * Send password reset email
 */
export declare function sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
/**
 * Test email configuration
 */
export declare function testEmailConfiguration(): Promise<boolean>;
//# sourceMappingURL=email.d.ts.map