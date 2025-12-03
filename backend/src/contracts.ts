/**
 * Smart Contract Integration Service
 * Handles interactions with deployed HumanWork Protocol contracts
 */

import { ethers } from 'ethers';
import { logger } from './logger';

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

// Interface for Contract Config
export interface ContractConfig {
  projectEscrowAddress: string;
  disputeJuryAddress: string;
  userRegistryAddress: string;
  providerUrl: string;
  privateKey?: string;
}

export class SmartContractService {
  private escrowContract: any;
  private juryContract: any;
  private userRegistryContract: any;
  private provider: ethers.JsonRpcProvider;
  private signer: any;

  constructor(config: ContractConfig) {
    this.provider = new ethers.JsonRpcProvider(config.providerUrl);
    
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    } else {
      this.signer = this.provider;
    }

    this.escrowContract = new ethers.Contract(
      config.projectEscrowAddress,
      PROJECT_ESCROW_ABI,
      this.signer
    );

    this.juryContract = new ethers.Contract(
      config.disputeJuryAddress,
      DISPUTE_JURY_ABI,
      this.signer
    );

    this.userRegistryContract = new ethers.Contract(
      config.userRegistryAddress,
      USER_REGISTRY_ABI,
      this.signer
    );

    logger.info('SmartContractService initialized');
  }

  /**
   * Create a new project on-chain
   */
  async createProject(
    clientAddress: string,
    freelancerId: number,
    totalAmount: string,
    description: string
  ) {
    try {
      const tx = await this.escrowContract.createProject(
        ethers.parseEther(totalAmount),
        freelancerId,
        description
      );
      
      const receipt = await tx.wait();
      logger.info(`Project created: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to create project', error);
      throw error;
    }
  }

  /**
   * Add milestone to project
   */
  async addMilestone(
    projectId: number,
    amount: string,
    description: string
  ) {
    try {
      const tx = await this.escrowContract.addMilestone(
        projectId,
        ethers.parseEther(amount),
        description
      );
      
      const receipt = await tx.wait();
      logger.info(`Milestone added: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      logger.error('Failed to add milestone', error);
      throw error;
    }
  }

  /**
   * Complete milestone
   */
  async completeMilestone(projectId: number, milestoneId: number) {
    try {
      const tx = await this.escrowContract.completeMilestone(projectId, milestoneId);
      const receipt = await tx.wait();
      logger.info(`Milestone completed: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      logger.error('Failed to complete milestone', error);
      throw error;
    }
  }

  /**
   * Create dispute on-chain
   */
  async createDispute(
    projectId: number,
    milestoneId: number,
    evidence: string
  ) {
    try {
      const tx = await this.juryContract.createDispute(
        projectId,
        milestoneId,
        evidence
      );
      
      const receipt = await tx.wait();
      logger.info(`Dispute created: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to create dispute', error);
      throw error;
    }
  }

  /**
   * Submit jury vote on dispute
   */
  async submitVote(disputeId: number, forFreelancer: boolean) {
    try {
      const tx = await this.juryContract.submitVote(disputeId, forFreelancer);
      const receipt = await tx.wait();
      logger.info(`Vote submitted: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      logger.error('Failed to submit vote', error);
      throw error;
    }
  }

  /**
   * Get dispute resolution from contract
   */
  async getDisputeResolution(disputeId: number) {
    try {
      const outcome = await this.juryContract.getDisputeResolution(disputeId);
      logger.info(`Dispute resolution fetched: ${disputeId}`);
      
      const outcomeMap: { [key: number]: string } = {
        0: 'PENDING',
        1: 'CLIENT_WIN',
        2: 'FREELANCER_WIN',
        3: 'PARTIAL_REFUND',
      };

      return {
        outcome: outcomeMap[outcome] || 'UNKNOWN',
        outcodeCode: outcome,
      };
    } catch (error) {
      logger.error('Failed to get dispute resolution', error);
      throw error;
    }
  }

  /**
   * Get user reputation from contract
   */
  async getUserReputation(userAddress: string) {
    try {
      const reputation = await this.userRegistryContract.getUserReputation(userAddress);
      logger.info(`User reputation fetched: ${userAddress}`);
      
      return {
        userAddress,
        reputation: reputation.toString(),
      };
    } catch (error) {
      logger.error('Failed to get user reputation', error);
      throw error;
    }
  }

  /**
   * Update user reputation on-chain
   */
  async updateUserReputation(userAddress: string, newScore: number) {
    try {
      const tx = await this.userRegistryContract.updateReputation(userAddress, newScore);
      const receipt = await tx.wait();
      logger.info(`User reputation updated: ${receipt.transactionHash}`);
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
      };
    } catch (error) {
      logger.error('Failed to update user reputation', error);
      throw error;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(functionName: string, args: any[]) {
    try {
      const contract = this.escrowContract;
      const gasEstimate = await contract[functionName].estimateGas(...args);
      const gasPrice = await this.provider.getFeeData();
      
      return {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice?.gasPrice?.toString() || '0',
        estimatedCost: ethers.formatEther((gasEstimate as any) * (gasPrice?.gasPrice || 0n)),
      };
    } catch (error) {
      logger.error('Failed to estimate gas', error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(transactionHash: string, confirmations: number = 1) {
    try {
      const receipt = await this.provider.waitForTransaction(transactionHash, confirmations);
      logger.info(`Transaction confirmed: ${transactionHash}`);
      
      return {
        confirmed: true,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      };
    } catch (error) {
      logger.error('Failed to wait for transaction', error);
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
    } catch (error) {
      logger.error('Failed to get contract state', error);
      throw error;
    }
  }
}

// Export factory function
export function initializeContractService(config: ContractConfig): SmartContractService {
  return new SmartContractService(config);
}

export default SmartContractService;
