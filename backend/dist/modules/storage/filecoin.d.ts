/**
 * Filecoin Storage Integration
 * Provides persistent decentralized storage using NFT.storage (Filecoin + IPFS)
 */
import { Readable } from 'stream';
export interface StorageMetadata {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: number;
    ipfsCid: string;
    filecoinDeals?: FilecoinDeal[];
    contentHash: string;
    retrieval: {
        ipfs: boolean;
        filecoin: boolean;
        pinned: boolean;
    };
}
export interface FilecoinDeal {
    dealId: string;
    provider: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
    expirationEpoch: number;
    pricePerEpoch: string;
}
export interface UploadResult {
    success: boolean;
    ipfsCid: string;
    storageUrl: string;
    metadata: StorageMetadata;
    deals: FilecoinDeal[];
}
export declare class FilecoinStorageService {
    private apiKey;
    private apiUrl;
    private localCachePath;
    constructor(apiKey?: string, cachePath?: string);
    /**
     * Upload file to Filecoin via NFT.storage (includes IPFS pinning)
     */
    uploadFile(fileBuffer: Buffer, filename: string, mimeType?: string): Promise<UploadResult>;
    /**
     * Upload file from path to Filecoin
     */
    uploadFileFromPath(filePath: string, customName?: string): Promise<UploadResult>;
    /**
     * Upload stream to Filecoin
     */
    uploadStream(stream: Readable, filename: string, mimeType?: string): Promise<UploadResult>;
    /**
     * Get storage metadata and Filecoin deal information
     */
    getStorageMetadata(ipfsCid: string, filename: string, fileBuffer: Buffer, mimeType: string): Promise<StorageMetadata>;
    /**
     * Retrieve file from Filecoin/IPFS
     */
    retrieveFile(ipfsCid: string): Promise<Buffer>;
    /**
     * Check if file is available on Filecoin
     */
    checkFilecoinAvailability(ipfsCid: string): Promise<{
        available: boolean;
        deals: FilecoinDeal[];
        providers: string[];
    }>;
    /**
     * Get list of stored files
     */
    listStoredFiles(): Promise<{
        cids: string[];
        count: number;
    }>;
    /**
     * Delete file from NFT.storage
     */
    deleteFile(ipfsCid: string): Promise<boolean>;
    /**
     * Get storage statistics
     */
    getStorageStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        providers: number;
        cacheSize: number;
    }>;
    /**
     * Private helper: Calculate content hash
     */
    private calculateHash;
    /**
     * Private helper: Get MIME type
     */
    private getMimeType;
    /**
     * Private helper: Cache file locally
     */
    private cacheLocally;
    /**
     * Private helper: Get file from cache
     */
    private getFromCache;
    /**
     * Private helper: Remove file from cache
     */
    private removeFromCache;
    /**
     * Private helper: Get total cache size
     */
    private getCacheSize;
}
/**
 * Factory function to create service instance
 */
export declare function createFilecoinService(apiKey?: string, cachePath?: string): FilecoinStorageService;
export default FilecoinStorageService;
//# sourceMappingURL=filecoin.d.ts.map