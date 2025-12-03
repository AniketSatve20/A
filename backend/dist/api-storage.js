"use strict";
/**
 * Storage API Endpoints
 * Handles file uploads and retrievals with Filecoin integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const filecoin_1 = require("./modules/storage/filecoin");
const logger_1 = require("./logger");
const router = express_1.default.Router();
// Initialize Filecoin service
const filecoinService = new filecoin_1.FilecoinStorageService();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now
        cb(null, true);
    },
});
// Store upload progress
const uploadProgress = new Map();
/**
 * POST /api/storage/upload
 * Upload file to Filecoin
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        const { fileName, projectId, disputeId, category } = req.body;
        const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        logger_1.logger.info(`📤 Starting file upload: ${req.file.originalname} (${req.file.size} bytes)`);
        // Upload to Filecoin
        const result = await filecoinService.uploadFile(req.file.buffer, fileName || req.file.originalname, req.file.mimetype);
        // Log the upload
        logger_1.logger.info(`✅ File uploaded successfully - CID: ${result.ipfsCid}`);
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
    }
    catch (error) {
        logger_1.logger.error('Upload failed', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message,
        });
    }
});
/**
 * POST /api/storage/upload/multi
 * Upload multiple files
 */
router.post('/upload/multi', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }
        const uploadResults = [];
        for (const file of req.files) {
            try {
                const result = await filecoinService.uploadFile(file.buffer, file.originalname, file.mimetype);
                uploadResults.push({
                    filename: file.originalname,
                    ipfsCid: result.ipfsCid,
                    storageUrl: result.storageUrl,
                    size: file.size,
                    success: true,
                });
            }
            catch (error) {
                uploadResults.push({
                    filename: file.originalname,
                    error: error.message,
                    success: false,
                });
            }
        }
        const successCount = uploadResults.filter((r) => r.success).length;
        logger_1.logger.info(`✅ Multi-file upload completed: ${successCount}/${req.files.length} successful`);
        res.json({
            success: successCount === uploadResults.length,
            uploadedCount: successCount,
            failedCount: uploadResults.length - successCount,
            results: uploadResults,
        });
    }
    catch (error) {
        logger_1.logger.error('Multi-file upload failed', error);
        res.status(500).json({
            error: 'Multi-file upload failed',
            message: error.message,
        });
    }
});
/**
 * GET /api/storage/list
 * List all stored files
 */
router.get('/list', async (req, res) => {
    try {
        const files = await filecoinService.listStoredFiles();
        logger_1.logger.info(`📁 Listed ${files.count} stored files`);
        res.json({
            count: files.count,
            cids: files.cids,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to list files', error);
        res.status(500).json({
            error: 'Failed to list files',
            message: error.message,
        });
    }
});
/**
 * GET /api/storage/stats
 * Get storage statistics
 */
router.get('/stats', async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get storage stats', error);
        res.status(500).json({
            error: 'Failed to get storage stats',
            message: error.message,
        });
    }
});
/**
 * GET /api/storage/:cid
 * Retrieve file from Filecoin
 */
router.get('/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        logger_1.logger.info(`📥 Retrieving file: ${cid}`);
        // Validate CID format
        if (!cid.match(/^Qm[a-zA-Z0-9]{44}$/)) {
            return res.status(400).json({ error: 'Invalid CID format' });
        }
        const fileBuffer = await filecoinService.retrieveFile(cid);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
        res.send(fileBuffer);
        logger_1.logger.info(`✅ File retrieved: ${cid}`);
    }
    catch (error) {
        logger_1.logger.error('File retrieval failed', error);
        res.status(500).json({
            error: 'File retrieval failed',
            message: error.message,
        });
    }
});
/**
 * GET /api/storage/:cid/metadata
 * Get file metadata and Filecoin deal info
 */
router.get('/:cid/metadata', async (req, res) => {
    try {
        const { cid } = req.params;
        logger_1.logger.info(`📋 Getting metadata for: ${cid}`);
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
    }
    catch (error) {
        logger_1.logger.error('Failed to get metadata', error);
        res.status(500).json({
            error: 'Failed to get metadata',
            message: error.message,
        });
    }
});
/**
 * GET /api/storage/:cid/status
 * Check file availability across networks
 */
router.get('/:cid/status', async (req, res) => {
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
    }
    catch (error) {
        logger_1.logger.error('Failed to check status', error);
        res.status(500).json({
            error: 'Failed to check status',
            message: error.message,
        });
    }
});
/**
 * DELETE /api/storage/:cid
 * Delete file from Filecoin
 */
router.delete('/:cid', async (req, res) => {
    try {
        const { cid } = req.params;
        logger_1.logger.info(`🗑️  Deleting file: ${cid}`);
        const success = await filecoinService.deleteFile(cid);
        if (!success) {
            return res.status(500).json({ error: 'Failed to delete file' });
        }
        res.json({
            success: true,
            cid,
            message: 'File deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete file', error);
        res.status(500).json({
            error: 'Failed to delete file',
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=api-storage.js.map