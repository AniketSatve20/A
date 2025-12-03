"use strict";
/**
 * Filecoin Storage Integration
 * Provides persistent decentralized storage using NFT.storage (Filecoin + IPFS)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilecoinStorageService = void 0;
exports.createFilecoinService = createFilecoinService;
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../logger");
class FilecoinStorageService {
    constructor(apiKey, cachePath) {
        this.apiUrl = 'https://api.nft.storage';
        this.apiKey = apiKey || process.env.NFT_STORAGE_KEY || '';
        this.localCachePath = cachePath || path_1.default.join(process.cwd(), '.cache/storage');
        if (!this.apiKey) {
            logger_1.logger.warn('⚠️  NFT_STORAGE_KEY not set - Filecoin uploads will be disabled');
        }
        // Create cache directory
        if (!fs_1.default.existsSync(this.localCachePath)) {
            fs_1.default.mkdirSync(this.localCachePath, { recursive: true });
        }
    }
    /**
     * Upload file to Filecoin via NFT.storage (includes IPFS pinning)
     */
    async uploadFile(fileBuffer, filename, mimeType = 'application/octet-stream') {
        try {
            if (!this.apiKey) {
                throw new Error('NFT_STORAGE_KEY not configured');
            }
            logger_1.logger.info(`📤 Uploading to Filecoin: ${filename} (${fileBuffer.length} bytes)`);
            // Create FormData
            const form = new form_data_1.default();
            form.append('file', fileBuffer, {
                filename,
                contentType: mimeType,
            });
            // Upload to NFT.storage
            const response = await fetch(`${this.apiUrl}/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: form,
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Upload failed: ${response.statusText} - ${error}`);
            }
            const result = (await response.json());
            const ipfsCid = result.value.cid;
            logger_1.logger.info(`✅ File uploaded to Filecoin - IPFS CID: ${ipfsCid}`);
            // Get storage status
            const metadata = await this.getStorageMetadata(ipfsCid, filename, fileBuffer, mimeType);
            // Cache locally
            await this.cacheLocally(ipfsCid, fileBuffer);
            return {
                success: true,
                ipfsCid,
                storageUrl: `https://${ipfsCid}.ipfs.nft.storage`,
                metadata,
                deals: metadata.filecoinDeals || [],
            };
        }
        catch (error) {
            logger_1.logger.error('Filecoin upload failed', error);
            throw error;
        }
    }
    /**
     * Upload file from path to Filecoin
     */
    async uploadFileFromPath(filePath, customName) {
        try {
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            const fileBuffer = fs_1.default.readFileSync(filePath);
            const filename = customName || path_1.default.basename(filePath);
            const mimeType = this.getMimeType(filePath);
            return await this.uploadFile(fileBuffer, filename, mimeType);
        }
        catch (error) {
            logger_1.logger.error('Failed to upload file from path', error);
            throw error;
        }
    }
    /**
     * Upload stream to Filecoin
     */
    async uploadStream(stream, filename, mimeType = 'application/octet-stream') {
        try {
            const chunks = [];
            return new Promise((resolve, reject) => {
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', async () => {
                    try {
                        const fileBuffer = Buffer.concat(chunks);
                        const result = await this.uploadFile(fileBuffer, filename, mimeType);
                        resolve(result);
                    }
                    catch (error) {
                        reject(error);
                    }
                });
                stream.on('error', reject);
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to upload stream', error);
            throw error;
        }
    }
    /**
     * Get storage metadata and Filecoin deal information
     */
    async getStorageMetadata(ipfsCid, filename, fileBuffer, mimeType) {
        try {
            const contentHash = this.calculateHash(fileBuffer);
            // Check status via NFT.storage API
            let filecoinDeals = [];
            let retrieval = {
                ipfs: true, // Always pinned to IPFS via NFT.storage
                filecoin: false,
                pinned: true,
            };
            if (this.apiKey) {
                try {
                    const statusResponse = await fetch(`${this.apiUrl}/${ipfsCid}`, {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                        },
                    });
                    if (statusResponse.ok) {
                        const statusData = (await statusResponse.json());
                        // Extract Filecoin deal info
                        if (statusData?.value?.deals) {
                            filecoinDeals = statusData.value.deals.map((deal) => ({
                                dealId: deal.dealId || 'pending',
                                provider: deal.provider || 'unknown',
                                status: deal.status || 'pending',
                                expirationEpoch: deal.expiration || 0,
                                pricePerEpoch: deal.pricePerEpoch || '0',
                            }));
                            retrieval.filecoin = filecoinDeals.length > 0;
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`Could not fetch storage status for ${ipfsCid}`, error);
                }
            }
            return {
                filename,
                size: fileBuffer.length,
                mimeType,
                uploadedAt: Date.now(),
                ipfsCid,
                filecoinDeals,
                contentHash,
                retrieval,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get storage metadata', error);
            throw error;
        }
    }
    /**
     * Retrieve file from Filecoin/IPFS
     */
    async retrieveFile(ipfsCid) {
        try {
            logger_1.logger.info(`📥 Retrieving file from IPFS: ${ipfsCid}`);
            // Try local cache first
            const cachedFile = await this.getFromCache(ipfsCid);
            if (cachedFile) {
                logger_1.logger.info(`✅ File retrieved from local cache: ${ipfsCid}`);
                return cachedFile;
            }
            // Retrieve from IPFS gateway
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(`https://${ipfsCid}.ipfs.nft.storage`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Retrieval failed: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(arrayBuffer);
            // Cache locally
            await this.cacheLocally(ipfsCid, fileBuffer);
            logger_1.logger.info(`✅ File retrieved from IPFS: ${ipfsCid}`);
            return fileBuffer;
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve file', error);
            throw error;
        }
    }
    /**
     * Check if file is available on Filecoin
     */
    async checkFilecoinAvailability(ipfsCid) {
        try {
            if (!this.apiKey) {
                return {
                    available: false,
                    deals: [],
                    providers: [],
                };
            }
            const response = await fetch(`${this.apiUrl}/${ipfsCid}`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                return {
                    available: false,
                    deals: [],
                    providers: [],
                };
            }
            const data = (await response.json());
            const deals = data.value?.deals || [];
            const providers = [...new Set(deals.map((d) => d.provider))];
            return {
                available: deals.length > 0,
                deals: deals.map((d) => ({
                    dealId: d.dealId,
                    provider: d.provider,
                    status: d.status,
                    expirationEpoch: d.expiration,
                    pricePerEpoch: d.pricePerEpoch,
                })),
                providers,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to check Filecoin availability', error);
            return {
                available: false,
                deals: [],
                providers: [],
            };
        }
    }
    /**
     * Get list of stored files
     */
    async listStoredFiles() {
        try {
            if (!this.apiKey) {
                return { cids: [], count: 0 };
            }
            const response = await fetch(`${this.apiUrl}/`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to list stored files');
            }
            const data = (await response.json());
            const cids = (data.value?.map((item) => item.cid) || []);
            return {
                cids,
                count: cids.length,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to list stored files', error);
            return { cids: [], count: 0 };
        }
    }
    /**
     * Delete file from NFT.storage
     */
    async deleteFile(ipfsCid) {
        try {
            if (!this.apiKey) {
                logger_1.logger.warn('Cannot delete - NFT_STORAGE_KEY not configured');
                return false;
            }
            const response = await fetch(`${this.apiUrl}/${ipfsCid}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }
            // Remove from local cache
            await this.removeFromCache(ipfsCid);
            logger_1.logger.info(`🗑️  File deleted: ${ipfsCid}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete file', error);
            return false;
        }
    }
    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            const files = await this.listStoredFiles();
            let totalSize = 0;
            let providers = 0;
            for (const cid of files.cids) {
                try {
                    const availability = await this.checkFilecoinAvailability(cid);
                    totalSize += 0; // Size info not available via API
                    providers += availability.providers.length;
                }
                catch (error) {
                    // Continue
                }
            }
            const cacheSize = this.getCacheSize();
            return {
                totalFiles: files.count,
                totalSize,
                providers: Math.min(providers, 10), // Filecoin replication factor
                cacheSize,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get storage stats', error);
            return {
                totalFiles: 0,
                totalSize: 0,
                providers: 0,
                cacheSize: 0,
            };
        }
    }
    /**
     * Private helper: Calculate content hash
     */
    calculateHash(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
    /**
     * Private helper: Get MIME type
     */
    getMimeType(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.zip': 'application/zip',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    /**
     * Private helper: Cache file locally
     */
    async cacheLocally(ipfsCid, fileBuffer) {
        try {
            const cachePath = path_1.default.join(this.localCachePath, ipfsCid);
            fs_1.default.writeFileSync(cachePath, fileBuffer);
            logger_1.logger.debug(`✅ File cached locally: ${ipfsCid}`);
        }
        catch (error) {
            logger_1.logger.warn(`Failed to cache file locally: ${ipfsCid}`, error);
        }
    }
    /**
     * Private helper: Get file from cache
     */
    async getFromCache(ipfsCid) {
        try {
            const cachePath = path_1.default.join(this.localCachePath, ipfsCid);
            if (fs_1.default.existsSync(cachePath)) {
                return fs_1.default.readFileSync(cachePath);
            }
            return null;
        }
        catch (error) {
            logger_1.logger.warn(`Failed to get file from cache: ${ipfsCid}`, error);
            return null;
        }
    }
    /**
     * Private helper: Remove file from cache
     */
    async removeFromCache(ipfsCid) {
        try {
            const cachePath = path_1.default.join(this.localCachePath, ipfsCid);
            if (fs_1.default.existsSync(cachePath)) {
                fs_1.default.unlinkSync(cachePath);
            }
        }
        catch (error) {
            logger_1.logger.warn(`Failed to remove file from cache: ${ipfsCid}`, error);
        }
    }
    /**
     * Private helper: Get total cache size
     */
    getCacheSize() {
        try {
            let totalSize = 0;
            const files = fs_1.default.readdirSync(this.localCachePath);
            for (const file of files) {
                const filePath = path_1.default.join(this.localCachePath, file);
                const stats = fs_1.default.statSync(filePath);
                totalSize += stats.size;
            }
            return totalSize;
        }
        catch (error) {
            logger_1.logger.warn('Failed to calculate cache size', error);
            return 0;
        }
    }
}
exports.FilecoinStorageService = FilecoinStorageService;
/**
 * Factory function to create service instance
 */
function createFilecoinService(apiKey, cachePath) {
    return new FilecoinStorageService(apiKey, cachePath);
}
exports.default = FilecoinStorageService;
//# sourceMappingURL=filecoin.js.map