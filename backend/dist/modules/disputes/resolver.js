"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDisputeResolution = createDisputeResolution;
exports.recordJuryVote = recordJuryVote;
exports.finalizeDisputeWithJury = finalizeDisputeWithJury;
exports.getDisputeResolution = getDisputeResolution;
exports.getAllActiveDisputes = getAllActiveDisputes;
const logger_1 = require("../../logger");
const huggingface_1 = require("../ai/huggingface");
// Store dispute context and resolution
const disputeResolutions = new Map();
/**
 * Create dispute resolution record
 */
async function createDisputeResolution(disputeId, clientFeedback, freelancerResponse, projectDescription, escrowAmount) {
    try {
        // Get AI analysis
        const aiAnalysis = await (0, huggingface_1.analyzeDispute)(clientFeedback, freelancerResponse, projectDescription);
        // Map AI verdict to fund distribution
        const recommendedDistribution = mapVerdictToDistribution(aiAnalysis.verdict, escrowAmount);
        const resolution = {
            disputeId,
            verdict: aiAnalysis.verdict,
            reasonsForVerdict: [
                aiAnalysis.reasoning,
                ...aiAnalysis.recommendations,
            ],
            recommendedDistribution,
            confidenceScore: aiAnalysis.confidence,
            timestamp: Date.now(),
        };
        disputeResolutions.set(disputeId, resolution);
        logger_1.logger.info(`Dispute resolution created for dispute ${disputeId}: ${aiAnalysis.verdict}`);
        return resolution;
    }
    catch (error) {
        logger_1.logger.error('Failed to create dispute resolution', error);
        throw error;
    }
}
/**
 * Record jury vote
 */
async function recordJuryVote(disputeId, juryMember, vote) {
    try {
        const resolution = disputeResolutions.get(disputeId);
        if (!resolution) {
            throw new Error(`No resolution found for dispute ${disputeId}`);
        }
        if (!resolution.juryVotes) {
            resolution.juryVotes = {
                clientWins: 0,
                freelancerWins: 0,
                partial: 0,
            };
        }
        if (vote === 'CLIENT_WIN') {
            resolution.juryVotes.clientWins++;
        }
        else if (vote === 'FREELANCER_WIN') {
            resolution.juryVotes.freelancerWins++;
        }
        else {
            resolution.juryVotes.partial++;
        }
        logger_1.logger.info(`Jury vote recorded for dispute ${disputeId}: ${vote} from ${juryMember}`);
    }
    catch (error) {
        logger_1.logger.error('Failed to record jury vote', error);
        throw error;
    }
}
/**
 * Finalize dispute with jury votes
 */
function finalizeDisputeWithJury(disputeId) {
    try {
        const resolution = disputeResolutions.get(disputeId);
        if (!resolution || !resolution.juryVotes) {
            return null;
        }
        const votes = resolution.juryVotes;
        const totalVotes = votes.clientWins + votes.freelancerWins + votes.partial;
        if (totalVotes === 0) {
            return resolution;
        }
        // Determine final verdict based on majority
        if (votes.clientWins > votes.freelancerWins && votes.clientWins > votes.partial) {
            resolution.verdict = 'CLIENT_WIN';
            resolution.confidenceScore = Math.round((votes.clientWins / totalVotes) * 100);
        }
        else if (votes.freelancerWins > votes.clientWins &&
            votes.freelancerWins > votes.partial) {
            resolution.verdict = 'FREELANCER_WIN';
            resolution.confidenceScore = Math.round((votes.freelancerWins / totalVotes) * 100);
        }
        else {
            resolution.verdict = 'PARTIAL';
            resolution.confidenceScore = Math.round((votes.partial / totalVotes) * 100);
        }
        // Recalculate distribution based on final verdict
        resolution.recommendedDistribution = mapVerdictToDistribution(resolution.verdict, 100 // Normalized to percentage
        );
        logger_1.logger.info(`Dispute ${disputeId} finalized with jury verdict: ${resolution.verdict}`);
        return resolution;
    }
    catch (error) {
        logger_1.logger.error('Failed to finalize dispute', error);
        return null;
    }
}
/**
 * Get dispute resolution
 */
function getDisputeResolution(disputeId) {
    return disputeResolutions.get(disputeId) || null;
}
/**
 * Map verdict to fund distribution
 */
function mapVerdictToDistribution(verdict, totalAmount) {
    switch (verdict) {
        case 'CLIENT_WIN':
            return {
                clientPercentage: 100,
                freelancerPercentage: 0,
            };
        case 'FREELANCER_WIN':
            return {
                clientPercentage: 0,
                freelancerPercentage: 100,
            };
        case 'PARTIAL':
            return {
                clientPercentage: 50,
                freelancerPercentage: 50,
            };
        default:
            return {
                clientPercentage: 50,
                freelancerPercentage: 50,
            };
    }
}
/**
 * Export all active disputes for jury
 */
function getAllActiveDisputes() {
    return Array.from(disputeResolutions.values()).filter((d) => d.verdict === 'INCONCLUSIVE' || !d.juryVotes);
}
//# sourceMappingURL=resolver.js.map