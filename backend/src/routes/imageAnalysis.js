'use strict';

const express = require('express');
const multer = require('multer');
const { runImageAnalysis } = require('../services/imageAnalysisService');
const { logger } = require('../utils/logger');
const { prisma } = require('../utils/prisma');

const router = express.Router();

// ─── Multer Configuration (memory storage, no disk writes) ───────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF.'));
        }
    },
});

// ─── POST /api/image-analysis/analyze ────────────────────────────────────────
/**
 * Analyze an uploaded image through Module 1:
 *   1. AI Generation Detection (gatekeeper)
 *   2. Forensic Captioning (only for real images)
 *
 * Body (multipart/form-data):
 *   - image        (required) — the image file
 *   - complaintId  (optional) — save result to Evidence table
 *   - uploaderId   (optional) — the citizen user ID
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: "No image file uploaded. Use multipart/form-data with field name 'image'.",
        });
    }

    const { complaintId, uploaderId } = req.body;

    logger.info(`[imageAnalysis] Received: ${req.file.originalname} | ${(req.file.size / 1024).toFixed(1)} KB | ${req.file.mimetype}`);

    try {
        const result = await runImageAnalysis(req.file.buffer, req.file.mimetype);

        // ─── Persist to DB if complaint context is provided ───────────────────
        let evidenceRecord = null;
        if (complaintId && uploaderId) {
            const forensic = result.forensicAnalysis || {};
            const analysisObj = forensic.analysis || {};

            evidenceRecord = await prisma.evidence.create({
                data: {
                    complaintId,
                    uploaderId,
                    fileName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    fileSizeBytes: req.file.size,
                    mediaCategory: 'IMAGE',

                    // AI detection fields
                    isAiGenerated: result.isAiGenerated,
                    aiConfidence: result.confidence ?? null,
                    aiDetectionReason: result.reason ?? null,

                    // Risk / overview from forensic caption
                    riskLevel: analysisObj.riskLevel ?? null,
                    riskReason: analysisObj.riskReason ?? null,
                    overview: forensic.overview ?? null,

                    // Full forensic payload
                    analysisJson: result.forensicAnalysis ? result.forensicAnalysis : undefined,
                    analysisStatus: 'COMPLETED',
                    processingTimeMs: result.processingTimeMs ?? null,
                },
            });

            logger.info(`[imageAnalysis] Evidence saved to DB. ID: ${evidenceRecord.id}`);
        } else {
            logger.info('[imageAnalysis] No complaintId/uploaderId provided — skipping DB save.');
        }

        return res.status(200).json({
            success: true,
            filename: req.file.originalname,
            filesize: req.file.size,
            module1: result,
            ...(evidenceRecord && { evidenceId: evidenceRecord.id }),
        });
    } catch (err) {
        logger.error('[imageAnalysis] Analysis failed:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message || 'Internal server error during image analysis.',
        });
    }
});

// ─── Multer error handler ─────────────────────────────────────────────────────
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next();
});

module.exports = router;
