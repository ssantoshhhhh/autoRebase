'use strict';

const express = require('express');
const { prisma } = require('../utils/prisma');
const { getPresignedUrl } = require('../services/s3Service');
const { authenticateUser, authenticatePolice } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const jwt = require('jsonwebtoken');

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

        const token = req.cookies.accessToken || 
                      req.cookies.policeAccessToken ||
                      req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            
            if (decoded.type === 'POLICE') {
                const police = await prisma.policeUser.findUnique({
                    where: { id: decoded.policeUserId }
                });
                if (!police || !police.isActive) throw new Error('Invalid police account');
                requesterId = police.id;
                isPolice = true;
                req.policeUser = police; // For logging
            } else {
                const user = await prisma.user.findUnique({
                    where: { id: decoded.userId }
                });
                if (!user || !user.isVerified) throw new Error('Invalid user account');
                requesterId = user.id;
                isPolice = false;
                req.user = user; // For logging
            }
        } catch (authErr) {
            return res.status(401).json({ error: 'Invalid or expired session' });
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

/**
 * GET /api/evidence/linked-complaints
 * Police-only. Returns all complaint pairs that were automatically linked
 * because their evidence matched (≥85% similarity).
 * Citizens are never shown this data.
 */
router.get('/linked-complaints', async (req, res, next) => {
    try {
        const token = req.cookies.policeAccessToken || 
                      req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Police authentication required.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            if (decoded.type !== 'POLICE') throw new Error('Not a police token');
            
            const police = await prisma.policeUser.findUnique({
                where: { id: decoded.policeUserId }
            });
            if (!police || !police.isActive) throw new Error('Invalid account');
            req.policeUser = police;
        } catch (authErr) {
            return res.status(403).json({ error: 'Access denied: Police only route.' });
        }

        const links = await prisma.complaintLink.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                complaintA: {
                    select: {
                        id: true, trackingId: true, incidentType: true, status: true,
                        priorityLevel: true, createdAt: true, locationAddress: true,
                        station: { select: { stationName: true, district: true } },
                    },
                },
                complaintB: {
                    select: {
                        id: true, trackingId: true, incidentType: true, status: true,
                        priorityLevel: true, createdAt: true, locationAddress: true,
                        station: { select: { stationName: true, district: true } },
                    },
                },
            },
        });

        // Enrich with the matching evidence details
        const enriched = await Promise.all(links.map(async (link) => {
            let matchDetails = null;
            if (link.evidenceMatchId) {
                const match = await prisma.evidenceMatch.findUnique({
                    where: { id: link.evidenceMatchId },
                    select: {
                        id: true, similarityScore: true, matchType: true, createdAt: true,
                        source: { select: { id: true, fileName: true, mimeType: true, riskLevel: true, overview: true } },
                        target: { select: { id: true, fileName: true, mimeType: true, riskLevel: true, overview: true } },
                    },
                });
                matchDetails = match;
            }
            return {
                linkId: link.id,
                linkReason: link.linkReason,
                linkedAt: link.createdAt,
                complaintA: link.complaintA,
                complaintB: link.complaintB,
                evidenceMatch: matchDetails,
            };
        }));

        logger.info(`[evidence] Linked complaints list returned to officer ${req.policeUser?.id} — ${enriched.length} link(s)`);
        return res.json({ count: enriched.length, links: enriched });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/evidence/matches/:evidenceId
 * Police-only. Returns all similarity matches for a specific evidence record.
 */
router.get('/matches/:evidenceId', async (req, res, next) => {
    try {
        const token = req.cookies.policeAccessToken || 
                      req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Police authentication required.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            if (decoded.type !== 'POLICE') throw new Error('Not a police token');
            
            const police = await prisma.policeUser.findUnique({
                where: { id: decoded.policeUserId }
            });
            if (!police || !police.isActive) throw new Error('Invalid account');
            req.policeUser = police;
        } catch (authErr) {
            return res.status(403).json({ error: 'Access denied: Police only route.' });
        }

        const matches = await prisma.evidenceMatch.findMany({
            where: {
                OR: [
                    { sourceId: req.params.evidenceId },
                    { targetId: req.params.evidenceId },
                ],
            },
            include: {
                source: { select: { id: true, fileName: true, mimeType: true, riskLevel: true, overview: true, complaintId: true } },
                target: { select: { id: true, fileName: true, mimeType: true, riskLevel: true, overview: true, complaintId: true } },
            },
            orderBy: { similarityScore: 'desc' },
        });

        return res.json({ count: matches.length, matches });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
