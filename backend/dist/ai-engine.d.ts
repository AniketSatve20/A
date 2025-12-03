/**
 * AI Engine for Dispute Resolution
 * Uses rule-based analysis + simple scoring
 * Can be upgraded to ML models later
 */
export interface DisputeAnalysis {
    complianceScore: number;
    qualityScore: number;
    timelineScore: number;
    verdict: string;
    confidence: number;
    reasoning: string;
}
/**
 * Analyze a dispute using AI logic
 */
export declare function analyzeDispute(projectId: number, milestoneId: number, initiator: string, contractDetails?: string): Promise<DisputeAnalysis>;
//# sourceMappingURL=ai-engine.d.ts.map