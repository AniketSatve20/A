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
export async function analyzeDispute(
  projectId: number,
  milestoneId: number,
  initiator: string,
  contractDetails: string = 'Standard dispute analysis'
): Promise<DisputeAnalysis> {
  
  // Rule-based analysis
  const complianceScore = calculateComplianceScore(contractDetails);
  const qualityScore = calculateQualityScore(contractDetails);
  const timelineScore = calculateTimelineScore(contractDetails);

  // Determine verdict based on scores
  const averageScore = (complianceScore + qualityScore + timelineScore) / 3;
  let verdict = 'FREELANCER_WIN';
  let reasoning = '';

  if (averageScore > 80) {
    verdict = 'FREELANCER_WIN';
    reasoning = 'Strong evidence of work completion and quality standards met';
  } else if (averageScore > 60) {
    verdict = 'PARTIAL_REFUND';
    reasoning = 'Mixed evidence, partial compensation recommended based on work completed';
  } else {
    verdict = 'CLIENT_WIN';
    reasoning = 'Insufficient work quality or completion requirements not met';
  }

  return {
    complianceScore: Math.round(complianceScore * 100) / 100,
    qualityScore: Math.round(qualityScore * 100) / 100,
    timelineScore: Math.round(timelineScore * 100) / 100,
    verdict,
    confidence: Math.min(averageScore / 100, 0.95),
    reasoning,
  };
}

function calculateComplianceScore(details: string): number {
  let score = 70;
  if (details.includes('complete')) score += 10;
  if (details.includes('approved')) score += 10;
  if (details.includes('verified')) score += 10;
  if (details.includes('incomplete')) score -= 20;
  if (details.includes('failed')) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function calculateQualityScore(details: string): number {
  let score = 65;
  if (details.includes('high quality')) score += 20;
  if (details.includes('excellent')) score += 15;
  if (details.includes('professional')) score += 10;
  if (details.includes('poor quality')) score -= 25;
  if (details.includes('bugs')) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function calculateTimelineScore(details: string): number {
  let score = 75;
  if (details.includes('on time')) score += 15;
  if (details.includes('early')) score += 20;
  if (details.includes('delayed')) score -= 25;
  if (details.includes('late')) score -= 20;
  return Math.max(0, Math.min(100, score));
}
