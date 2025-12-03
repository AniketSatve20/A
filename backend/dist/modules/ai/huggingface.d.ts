interface TextAnalysisResult {
    sentiment: string;
    confidence: number;
    keywords: string[];
    summary: string;
}
interface SkillVerificationResult {
    skillLevel: number;
    recommendations: string[];
    verified: boolean;
}
interface DisputeAnalysisResult {
    verdict: 'CLIENT_WIN' | 'FREELANCER_WIN' | 'PARTIAL' | 'INCONCLUSIVE';
    confidence: number;
    reasoning: string;
    recommendations: string[];
}
/**
 * Analyze text using Hugging Face
 */
export declare function analyzeText(text: string): Promise<TextAnalysisResult>;
/**
 * Verify freelancer skills
 */
export declare function verifySkills(skillTest: string, submittedWork: string): Promise<SkillVerificationResult>;
/**
 * Analyze dispute using AI
 */
export declare function analyzeDispute(clientFeedback: string, freelancerResponse: string, projectDescription: string): Promise<DisputeAnalysisResult>;
/**
 * Generate project requirements analysis
 */
export declare function analyzeProjectRequirements(description: string): Promise<{
    requiredSkills: string[];
    complexity: number;
}>;
/**
 * Test Hugging Face connection
 */
export declare function testHuggingFaceConnection(): Promise<boolean>;
export {};
//# sourceMappingURL=huggingface.d.ts.map