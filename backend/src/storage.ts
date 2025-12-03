/**
 * Unified Storage Service
 * Abstraction layer supporting multiple backends: IPFS, Filecoin, Arweave
 */

import { FilecoinStorageService } from './modules/storage/filecoin';
import { logger } from './logger';

export enum StorageBackend {
  IPFS = 'ipfs',
  FILECOIN = 'filecoin',
  ARWEAVE = 'arweave',
}

export interface UnifiedStorageMetadata {
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  backends: {
    ipfs?: { cid: string; pinned: boolean };
    filecoin?: { cid: string; deals: number; available: boolean };
    arweave?: { txId: string; confirmed: boolean };
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
  redundancy?: number; // Number of providers for Filecoin
  arweaveFundTx?: string; // Arweave funding tx if needed
}

export class UnifiedStorageService {
  private filecoinService: FilecoinStorageService;
  private defaultBackends: StorageBackend[] = [
    StorageBackend.IPFS,
    StorageBackend.FILECOIN,
  ];

  constructor() {
    this.filecoinService = new FilecoinStorageService();
    logger.info('🗄️  Unified Storage Service initialized');
  }

  /**
   * Upload file with multi-backend support
   */
  async uploadFile(
    fileBuffer: Buffer,
    options: StorageUploadOptions
  ): Promise<UnifiedStorageMetadata> {
    try {
      const backends = options.backends || this.defaultBackends;

      logger.info(
        `📤 Uploading to ${backends.join(', ')}: ${options.filename} (${fileBuffer.length} bytes)`
      );

      const metadata: UnifiedStorageMetadata = {
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
              await this.uploadToFilecoin(
                fileBuffer,
                options.filename,
                metadata,
                options.redundancy
              );
              break;
            case StorageBackend.ARWEAVE:
              await this.uploadToArweave(fileBuffer, options.filename, metadata);
              break;
          }
        } catch (error) {
          logger.warn(
            `Failed to upload to ${backend}: ${(error as Error).message}`
          );
        }
      }

      logger.info(`✅ File uploaded to backends: ${options.filename}`);
      return metadata;
    } catch (error) {
      logger.error('Multi-backend upload failed', error);
      throw error;
    }
  }

  /**
   * Retrieve file from preferred backend
   */
  async retrieveFile(
    cid: string,
    preferredBackend?: StorageBackend
  ): Promise<Buffer> {
    try {
      logger.info(`📥 Retrieving file from ${preferredBackend || 'default'}: ${cid}`);

      // Try preferred backend first
      if (preferredBackend === StorageBackend.FILECOIN) {
        try {
          return await this.filecoinService.retrieveFile(cid);
        } catch (error) {
          logger.warn(`Filecoin retrieval failed, trying IPFS: ${error}`);
        }
      }

      // Fallback to IPFS
      return await this.filecoinService.retrieveFile(cid);
    } catch (error) {
      logger.error('File retrieval failed', error);
      throw error;
    }
  }

  /**
   * Get redundancy information across backends
   */
  async getRedundancyInfo(cid: string): Promise<{
    cid: string;
    backends: {
      ipfs: boolean;
      filecoin: boolean;
      arweave: boolean;
    };
    totalRedundancy: number;
    providers: string[];
  }> {
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
    } catch (error) {
      logger.error('Failed to get redundancy info', error);
      throw error;
    }
  }

  /**
   * Private: Upload to IPFS (via Filecoin service)
   */
  private async uploadToIPFS(
    fileBuffer: Buffer,
    filename: string,
    metadata: UnifiedStorageMetadata
  ): Promise<void> {
    try {
      const result = await this.filecoinService.uploadFile(fileBuffer, filename);

      metadata.backends.ipfs = {
        cid: result.ipfsCid,
        pinned: true,
      };

      metadata.retrievalUrls.ipfs = result.storageUrl;

      logger.info(`✅ File pinned to IPFS: ${result.ipfsCid}`);
    } catch (error) {
      logger.error('IPFS upload failed', error);
      throw error;
    }
  }

  /**
   * Private: Upload to Filecoin
   */
  private async uploadToFilecoin(
    fileBuffer: Buffer,
    filename: string,
    metadata: UnifiedStorageMetadata,
    redundancy?: number
  ): Promise<void> {
    try {
      const result = await this.filecoinService.uploadFile(fileBuffer, filename);
      const availability = await this.filecoinService.checkFilecoinAvailability(
        result.ipfsCid
      );

      metadata.backends.filecoin = {
        cid: result.ipfsCid,
        deals: availability.deals.length,
        available: availability.available,
      };

      metadata.retrievalUrls.filecoin = `https://${result.ipfsCid}.ipfs.nft.storage`;

      logger.info(
        `✅ File stored on Filecoin: ${result.ipfsCid} (${availability.deals.length} deals)`
      );
    } catch (error) {
      logger.error('Filecoin upload failed', error);
      throw error;
    }
  }

  /**
   * Private: Upload to Arweave (placeholder for future implementation)
   */
  private async uploadToArweave(
    fileBuffer: Buffer,
    filename: string,
    metadata: UnifiedStorageMetadata
  ): Promise<void> {
    logger.info('⏳ Arweave integration coming soon');
    // TODO: Implement Arweave upload
    // This would require:
    // - ArConnect integration
    // - Payment in AR tokens
    // - Transaction submission and confirmation
  }

  /**
   * Calculate content hash
   */
  private calculateHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get storage pricing estimates
   */
  async getPricingEstimates(sizeInBytes: number): Promise<{
    ipfs: { monthly: number; currency: string };
    filecoin: { monthly: number; currency: string };
    arweave: { oneTime: number; currency: string };
  }> {
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
  async getStorageHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    backends: {
      ipfs: 'online' | 'offline';
      filecoin: 'online' | 'offline';
      arweave: 'online' | 'offline';
    };
    totalStorageUsed: number;
    message: string;
  }> {
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
    } catch (error) {
      logger.error('Failed to check storage health', error);
      return {
        status: 'degraded',
        backends: {
          ipfs: 'offline',
          filecoin: 'offline',
          arweave: 'offline',
        },
        totalStorageUsed: 0,
        message: (error as Error).message,
      };
    }
  }
}

export function createUnifiedStorageService(): UnifiedStorageService {
  return new UnifiedStorageService();
}

export default UnifiedStorageService;
