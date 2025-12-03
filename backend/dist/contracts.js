"use strict";
/**
 * Smart Contract Integration Service
 * Handles interactions with deployed HumanWork Protocol contracts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartContractService = void 0;
exports.initializeContractService = initializeContractService;
const ethers_1 = require("ethers");
const logger_1 = require("./logger");
// Contract ABIs
const PROJECT_ESCROW_ABI = [
    'function createProject(uint256 _totalAmount, uint256 _freelancerId, string memory _description) public returns (uint256)',
    'function addMilestone(uint256 _projectId, uint256 _amount, string memory _description) public',
    'function completeMilestone(uint256 _projectId, uint256 _milestoneId) public',
    'function disputeMilestone(uint256 _projectId, uint256 _milestoneId, string memory _reason) public',
    'function getProject(uint256 _projectId) public view returns (tuple(address client, address freelancer, uint256 totalAmount, uint8 status, uint256 createdAt) project)',
];
const DISPUTE_JURY_ABI = [
    'function createDispute(uint256 _projectId, uint256 _milestoneId, string memory _evidence) public returns (uint256)',
    'function submitVote(uint256 _disputeId, bool _forFreelancer) public',
    'function getDispute(uint256 _disputeId) public view returns (tuple(uint256 projectId, uint256 milestoneId, address initiator, uint8 status, uint256 votesFor, uint256 votesAgainst) dispute)',
    'function getDisputeResolution(uint256 _disputeId) public view returns (uint8 outcome)',
];
const USER_REGISTRY_ABI = [
    'function registerUser(string memory _username, string memory _role) public',
    'function updateReputation(address _user, uint256 _newScore) public',
    'function getUserReputation(address _user) public view returns (uint256)',
    'function isVerified(address _user) public view returns (bool)',
];
class SmartContractService {
    constructor(config) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(config.providerUrl);
        if (config.privateKey) {
            this.signer = new ethers_1.ethers.Wallet(config.privateKey, this.provider);
        }
        else {
            this.signer = this.provider;
        }
        this.escrowContract = new ethers_1.ethers.Contract(config.projectEscrowAddress, PROJECT_ESCROW_ABI, this.signer);
        this.juryContract = new ethers_1.ethers.Contract(config.disputeJuryAddress, DISPUTE_JURY_ABI, this.signer);
        this.userRegistryContract = new ethers_1.ethers.Contract(config.userRegistryAddress, USER_REGISTRY_ABI, this.signer);
        logger_1.logger.info('SmartContractService initialized');
    }
    /**
     * Create a new project on-chain
     */
    async createProject(clientAddress, freelancerId, totalAmount, description) {
        try {
            const tx = await this.escrowContract.createProject(ethers_1.ethers.parseEther(totalAmount), freelancerId, description);
            const receipt = await tx.wait();
            logger_1.logger.info(`Project created: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create project', error);
            throw error;
        }
    }
    /**
     * Add milestone to project
     */
    async addMilestone(projectId, amount, description) {
        try {
            const tx = await this.escrowContract.addMilestone(projectId, ethers_1.ethers.parseEther(amount), description);
            const receipt = await tx.wait();
            logger_1.logger.info(`Milestone added: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to add milestone', error);
            throw error;
        }
    }
    /**
     * Complete milestone
     */
    async completeMilestone(projectId, milestoneId) {
        try {
            const tx = await this.escrowContract.completeMilestone(projectId, milestoneId);
            const receipt = await tx.wait();
            logger_1.logger.info(`Milestone completed: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to complete milestone', error);
            throw error;
        }
    }
    /**
     * Create dispute on-chain
     */
    async createDispute(projectId, milestoneId, evidence) {
        try {
            const tx = await this.juryContract.createDispute(projectId, milestoneId, evidence);
            const receipt = await tx.wait();
            logger_1.logger.info(`Dispute created: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create dispute', error);
            throw error;
        }
    }
    /**
     * Submit jury vote on dispute
     */
    async submitVote(disputeId, forFreelancer) {
        try {
            const tx = await this.juryContract.submitVote(disputeId, forFreelancer);
            const receipt = await tx.wait();
            logger_1.logger.info(`Vote submitted: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to submit vote', error);
            throw error;
        }
    }
    /**
     * Get dispute resolution from contract
     */
    async getDisputeResolution(disputeId) {
        try {
            const outcome = await this.juryContract.getDisputeResolution(disputeId);
            logger_1.logger.info(`Dispute resolution fetched: ${disputeId}`);
            const outcomeMap = {
                0: 'PENDING',
                1: 'CLIENT_WIN',
                2: 'FREELANCER_WIN',
                3: 'PARTIAL_REFUND',
            };
            return {
                outcome: outcomeMap[outcome] || 'UNKNOWN',
                outcodeCode: outcome,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get dispute resolution', error);
            throw error;
        }
    }
    /**
     * Get user reputation from contract
     */
    async getUserReputation(userAddress) {
        try {
            const reputation = await this.userRegistryContract.getUserReputation(userAddress);
            logger_1.logger.info(`User reputation fetched: ${userAddress}`);
            return {
                userAddress,
                reputation: reputation.toString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get user reputation', error);
            throw error;
        }
    }
    /**
     * Update user reputation on-chain
     */
    async updateUserReputation(userAddress, newScore) {
        try {
            const tx = await this.userRegistryContract.updateReputation(userAddress, newScore);
            const receipt = await tx.wait();
            logger_1.logger.info(`User reputation updated: ${receipt.transactionHash}`);
            return {
                success: true,
                transactionHash: receipt.transactionHash,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to update user reputation', error);
            throw error;
        }
    }
    /**
     * Estimate gas for transaction
     */
    async estimateGas(functionName, args) {
        try {
            const contract = this.escrowContract;
            const gasEstimate = await contract[functionName].estimateGas(...args);
            const gasPrice = await this.provider.getFeeData();
            return {
                gasEstimate: gasEstimate.toString(),
                gasPrice: gasPrice?.gasPrice?.toString() || '0',
                estimatedCost: ethers_1.ethers.formatEther(gasEstimate * (gasPrice?.gasPrice || 0n)),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to estimate gas', error);
            throw error;
        }
    }
    /**
     * Wait for transaction confirmation
     */
    async waitForTransaction(transactionHash, confirmations = 1) {
        try {
            const receipt = await this.provider.waitForTransaction(transactionHash, confirmations);
            logger_1.logger.info(`Transaction confirmed: ${transactionHash}`);
            return {
                confirmed: true,
                blockNumber: receipt?.blockNumber,
                gasUsed: receipt?.gasUsed.toString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to wait for transaction', error);
            throw error;
        }
    }
    /**
     * Get contract state snapshot
     */
    async getContractState() {
        try {
            const blockNumber = await this.provider.getBlockNumber();
            const feeData = await this.provider.getFeeData();
            return {
                blockNumber,
                gasPrice: feeData?.gasPrice?.toString() || '0',
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get contract state', error);
            throw error;
        }
    }
}
exports.SmartContractService = SmartContractService;
// Export factory function
function initializeContractService(config) {
    return new SmartContractService(config);
}
exports.default = SmartContractService;
//# sourceMappingURL=contracts.js.map