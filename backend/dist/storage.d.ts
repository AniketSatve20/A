/**
 * Unified Storage Service
 * Abstraction layer supporting multiple backends: IPFS, Filecoin, Arweave
 */
export declare enum StorageBackend {
    IPFS = "ipfs",
    FILECOIN = "filecoin",
    ARWEAVE = "arweave"
}
export interface UnifiedStorageMetadata {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: number;
    backends: {
        ipfs?: {
            cid: string;
            pinned: boolean;
        };
        filecoin?: {
            cid: string;
            deals: number;
            available: boolean;
        };
        arweave?: {
            txId: string;
            confirmed: boolean;
        };
    };
    contentHash: string;
    retrievalUrls: {
        ipfs: string;
        filecoin: string;
        arweave?: string;
    };
}
export interface StorageUploadOptions {
    filename: string;
    backends?: StorageBackend[];
    redundancy?: number;
    arweaveFundTx?: string;
}
export declare class UnifiedStorageService {
    private filecoinService;
    private defaultBackends;
    constructor();
    /**
     * Upload file with multi-backend support
     */
    uploadFile(fileBuffer: Buffer, options: StorageUploadOptions): Promise<UnifiedStorageMetadata>;
    /**
     * Retrieve file from preferred backend
     */
    retrieveFile(cid: string, preferredBackend?: StorageBackend): Promise<Buffer>;
    /**
     * Get redundancy information across backends
     */
    getRedundancyInfo(cid: string): Promise<{
        cid: string;
        backends: {
            ipfs: boolean;
            filecoin: boolean;
            arweave: boolean;
        };
        totalRedundancy: number;
        providers: string[];
    }>;
    /**
     * Private: Upload to IPFS (via Filecoin service)
     */
    private uploadToIPFS;
    /**
     * Private: Upload to Filecoin
     */
    private uploadToFilecoin;
    /**
     * Private: Upload to Arweave (placeholder for future implementation)
     */
    private uploadToArweave;
    /**
     * Calculate content hash
     */
    private calculateHash;
    /**
     * Get storage pricing estimates
     */
    getPricingEstimates(sizeInBytes: number): Promise<{
        ipfs: {
            monthly: number;
            currency: string;
        };
        filecoin: {
            monthly: number;
            currency: string;
        };
        arweave: {
            oneTime: number;
            currency: string;
        };
    }>;
    /**
     * Get overall storage health
     */
    getStorageHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'offline';
        backends: {
            ipfs: 'online' | 'offline';
            filecoin: 'online' | 'offline';
            arweave: 'online' | 'offline';
        };
        totalStorageUsed: number;
        message: string;
    }>;
}
export declare function createUnifiedStorageService(): UnifiedStorageService;
export default UnifiedStorageService;
//# sourceMappingURL=storage.d.ts.map