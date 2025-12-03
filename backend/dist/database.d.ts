import Database from 'better-sqlite3';
export declare function initializeDatabase(): void;
export declare function insertUser(walletAddress: string, role: string): Database.RunResult;
export declare function getOrCreateUser(walletAddress: string): unknown;
export declare function insertProject(projectId: number, clientAddress: string, freelancerAddress: string, totalAmount: number): Database.RunResult;
export declare function insertDispute(disputeId: number, projectId: number, milestoneId: number, initiatorAddress: string): Database.RunResult;
export declare function insertAIAnalysis(disputeId: number, complianceScore: number, qualityScore: number, timelineScore: number, verdict: string, confidence: number, details: string): Database.RunResult;
export declare function getDisputeHistory(limit?: number): unknown[];
export declare function recordProject(data: {
    projectId: number;
    clientAddress: string;
    freelancerAddress: string;
    totalAmount: number;
    status?: string;
}): Database.RunResult;
export declare function recordDispute(data: {
    disputeId: number;
    projectId: number;
    milestoneId: number;
    initiator: string;
    status?: string;
    aiVerdict?: string;
    aiConfidence?: number;
}): Database.RunResult;
export declare function updateDisputeVerdict(disputeId: number, verdict: string, votesFor: number, votesAgainst: number): Database.RunResult;
export declare function getUserReputation(walletAddress: string): unknown;
export declare function updateUserReputation(walletAddress: string, newScore: number): Database.RunResult;
export declare function getProjectStats(): unknown;
declare const _default: any;
export default _default;
//# sourceMappingURL=database.d.ts.map