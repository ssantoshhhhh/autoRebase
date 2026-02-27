'use strict';

const express = require('express');
const { prisma } = require('../utils/prisma');
const { getPresignedUrl } = require('../services/s3Service');
const { authenticateUser, authenticatePolice } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/evidence/:id/url
 * Returns a 15-minute pre-signed S3 URL for the evidence file.
 * Accessible by the uploading citizen OR any authenticated police officer.
 */
router.get('/:id/url', async (req, res, next) => {
    try {
        // Accept either a citizen token or a police token
        let requesterId = null;
        let isPolice = false;

        // Try citizen auth
        try {
            await new Promise((resolve, reject) => {
                authenticateUser(req, res, (err) => (err ? reject(err) : resolve()));
            });
            requesterId = req.user?.id;
        } catch {
            // Try police auth
            try {
                await new Promise((resolve, reject) => {
                    authenticatePolice(req, res, (err) => (err ? reject(err) : resolve()));
                });
                requesterId = req.policeUser?.id;
                isPolice = true;
            } catch {
                return res.status(401).json({ error: 'Authentication required.' });
            }
        }

        const evidence = await prisma.evidence.findUnique({
            where: { id: req.params.id },
        });

        if (!evidence || evidence.isDeleted) {
            return res.status(404).json({ error: 'Evidence not found.' });
        }

        if (!evidence.s3Key) {
            return res.status(404).json({ error: 'No file stored for this evidence record.' });
        }

        // Citizen can only access their own uploads
        if (!isPolice && evidence.uploaderId !== requesterId) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const signedUrl = await getPresignedUrl(evidence.s3Key, 900); // 15 min
        logger.info(`[evidence] Pre-signed URL issued for evidence ${evidence.id} to ${isPolice ? 'officer' : 'citizen'} ${requesterId}`);

        return res.json({
            evidenceId: evidence.id,
            fileName: evidence.fileName,
            mimeType: evidence.mimeType,
            riskLevel: evidence.riskLevel,
            url: signedUrl,
            expiresInSeconds: 900,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
