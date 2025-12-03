/**
 * Storage API Endpoints
 * Handles file uploads and retrievals with Filecoin integration
 */

import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { FilecoinStorageService } from './modules/storage/filecoin';
import { logger } from './logger';

const router = express.Router();

// Initialize Filecoin service
const filecoinService = new FilecoinStorageService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  },
});

// Store upload progress
const uploadProgress = new Map<string, { progress: number; total: number }>();

/**
 * POST /api/storage/upload
 * Upload file to Filecoin
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { fileName, projectId, disputeId, category } = req.body;
    const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`📤 Starting file upload: ${req.file.originalname} (${req.file.size} bytes)`);

    // Upload to Filecoin
    const result = await filecoinService.uploadFile(
      req.file.buffer,
      fileName || req.file.originalname,
      req.file.mimetype
    );

    // Log the upload
    logger.info(`✅ File uploaded successfully - CID: ${result.ipfsCid}`);

    res.json({
      success: true,
      uploadId,
      ipfsCid: result.ipfsCid,
      storageUrl: result.storageUrl,
      size: req.file.size,
      metadata: result.metadata,
      filecoinDeals: result.deals,
      retrieval: result.metadata.retrieval,
    });
  } catch (error) {
    logger.error('Upload failed', error);
    res.status(500).json({
      error: 'Upload failed',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/storage/upload/multi
 * Upload multiple files
 */
router.post('/upload/multi', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadResults = [];

    for (const file of req.files as Express.Multer.File[]) {
      try {
        const result = await filecoinService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        uploadResults.push({
          filename: file.originalname,
          ipfsCid: result.ipfsCid,
          storageUrl: result.storageUrl,
          size: file.size,
          success: true,
        });
      } catch (error) {
        uploadResults.push({
          filename: file.originalname,
          error: (error as Error).message,
          success: false,
        });
      }
    }

    const successCount = uploadResults.filter((r) => r.success).length;
    logger.info(`✅ Multi-file upload completed: ${successCount}/${req.files.length} successful`);

    res.json({
      success: successCount === uploadResults.length,
      uploadedCount: successCount,
      failedCount: uploadResults.length - successCount,
      results: uploadResults,
    });
  } catch (error) {
    logger.error('Multi-file upload failed', error);
    res.status(500).json({
      error: 'Multi-file upload failed',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/storage/list
 * List all stored files
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const files = await filecoinService.listStoredFiles();

    logger.info(`📁 Listed ${files.count} stored files`);

    res.json({
      count: files.count,
      cids: files.cids,
    });
  } catch (error) {
    logger.error('Failed to list files', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await filecoinService.getStorageStats();

    res.json({
      storage: {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        providers: stats.providers,
        cacheSize: stats.cacheSize,
      },
      network: {
        ipfs: 'pinned',
        filecoin: 'active',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get storage stats', error);
    res.status(500).json({
      error: 'Failed to get storage stats',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/storage/:cid
 * Retrieve file from Filecoin
 */
router.get('/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    logger.info(`📥 Retrieving file: ${cid}`);

    // Validate CID format
    if (!cid.match(/^Qm[a-zA-Z0-9]{44}$/)) {
      return res.status(400).json({ error: 'Invalid CID format' });
    }

    const fileBuffer = await filecoinService.retrieveFile(cid);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    res.send(fileBuffer);

    logger.info(`✅ File retrieved: ${cid}`);
  } catch (error) {
    logger.error('File retrieval failed', error);
    res.status(500).json({
      error: 'File retrieval failed',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/storage/:cid/metadata
 * Get file metadata and Filecoin deal info
 */
router.get('/:cid/metadata', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    logger.info(`📋 Getting metadata for: ${cid}`);

    const availability = await filecoinService.checkFilecoinAvailability(cid);

    res.json({
      cid,
      availability: availability.available,
      filecoinDeals: availability.deals,
      providers: availability.providers,
      retrieval: {
        ipfs: true,
        filecoin: availability.available,
      },
    });
  } catch (error) {
    logger.error('Failed to get metadata', error);
    res.status(500).json({
      error: 'Failed to get metadata',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/storage/:cid/status
 * Check file availability across networks
 */
router.get('/:cid/status', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    const availability = await filecoinService.checkFilecoinAvailability(cid);

    res.json({
      cid,
      status: {
        ipfs: 'available',
        filecoin: availability.available ? 'available' : 'pending',
        pinned: true,
      },
      deals: availability.deals,
      providers: availability.providers,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to check status', error);
    res.status(500).json({
      error: 'Failed to check status',
      message: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/storage/:cid
 * Delete file from Filecoin
 */
router.delete('/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    logger.info(`🗑️  Deleting file: ${cid}`);

    const success = await filecoinService.deleteFile(cid);

    if (!success) {
      return res.status(500).json({ error: 'Failed to delete file' });
    }

    res.json({
      success: true,
      cid,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete file', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: (error as Error).message,
    });
  }
});

export default router;
