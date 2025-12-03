interface DisputeResolution {
    disputeId: number;
    verdict: 'CLIENT_WIN' | 'FREELANCER_WIN' | 'PARTIAL' | 'INCONCLUSIVE';
    reasonsForVerdict: string[];
    recommendedDistribution: {
        clientPercentage: number;
        freelancerPercentage: number;
    };
    confidenceScore: number;
    juryVotes?: {
        clientWins: number;
        freelancerWins: number;
        partial: number;
    };
    timestamp: number;
}
/**
 * Create dispute resolution record
 */
export declare function createDisputeResolution(disputeId: number, clientFeedback: string, freelancerResponse: string, projectDescription: string, escrowAmount: number): Promise<DisputeResolution>;
/**
 * Record jury vote
 */
export declare function recordJuryVote(disputeId: number, juryMember: string, vote: 'CLIENT_WIN' | 'FREELANCER_WIN' | 'PARTIAL'): Promise<void>;
/**
 * Finalize dispute with jury votes
 */
export declare function finalizeDisputeWithJury(disputeId: number): DisputeResolution | null;
/**
 * Get dispute resolution
 */
export declare function getDisputeResolution(disputeId: number): DisputeResolution | null;
/**
 * Export all active disputes for jury
 */
export declare function getAllActiveDisputes(): DisputeResolution[];
export {};
//# sourceMappingURL=resolver.d.ts.map