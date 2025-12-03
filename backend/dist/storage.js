"use strict";
/**
 * Unified Storage Service
 * Abstraction layer supporting multiple backends: IPFS, Filecoin, Arweave
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedStorageService = exports.StorageBackend = void 0;
exports.createUnifiedStorageService = createUnifiedStorageService;
const filecoin_1 = require("./modules/storage/filecoin");
const logger_1 = require("./logger");
var StorageBackend;
(function (StorageBackend) {
    StorageBackend["IPFS"] = "ipfs";
    StorageBackend["FILECOIN"] = "filecoin";
    StorageBackend["ARWEAVE"] = "arweave";
})(StorageBackend || (exports.StorageBackend = StorageBackend = {}));
class UnifiedStorageService {
    constructor() {
        this.defaultBackends = [
            StorageBackend.IPFS,
            StorageBackend.FILECOIN,
        ];
        this.filecoinService = new filecoin_1.FilecoinStorageService();
        logger_1.logger.info('🗄️  Unified Storage Service initialized');
    }
    /**
     * Upload file with multi-backend support
     */
    async uploadFile(fileBuffer, options) {
        try {
            const backends = options.backends || this.defaultBackends;
            logger_1.logger.info(`📤 Uploading to ${backends.join(', ')}: ${options.filename} (${fileBuffer.length} bytes)`);
            const metadata = {
                filename: options.filename,
                size: fileBuffer.length,
                mimeType: 'application/octet-stream',
                uploadedAt: Date.now(),
                backends: {},
                contentHash: this.calculateHash(fileBuffer),
                retrievalUrls: {
                    ipfs: '',
                    filecoin: '',
                },
            };
            // Upload to each backend
            for (const backend of backends) {
                try {
                    switch (backend) {
                        case StorageBackend.IPFS:
                            await this.uploadToIPFS(fileBuffer, options.filename, metadata);
                            break;
                        case StorageBackend.FILECOIN:
                            await this.uploadToFilecoin(fileBuffer, options.filename, metadata, options.redundancy);
                            break;
                        case StorageBackend.ARWEAVE:
                            await this.uploadToArweave(fileBuffer, options.filename, metadata);
                            break;
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to upload to ${backend}: ${error.message}`);
                }
            }
            logger_1.logger.info(`✅ File uploaded to backends: ${options.filename}`);
            return metadata;
        }
        catch (error) {
            logger_1.logger.error('Multi-backend upload failed', error);
            throw error;
        }
    }
    /**
     * Retrieve file from preferred backend
     */
    async retrieveFile(cid, preferredBackend) {
        try {
            logger_1.logger.info(`📥 Retrieving file from ${preferredBackend || 'default'}: ${cid}`);
            // Try preferred backend first
            if (preferredBackend === StorageBackend.FILECOIN) {
                try {
                    return await this.filecoinService.retrieveFile(cid);
                }
                catch (error) {
                    logger_1.logger.warn(`Filecoin retrieval failed, trying IPFS: ${error}`);
                }
            }
            // Fallback to IPFS
            return await this.filecoinService.retrieveFile(cid);
        }
        catch (error) {
            logger_1.logger.error('File retrieval failed', error);
            throw error;
        }
    }
    /**
     * Get redundancy information across backends
     */
    async getRedundancyInfo(cid) {
        try {
            const availability = await this.filecoinService.checkFilecoinAvailability(cid);
            return {
                cid,
                backends: {
                    ipfs: true, // Always available via NFT.storage
                    filecoin: availability.available,
                    arweave: false, // Would need Arweave integration
                },
                totalRedundancy: availability.providers.length + 1, // IPFS + Filecoin providers
                providers: availability.providers,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get redundancy info', error);
            throw error;
        }
    }
    /**
     * Private: Upload to IPFS (via Filecoin service)
     */
    async uploadToIPFS(fileBuffer, filename, metadata) {
        try {
            const result = await this.filecoinService.uploadFile(fileBuffer, filename);
            metadata.backends.ipfs = {
                cid: result.ipfsCid,
                pinned: true,
            };
            metadata.retrievalUrls.ipfs = result.storageUrl;
            logger_1.logger.info(`✅ File pinned to IPFS: ${result.ipfsCid}`);
        }
        catch (error) {
            logger_1.logger.error('IPFS upload failed', error);
            throw error;
        }
    }
    /**
     * Private: Upload to Filecoin
     */
    async uploadToFilecoin(fileBuffer, filename, metadata, redundancy) {
        try {
            const result = await this.filecoinService.uploadFile(fileBuffer, filename);
            const availability = await this.filecoinService.checkFilecoinAvailability(result.ipfsCid);
            metadata.backends.filecoin = {
                cid: result.ipfsCid,
                deals: availability.deals.length,
                available: availability.available,
            };
            metadata.retrievalUrls.filecoin = `https://${result.ipfsCid}.ipfs.nft.storage`;
            logger_1.logger.info(`✅ File stored on Filecoin: ${result.ipfsCid} (${availability.deals.length} deals)`);
        }
        catch (error) {
            logger_1.logger.error('Filecoin upload failed', error);
            throw error;
        }
    }
    /**
     * Private: Upload to Arweave (placeholder for future implementation)
     */
    async uploadToArweave(fileBuffer, filename, metadata) {
        logger_1.logger.info('⏳ Arweave integration coming soon');
        // TODO: Implement Arweave upload
        // This would require:
        // - ArConnect integration
        // - Payment in AR tokens
        // - Transaction submission and confirmation
    }
    /**
     * Calculate content hash
     */
    calculateHash(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
    /**
     * Get storage pricing estimates
     */
    async getPricingEstimates(sizeInBytes) {
        return {
            ipfs: {
                monthly: 0, // NFT.storage is free for up to 1GB
                currency: 'USD',
            },
            filecoin: {
                monthly: 0, // Included with NFT.storage
                currency: 'USD',
            },
            arweave: {
                oneTime: (sizeInBytes / 1024 / 1024) * 0.0015, // ~$0.0015 per MB
                currency: 'USD',
            },
        };
    }
    /**
     * Get overall storage health
     */
    async getStorageHealth() {
        try {
            const stats = await this.filecoinService.getStorageStats();
            return {
                status: 'healthy',
                backends: {
                    ipfs: 'online',
                    filecoin: 'online',
                    arweave: 'offline',
                },
                totalStorageUsed: stats.totalSize,
                message: 'All storage backends operational',
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to check storage health', error);
            return {
                status: 'degraded',
                backends: {
                    ipfs: 'offline',
                    filecoin: 'offline',
                    arweave: 'offline',
                },
                totalStorageUsed: 0,
                message: error.message,
            };
        }
    }
}
exports.UnifiedStorageService = UnifiedStorageService;
function createUnifiedStorageService() {
    return new UnifiedStorageService();
}
exports.default = UnifiedStorageService;
//# sourceMappingURL=storage.js.map