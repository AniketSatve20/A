"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeText = analyzeText;
exports.verifySkills = verifySkills;
exports.analyzeDispute = analyzeDispute;
exports.analyzeProjectRequirements = analyzeProjectRequirements;
exports.testHuggingFaceConnection = testHuggingFaceConnection;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../logger");
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY || '';
const HF_API_URL = 'https://api-inference.huggingface.co/models';
/**
 * Analyze text using Hugging Face
 */
async function analyzeText(text) {
    try {
        if (!HUGGING_FACE_API_KEY) {
            throw new Error('HUGGING_FACE_API_KEY not configured');
        }
        // Sentiment analysis
        const sentimentResponse = await axios_1.default.post(`${HF_API_URL}/distilbert-base-uncased-finetuned-sst-2-english`, { inputs: text }, {
            headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` },
        });
        const sentiments = sentimentResponse.data[0];
        const sentiment = sentiments.reduce((max, s) => s.score > max.score ? s : max);
        // Extract keywords (simple implementation)
        const keywords = text
            .split(/\s+/)
            .filter((word) => word.length > 5)
            .slice(0, 5);
        // Generate summary
        const summary = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        logger_1.logger.info(`Text analysis completed for text of length ${text.length}`);
        return {
            sentiment: sentiment.label,
            confidence: Math.round(sentiment.score * 100),
            keywords,
            summary,
        };
    }
    catch (error) {
        logger_1.logger.error('Text analysis failed', error);
        throw error;
    }
}
/**
 * Verify freelancer skills
 */
async function verifySkills(skillTest, submittedWork) {
    try {
        // Analyze submitted work against skill requirements
        const workAnalysis = await analyzeText(submittedWork);
        // Simple skill verification logic (improve with actual skill assessment)
        const skillLevel = Math.min(100, workAnalysis.confidence +
            Math.floor(Math.random() * 20) -
            10);
        const verified = skillLevel >= 70;
        const recommendations = [];
        if (skillLevel < 70) {
            recommendations.push('Work quality needs improvement');
            recommendations.push('Consider additional skill development');
        }
        if (skillLevel >= 85) {
            recommendations.push('Excellent work quality demonstrated');
        }
        logger_1.logger.info(`Skill verification completed: ${skillLevel}%`);
        return {
            skillLevel,
            verified,
            recommendations,
        };
    }
    catch (error) {
        logger_1.logger.error('Skill verification failed', error);
        throw error;
    }
}
/**
 * Analyze dispute using AI
 */
async function analyzeDispute(clientFeedback, freelancerResponse, projectDescription) {
    try {
        // Analyze both sides of the dispute
        const clientAnalysis = await analyzeText(clientFeedback);
        const freelancerAnalysis = await analyzeText(freelancerResponse);
        // Simple AI verdict logic (improve with actual ML model)
        let verdict = 'PARTIAL';
        let confidence = 65;
        if (clientAnalysis.sentiment === 'NEGATIVE' &&
            clientAnalysis.confidence > 80) {
            verdict = 'CLIENT_WIN';
            confidence = 75;
        }
        else if (freelancerAnalysis.sentiment === 'POSITIVE' &&
            freelancerAnalysis.confidence > 80) {
            verdict = 'FREELANCER_WIN';
            confidence = 75;
        }
        const reasoning = `Client sentiment: ${clientAnalysis.sentiment} (${clientAnalysis.confidence}%), ` +
            `Freelancer sentiment: ${freelancerAnalysis.sentiment} (${freelancerAnalysis.confidence}%)`;
        const recommendations = [
            'Review project specifications',
            'Consider mediation',
            'Document all communications',
        ];
        logger_1.logger.info(`Dispute analysis completed: ${verdict}`);
        return {
            verdict,
            confidence,
            reasoning,
            recommendations,
        };
    }
    catch (error) {
        logger_1.logger.error('Dispute analysis failed', error);
        throw error;
    }
}
/**
 * Generate project requirements analysis
 */
async function analyzeProjectRequirements(description) {
    try {
        const analysis = await analyzeText(description);
        // Extract required skills from keywords
        const requiredSkills = analysis.keywords;
        // Estimate complexity based on text length and keyword count
        const complexity = Math.min(10, Math.floor((description.length / 100 + requiredSkills.length) / 2));
        logger_1.logger.info(`Project analysis completed: ${requiredSkills.length} skills`);
        return {
            requiredSkills,
            complexity,
        };
    }
    catch (error) {
        logger_1.logger.error('Project analysis failed', error);
        throw error;
    }
}
/**
 * Test Hugging Face connection
 */
async function testHuggingFaceConnection() {
    try {
        if (!HUGGING_FACE_API_KEY) {
            logger_1.logger.warn('HUGGING_FACE_API_KEY not configured');
            return false;
        }
        const response = await axios_1.default.post(`${HF_API_URL}/distilbert-base-uncased-finetuned-sst-2-english`, { inputs: 'Testing Hugging Face connection' }, {
            headers: { Authorization: `Bearer ${HUGGING_FACE_API_KEY}` },
        });
        logger_1.logger.info('Hugging Face connection test successful');
        return response.status === 200;
    }
    catch (error) {
        logger_1.logger.error('Hugging Face connection test failed', error);
        return false;
    }
}
//# sourceMappingURL=huggingface.js.map