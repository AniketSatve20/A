interface KYCVerificationData {
    fullName: string;
    email: string;
    documentType: 'AADHAR' | 'PAN' | 'PASSPORT' | 'DRIVER_LICENSE';
    documentId: string;
    proofOfAddress: string;
    dateOfBirth: string;
}
interface VerificationResult {
    verified: boolean;
    score: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
    reason?: string;
}
/**
 * Initiate KYC verification
 */
export declare function initiateKYCVerification(address: string, data: KYCVerificationData): Promise<VerificationResult>;
/**
 * Verify GST for Indian businesses
 */
export declare function verifyGST(gstNumber: string): Promise<{
    valid: boolean;
    businessName?: string;
    score: number;
}>;
/**
 * Verify PAN for Indian individuals
 */
export declare function verifyPAN(panNumber: string): Promise<{
    valid: boolean;
    name?: string;
    score: number;
}>;
/**
 * Verify email address
 */
export declare function verifyEmailAddress(email: string): Promise<{
    valid: boolean;
    score: number;
}>;
/**
 * Skill assessment test
 */
export declare function skillAssessment(skillCategory: string, answers: number[]): Promise<{
    passed: boolean;
    score: number;
    level: string;
}>;
/**
 * Get verification status
 */
export declare function getVerificationStatus(address: string): VerificationResult;
export {};
//# sourceMappingURL=kyc.d.ts.map