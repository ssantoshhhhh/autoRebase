'use strict';

/**
 * Police Face Detection Routes
 * =============================
 * POST /api/police/evidence/:id/detect-faces
 *
 * Officer-driven flow:
 *  1. Fetch the Evidence record from DB (must be IMAGE category)
 *  2. Download the image buffer from S3
 *  3. POST it to the Python InsightFace microservice (/detect)
 *  4. For each detected face, run a pgvector cosine similarity search
 *     against persons_of_interest table
 *  5. Save results to detected_faces table
 *  6. Return bounding boxes + any matched PersonOfInterest profiles
 */

const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();
const { prisma } = require('../utils/prisma');
const { authenticatePolice } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// ─── S3 Client ────────────────────────────────────────────────────────────────
const s3 = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
});

// ─── Config ───────────────────────────────────────────────────────────────────
const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:8001';
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET || 'internal-service-secret';
const FACE_MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.5');

// ─── Helper: Stream S3 object → Buffer ───────────────────────────────────────
async function getS3ImageBuffer(s3Key, s3Bucket) {
    const command = new GetObjectCommand({ Bucket: s3Bucket, Key: s3Key });
    const response = await s3.send(command);

    // Convert the readable stream to a Buffer
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

// ─── POST /api/police/evidence/:id/detect-faces ───────────────────────────────
/**
 * Trigger a facial recognition search on a specific evidence image.
 *
 * Requires: Police JWT (any role)
 * Params:   id — Evidence ID
 * Returns:  { success, facesFound, results: [{ bbox, det_score, confidence, matchedPerson }] }
 */
router.post('/evidence/:id/detect-faces', authenticatePolice, async (req, res, next) => {
    const { id: evidenceId } = req.params;

    try {
        // ──────────────────────────────────────────────────────────────────────────
        // Step 1: Fetch and validate the Evidence record
        // ──────────────────────────────────────────────────────────────────────────
        const evidence = await prisma.evidence.findUnique({
            where: { id: evidenceId },
        });

        if (!evidence) {
            throw new AppError('Evidence not found', 404, 'NOT_FOUND');
        }
        if (evidence.mediaCategory !== 'IMAGE') {
            throw new AppError('Face detection is only supported for IMAGE evidence', 400, 'INVALID_MEDIA_TYPE');
        }
        if (!evidence.s3Key || !evidence.s3Bucket) {
            throw new AppError('Evidence has no S3 file attached', 400, 'NO_S3_FILE');
        }

        logger.info(`[faceDetect] Officer ${req.policeUser.id} triggered face search on evidence ${evidenceId}`);

        // ──────────────────────────────────────────────────────────────────────────
        // Step 2: Download image from S3
        // ──────────────────────────────────────────────────────────────────────────
        let imageBuffer;
        try {
            imageBuffer = await getS3ImageBuffer(evidence.s3Key, evidence.s3Bucket);
            logger.info(`[faceDetect] Downloaded ${imageBuffer.length} bytes from S3 key: ${evidence.s3Key}`);
        } catch (s3Err) {
            logger.error('[faceDetect] S3 download failed:', s3Err.message);
            throw new AppError(`Failed to download evidence from S3: ${s3Err.message}`, 502, 'S3_ERROR');
        }

        // ──────────────────────────────────────────────────────────────────────────
        // Step 3: Send image to Python face detection microservice
        // ──────────────────────────────────────────────────────────────────────────
        const form = new FormData();
        form.append('file', imageBuffer, {
            filename: evidence.fileName || 'image.jpg',
            contentType: evidence.mimeType || 'image/jpeg',
        });

        let facesData;
        try {
            const serviceResponse = await axios.post(`${FACE_SERVICE_URL}/detect`, form, {
                headers: {
                    ...form.getHeaders(),
                    'X-Service-Secret': AI_SERVICE_SECRET,
                },
                timeout: 60000, // 60s — model inference can be slow on CPU
            });
            facesData = serviceResponse.data;
            logger.info(`[faceDetect] Face service returned ${facesData.count} face(s)`);
        } catch (serviceErr) {
            const detail = serviceErr.response?.data?.detail || serviceErr.message;
            logger.error('[faceDetect] Face service error:', detail);
            throw new AppError(`Face detection service failed: ${detail}`, 502, 'FACE_SERVICE_ERROR');
        }

        const { faces = [], count: facesFound = 0 } = facesData;

        // ──────────────────────────────────────────────────────────────────────────
        // Step 4: pgvector similarity search for each detected face
        // ──────────────────────────────────────────────────────────────────────────
        const results = [];

        for (const face of faces) {
            const { bbox, embedding, det_score } = face;
            const embeddingVector = `[${embedding.join(',')}]`;

            let matchedPerson = null;
            let confidence = 0;

            try {
                // Raw pgvector query: cosine distance (<=>), lower = more similar
                const matches = await prisma.$queryRaw`
          SELECT
            id,
            name,
            category,
            notes,
            photo_url AS "photoUrl",
            (embedding <=> ${embeddingVector}::vector) AS distance
          FROM persons_of_interest
          WHERE embedding IS NOT NULL
          ORDER BY distance ASC
          LIMIT 1
        `;

                if (matches.length > 0) {
                    const best = matches[0];
                    const cosineDistance = parseFloat(best.distance);
                    // Distance 0 = identical, 2 = completely opposite. Threshold at 0.5 ≈ >75% similar.
                    if (cosineDistance <= FACE_MATCH_THRESHOLD) {
                        confidence = parseFloat((1 - cosineDistance / 2).toFixed(4)); // normalize to 0-1
                        matchedPerson = {
                            id: best.id,
                            name: best.name,
                            category: best.category,
                            notes: best.notes,
                            photoUrl: best.photoUrl,
                        };
                        logger.info(`[faceDetect] Match found: ${best.name} (distance: ${cosineDistance.toFixed(4)})`);
                    }
                }
            } catch (pgErr) {
                // pgvector table might be empty — not a fatal error, just log it
                logger.warn('[faceDetect] pgvector search error (no persons seeded?):', pgErr.message);
            }

            // ────────────────────────────────────────────────────────────────────────
            // Step 5: Persist the DetectedFace record
            // ────────────────────────────────────────────────────────────────────────
            try {
                await prisma.$executeRaw`
          INSERT INTO detected_faces (id, evidence_id, person_of_interest_id, bounding_box, embedding, confidence, detected_at)
          VALUES (
            gen_random_uuid(),
            ${evidenceId}::uuid,
            ${matchedPerson ? matchedPerson.id : null}::uuid,
            ${JSON.stringify(bbox)}::jsonb,
            ${embeddingVector}::vector,
            ${confidence},
            now()
          )
        `;
            } catch (insertErr) {
                // Non-fatal: log but still return the search result to the officer
                logger.error('[faceDetect] Failed to save DetectedFace record:', insertErr.message);
            }

            results.push({
                bbox,
                det_score,
                confidence,
                matchedPerson,
            });
        }

        logger.info(`[faceDetect] Completed face search on evidence ${evidenceId}: ${facesFound} found, ${results.filter(r => r.matchedPerson).length} matched`);

        // ──────────────────────────────────────────────────────────────────────────
        // Step 6: Return results
        // ──────────────────────────────────────────────────────────────────────────
        return res.json({
            success: true,
            evidenceId,
            facesFound,
            matchesFound: results.filter((r) => r.matchedPerson).length,
            results,
        });

    } catch (error) {
        next(error);
    }
});

// ─── GET /api/police/evidence/:id/detected-faces ─────────────────────────────
/**
 * Retrieve previously saved face detection results for an evidence item.
 * Useful for re-loading the complaint detail without re-running the search.
 */
router.get('/evidence/:id/detected-faces', authenticatePolice, async (req, res, next) => {
    try {
        const { id: evidenceId } = req.params;

        // Verify the evidence exists
        const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } });
        if (!evidence) throw new AppError('Evidence not found', 404, 'NOT_FOUND');

        // Fetch saved results using raw query (because embedding is Unsupported type)
        const detectedFaces = await prisma.detectedFace.findMany({
            where: { evidenceId },
            include: { personOfInterest: true },
            orderBy: { detectedAt: 'desc' },
        });

        return res.json({
            success: true,
            evidenceId,
            count: detectedFaces.length,
            detectedFaces: detectedFaces.map((df) => ({
                id: df.id,
                bbox: df.boundingBoxJson,
                confidence: df.confidence,
                detectedAt: df.detectedAt,
                matchedPerson: df.personOfInterest
                    ? {
                        id: df.personOfInterest.id,
                        name: df.personOfInterest.name,
                        category: df.personOfInterest.category,
                        notes: df.personOfInterest.notes,
                        photoUrl: df.personOfInterest.photoUrl,
                    }
                    : null,
            })),
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
