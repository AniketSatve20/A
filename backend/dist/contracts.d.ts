/**
 * Smart Contract Integration Service
 * Handles interactions with deployed HumanWork Protocol contracts
 */
export interface ContractConfig {
    projectEscrowAddress: string;
    disputeJuryAddress: string;
    userRegistryAddress: string;
    providerUrl: string;
    privateKey?: string;
}
export declare class SmartContractService {
    private escrowContract;
    private juryContract;
    private userRegistryContract;
    private provider;
    private signer;
    constructor(config: ContractConfig);
    /**
     * Create a new project on-chain
     */
    createProject(clientAddress: string, freelancerId: number, totalAmount: string, description: string): Promise<{
        success: boolean;
        transactionHash: any;
        blockNumber: any;
    }>;
    /**
     * Add milestone to project
     */
    addMilestone(projectId: number, amount: string, description: string): Promise<{
        success: boolean;
        transactionHash: any;
    }>;
    /**
     * Complete milestone
     */
    completeMilestone(projectId: number, milestoneId: number): Promise<{
        success: boolean;
        transactionHash: any;
    }>;
    /**
     * Create dispute on-chain
     */
    createDispute(projectId: number, milestoneId: number, evidence: string): Promise<{
        success: boolean;
        transactionHash: any;
        blockNumber: any;
    }>;
    /**
     * Submit jury vote on dispute
     */
    submitVote(disputeId: number, forFreelancer: boolean): Promise<{
        success: boolean;
        transactionHash: any;
    }>;
    /**
     * Get dispute resolution from contract
     */
    getDisputeResolution(disputeId: number): Promise<{
        outcome: string;
        outcodeCode: any;
    }>;
    /**
     * Get user reputation from contract
     */
    getUserReputation(userAddress: string): Promise<{
        userAddress: string;
        reputation: any;
    }>;
    /**
     * Update user reputation on-chain
     */
    updateUserReputation(userAddress: string, newScore: number): Promise<{
        success: boolean;
        transactionHash: any;
    }>;
    /**
     * Estimate gas for transaction
     */
    estimateGas(functionName: string, args: any[]): Promise<{
        gasEstimate: any;
        gasPrice: string;
        estimatedCost: string;
    }>;
    /**
     * Wait for transaction confirmation
     */
    waitForTransaction(transactionHash: string, confirmations?: number): Promise<{
        confirmed: boolean;
        blockNumber: number | undefined;
        gasUsed: string | undefined;
    }>;
    /**
     * Get contract state snapshot
     */
    getContractState(): Promise<{
        blockNumber: number;
        gasPrice: string;
        timestamp: string;
    }>;
}
export declare function initializeContractService(config: ContractConfig): SmartContractService;
export default SmartContractService;
//# sourceMappingURL=contracts.d.ts.map