'use strict';

const express = require('express');
const multer = require('multer');
const { runImageAnalysis } = require('../services/imageAnalysisService');
const { uploadToS3 } = require('../services/s3Service');
const { logger } = require('../utils/logger');
const { prisma } = require('../utils/prisma');

const router = express.Router();

// ─── Multer Configuration (memory storage, no disk writes) ───────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max (videos)
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        ];
        if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Allowed: images and videos.'));
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

    const isVideo = req.file.mimetype.startsWith('video/');

    // ─── Videos: skip AI analysis, upload to S3, save to DB ─────────────────
    if (isVideo) {
        logger.info('[imageAnalysis] Video file received — skipping AI analysis, uploading to S3.');

        let s3Data = null;
        let evidenceRecord = null;

        if (uploaderId) {
            try {
                s3Data = await uploadToS3(req.file.buffer, req.file.mimetype, req.file.originalname);
            } catch (s3Err) {
                logger.error(`[imageAnalysis] S3 upload failed for video: ${s3Err.message}`);
            }

            evidenceRecord = await prisma.evidence.create({
                data: {
                    complaintId: complaintId || null,
                    uploaderId,
                    fileName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    fileSizeBytes: req.file.size,
                    mediaCategory: 'VIDEO',
                    s3Key: s3Data?.s3Key ?? null,
                    s3Bucket: s3Data?.s3Bucket ?? null,
                    s3Region: s3Data?.s3Region ?? null,
                    cdnUrl: s3Data?.cdnUrl ?? null,
                    hashChecksum: s3Data?.hashChecksum ?? null,
                    isAiGenerated: false,
                    analysisStatus: 'NOT_APPLICABLE',
                },
            });
            logger.info(`[imageAnalysis] Video evidence saved. ID: ${evidenceRecord.id}, S3: ${s3Data?.s3Key || 'none'}`);
        }

        return res.status(200).json({
            success: true,
            filename: req.file.originalname,
            filesize: req.file.size,
            s3Url: s3Data?.cdnUrl ?? null,
            evidenceId: evidenceRecord?.id ?? null,
            module1: {
                status: 'completed',
                isAiGenerated: false,
                confidence: 0,
                reason: 'Video files are not analysed for AI generation.',
                forensicAnalysis: null,
                processingTimeMs: 0,
            },
        });
    }

    try {
        const result = await runImageAnalysis(req.file.buffer, req.file.mimetype);

        // ─── AI-GENERATED: reject evidence, skip S3 ──────────────────────────
        if (result.isAiGenerated) {
            logger.warn(`[imageAnalysis] 🚫 AI-generated image rejected. Confidence: ${(result.confidence * 100).toFixed(1)}%`);

            let rejectionRecord = null;
            if (uploaderId) {
                rejectionRecord = await prisma.evidence.create({
                    data: {
                        complaintId: complaintId || null,
                        uploaderId,
                        fileName: req.file.originalname,
                        mimeType: req.file.mimetype,
                        fileSizeBytes: req.file.size,
                        mediaCategory: 'IMAGE',
                        isAiGenerated: true,
                        aiConfidence: result.confidence ?? null,
                        aiDetectionReason: result.reason ?? null,
                        analysisStatus: 'AI_REJECTED',
                        processingTimeMs: result.processingTimeMs ?? null,
                    },
                });
                logger.info(`[imageAnalysis] Rejection record saved. ID: ${rejectionRecord.id}`);
            }

            return res.status(200).json({
                success: true,
                rejected: true,
                filename: req.file.originalname,
                filesize: req.file.size,
                evidenceId: rejectionRecord?.id ?? null,
                module1: { ...result, status: 'rejected' },
            });
        }

        // ─── REAL IMAGE: upload to S3, save full evidence record ─────────────
        let s3Data = null;
        let evidenceRecord = null;

        if (uploaderId) {
            try {
                s3Data = await uploadToS3(req.file.buffer, req.file.mimetype, req.file.originalname);
            } catch (s3Err) {
                logger.error(`[imageAnalysis] S3 upload failed: ${s3Err.message}`);
                // Continue — analysis is still saved, just without S3
            }

            const forensic = result.forensicAnalysis || {};
            const analysisObj = forensic.analysis || {};

            evidenceRecord = await prisma.evidence.create({
                data: {
                    complaintId: complaintId || null,
                    uploaderId,
                    fileName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    fileSizeBytes: req.file.size,
                    mediaCategory: 'IMAGE',
                    // S3 fields
                    s3Key: s3Data?.s3Key ?? null,
                    s3Bucket: s3Data?.s3Bucket ?? null,
                    s3Region: s3Data?.s3Region ?? null,
                    cdnUrl: s3Data?.cdnUrl ?? null,
                    hashChecksum: s3Data?.hashChecksum ?? null,
                    // AI detection
                    isAiGenerated: false,
                    aiConfidence: result.confidence ?? null,
                    aiDetectionReason: result.reason ?? null,
                    // Forensic analysis
                    riskLevel: analysisObj.riskLevel ?? null,
                    riskReason: analysisObj.riskReason ?? null,
                    overview: forensic.overview ?? null,
                    analysisJson: result.forensicAnalysis ?? undefined,
                    analysisStatus: 'COMPLETED',
                    processingTimeMs: result.processingTimeMs ?? null,
                },
            });

            logger.info(`[imageAnalysis] Evidence saved. ID: ${evidenceRecord.id} | S3: ${s3Data?.s3Key || 'none'} | Risk: ${analysisObj.riskLevel || 'N/A'}`);
        } else {
            logger.info('[imageAnalysis] No uploaderId provided — skipping DB save.');
        }

        return res.status(200).json({
            success: true,
            filename: req.file.originalname,
            filesize: req.file.size,
            s3Url: s3Data?.cdnUrl ?? null,
            evidenceId: evidenceRecord?.id ?? null,
            module1: result,
        });
    } catch (err) {
        const errJson = JSON.stringify(err, Object.getOwnPropertyNames(err));
        logger.error(`[imageAnalysis] Analysis failed — full error: ${errJson}`);

        return res.status(200).json({
            success: true,
            filename: req.file.originalname,
            filesize: req.file.size,
            module1: {
                status: 'failed',
                isAiGenerated: false,
                confidence: 0,
                reason: 'Analysis service temporarily unavailable.',
                forensicAnalysis: null,
                processingTimeMs: 0,
                error: err.message || 'Unknown error',
            },
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
