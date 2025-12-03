/**
 * Filecoin Storage Integration
 * Provides persistent decentralized storage using NFT.storage (Filecoin + IPFS)
 */

import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { logger } from '../../logger';

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

export class FilecoinStorageService {
  private apiKey: string;
  private apiUrl: string = 'https://api.nft.storage';
  private localCachePath: string;

  constructor(apiKey?: string, cachePath?: string) {
    this.apiKey = apiKey || process.env.NFT_STORAGE_KEY || '';
    this.localCachePath = cachePath || path.join(process.cwd(), '.cache/storage');

    if (!this.apiKey) {
      logger.warn('⚠️  NFT_STORAGE_KEY not set - Filecoin uploads will be disabled');
    }

    // Create cache directory
    if (!fs.existsSync(this.localCachePath)) {
      fs.mkdirSync(this.localCachePath, { recursive: true });
    }
  }

  /**
   * Upload file to Filecoin via NFT.storage (includes IPFS pinning)
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<UploadResult> {
    try {
      if (!this.apiKey) {
        throw new Error('NFT_STORAGE_KEY not configured');
      }

      logger.info(`📤 Uploading to Filecoin: ${filename} (${fileBuffer.length} bytes)`);

      // Create FormData
      const form = new FormData();
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
        body: form as any,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${response.statusText} - ${error}`);
      }

      const result = (await response.json()) as any;
      const ipfsCid = result.value.cid;

      logger.info(`✅ File uploaded to Filecoin - IPFS CID: ${ipfsCid}`);

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
    } catch (error) {
      logger.error('Filecoin upload failed', error);
      throw error;
    }
  }

  /**
   * Upload file from path to Filecoin
   */
  async uploadFileFromPath(
    filePath: string,
    customName?: string
  ): Promise<UploadResult> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const filename = customName || path.basename(filePath);
      const mimeType = this.getMimeType(filePath);

      return await this.uploadFile(fileBuffer, filename, mimeType);
    } catch (error) {
      logger.error('Failed to upload file from path', error);
      throw error;
    }
  }

  /**
   * Upload stream to Filecoin
   */
  async uploadStream(
    stream: Readable,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<UploadResult> {
    try {
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', async () => {
          try {
            const fileBuffer = Buffer.concat(chunks);
            const result = await this.uploadFile(fileBuffer, filename, mimeType);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to upload stream', error);
      throw error;
    }
  }

  /**
   * Get storage metadata and Filecoin deal information
   */
  async getStorageMetadata(
    ipfsCid: string,
    filename: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<StorageMetadata> {
    try {
      const contentHash = this.calculateHash(fileBuffer);

      // Check status via NFT.storage API
      let filecoinDeals: FilecoinDeal[] = [];
      let retrieval = {
        ipfs: true, // Always pinned to IPFS via NFT.storage
        filecoin: false,
        pinned: true,
      };

      if (this.apiKey) {
        try {
          const statusResponse = await fetch(
            `${this.apiUrl}/${ipfsCid}`,
            {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
              },
            }
          );

          if (statusResponse.ok) {
            const statusData = (await statusResponse.json()) as any;

            // Extract Filecoin deal info
            if (statusData?.value?.deals) {
              filecoinDeals = statusData.value.deals.map((deal: any) => ({
                dealId: deal.dealId || 'pending',
                provider: deal.provider || 'unknown',
                status: deal.status || 'pending',
                expirationEpoch: deal.expiration || 0,
                pricePerEpoch: deal.pricePerEpoch || '0',
              }));

              retrieval.filecoin = filecoinDeals.length > 0;
            }
          }
        } catch (error) {
          logger.warn(`Could not fetch storage status for ${ipfsCid}`, error);
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
    } catch (error) {
      logger.error('Failed to get storage metadata', error);
      throw error;
    }
  }

  /**
   * Retrieve file from Filecoin/IPFS
   */
  async retrieveFile(ipfsCid: string): Promise<Buffer> {
    try {
      logger.info(`📥 Retrieving file from IPFS: ${ipfsCid}`);

      // Try local cache first
      const cachedFile = await this.getFromCache(ipfsCid);
      if (cachedFile) {
        logger.info(`✅ File retrieved from local cache: ${ipfsCid}`);
        return cachedFile;
      }

      // Retrieve from IPFS gateway
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(
        `https://${ipfsCid}.ipfs.nft.storage`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Retrieval failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Cache locally
      await this.cacheLocally(ipfsCid, fileBuffer);

      logger.info(`✅ File retrieved from IPFS: ${ipfsCid}`);
      return fileBuffer;
    } catch (error) {
      logger.error('Failed to retrieve file', error);
      throw error;
    }
  }

  /**
   * Check if file is available on Filecoin
   */
  async checkFilecoinAvailability(ipfsCid: string): Promise<{
    available: boolean;
    deals: FilecoinDeal[];
    providers: string[];
  }> {
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

      const data = (await response.json()) as any;
      const deals = data.value?.deals || [];
      const providers = [...new Set(deals.map((d: any) => d.provider))] as string[];

      return {
        available: deals.length > 0,
        deals: deals.map((d: any) => ({
          dealId: d.dealId,
          provider: d.provider,
          status: d.status,
          expirationEpoch: d.expiration,
          pricePerEpoch: d.pricePerEpoch,
        })),
        providers,
      };
    } catch (error) {
      logger.error('Failed to check Filecoin availability', error);
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
  async listStoredFiles(): Promise<{ cids: string[]; count: number }> {
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

      const data = (await response.json()) as any;
      const cids = (data.value?.map((item: any) => item.cid) || []) as string[];

      return {
        cids,
        count: cids.length,
      };
    } catch (error) {
      logger.error('Failed to list stored files', error);
      return { cids: [], count: 0 };
    }
  }

  /**
   * Delete file from NFT.storage
   */
  async deleteFile(ipfsCid: string): Promise<boolean> {
    try {
      if (!this.apiKey) {
        logger.warn('Cannot delete - NFT_STORAGE_KEY not configured');
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

      logger.info(`🗑️  File deleted: ${ipfsCid}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete file', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    providers: number;
    cacheSize: number;
  }> {
    try {
      const files = await this.listStoredFiles();

      let totalSize = 0;
      let providers = 0;

      for (const cid of files.cids) {
        try {
          const availability = await this.checkFilecoinAvailability(cid);
          totalSize += 0; // Size info not available via API
          providers += availability.providers.length;
        } catch (error) {
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
    } catch (error) {
      logger.error('Failed to get storage stats', error);
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
  private calculateHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Private helper: Get MIME type
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
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
  private async cacheLocally(ipfsCid: string, fileBuffer: Buffer): Promise<void> {
    try {
      const cachePath = path.join(this.localCachePath, ipfsCid);
      fs.writeFileSync(cachePath, fileBuffer);
      logger.debug(`✅ File cached locally: ${ipfsCid}`);
    } catch (error) {
      logger.warn(`Failed to cache file locally: ${ipfsCid}`, error);
    }
  }

  /**
   * Private helper: Get file from cache
   */
  private async getFromCache(ipfsCid: string): Promise<Buffer | null> {
    try {
      const cachePath = path.join(this.localCachePath, ipfsCid);
      if (fs.existsSync(cachePath)) {
        return fs.readFileSync(cachePath);
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to get file from cache: ${ipfsCid}`, error);
      return null;
    }
  }

  /**
   * Private helper: Remove file from cache
   */
  private async removeFromCache(ipfsCid: string): Promise<void> {
    try {
      const cachePath = path.join(this.localCachePath, ipfsCid);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } catch (error) {
      logger.warn(`Failed to remove file from cache: ${ipfsCid}`, error);
    }
  }

  /**
   * Private helper: Get total cache size
   */
  private getCacheSize(): number {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(this.localCachePath);
      for (const file of files) {
        const filePath = path.join(this.localCachePath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
      return totalSize;
    } catch (error) {
      logger.warn('Failed to calculate cache size', error);
      return 0;
    }
  }
}

/**
 * Factory function to create service instance
 */
export function createFilecoinService(
  apiKey?: string,
  cachePath?: string
): FilecoinStorageService {
  return new FilecoinStorageService(apiKey, cachePath);
}

export default FilecoinStorageService;
