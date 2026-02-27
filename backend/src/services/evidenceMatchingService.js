'use strict';

/**
 * Evidence Similarity Detection & Joint-Complaint Linking
 *
 * Algorithm:
 *  1. Exact match  – same SHA-256 hash (hashChecksum)  → 100% similarity
 *  2. Near-match   – perceptual mean-hash (pHash), 8×8 grayscale
 *                    Hamming distance ≤ 9 / 64 bits     → ≥ 85.9% similarity
 *
 * When similarity ≥ SIMILARITY_THRESHOLD:
 *  - An EvidenceMatch record is created (or retrieved if already exists).
 *  - If BOTH evidence records are attached to different complaints,
 *    a ComplaintLink record is created (police-only intelligence).
 *  - Citizens are never notified.
 */

const sharp = require('sharp');
const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');

const SIMILARITY_THRESHOLD = 0.85; // 85%
const PHASH_BITS = 64;              // 8×8 pixels → 64 bits
const MAX_HAMMING = Math.floor(PHASH_BITS * (1 - SIMILARITY_THRESHOLD)); // ≤9

// ─── Perceptual Mean-Hash ─────────────────────────────────────────────────────
/**
 * Compute a 64-bit mean-hash from an image buffer.
 * Returns a 16-character lowercase hex string, or null on failure.
 */
async function computePHash(imageBuffer) {
    try {
        const raw = await sharp(imageBuffer)
            .resize(8, 8, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer();

        // raw = 64 unsigned bytes (one per pixel)
        const pixels = new Uint8Array(raw);
        const mean = pixels.reduce((s, v) => s + v, 0) / pixels.length;

        let hash = 0n;
        for (let i = 0; i < 64; i++) {
            if (pixels[i] > mean) hash |= (1n << BigInt(63 - i));
        }

        // Return as 16-char zero-padded hex string
        return hash.toString(16).padStart(16, '0');
    } catch (err) {
        logger.warn(`[evidenceMatching] pHash computation failed: ${err.message}`);
        return null;
    }
}

// ─── Hamming Distance ─────────────────────────────────────────────────────────
function hammingDistance(hexA, hexB) {
    if (!hexA || !hexB || hexA.length !== hexB.length) return Infinity;
    let dist = 0;
    for (let i = 0; i < hexA.length; i++) {
        const xor = (parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16)) >>> 0;
        // Count bits in 4-bit nibble
        dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][xor];
    }
    return dist;
}

function pHashSimilarity(hexA, hexB) {
    const d = hammingDistance(hexA, hexB);
    return d === Infinity ? 0 : (PHASH_BITS - d) / PHASH_BITS;
}

// ─── Find & Record Similar Evidence ──────────────────────────────────────────
/**
 * Given a newly-saved evidence record, scan existing evidence for matches.
 * Creates EvidenceMatch entries and (if both have complaints) ComplaintLink entries.
 *
 * @param {string} newEvidenceId  - ID of the just-saved Evidence row
 * @param {Buffer}  imageBuffer   - raw image bytes (for pHash if not already stored)
 */
async function runSimilarityCheck(newEvidenceId, imageBuffer) {
    try {
        const newEvidence = await prisma.evidence.findUnique({
            where: { id: newEvidenceId },
            select: { id: true, pHash: true, hashChecksum: true, complaintId: true,
                      mediaCategory: true, analysisStatus: true, isDeleted: true },
        });
        if (!newEvidence || newEvidence.isDeleted) return;
        if (newEvidence.analysisStatus === 'AI_REJECTED') return; // never match rejected images

        // Compute and store pHash if missing and we have the raw buffer
        let myPHash = newEvidence.pHash;
        if (!myPHash && imageBuffer && newEvidence.mediaCategory === 'IMAGE') {
            myPHash = await computePHash(imageBuffer);
            if (myPHash) {
                await prisma.evidence.update({
                    where: { id: newEvidenceId },
                    data: { pHash: myPHash },
                });
            }
        }

        // Fetch all other evidence eligible for comparison
        const candidates = await prisma.evidence.findMany({
            where: {
                id: { not: newEvidenceId },
                isDeleted: false,
                analysisStatus: { notIn: ['AI_REJECTED', 'PENDING', 'PROCESSING'] },
                mediaCategory: newEvidence.mediaCategory,
            },
            select: { id: true, pHash: true, hashChecksum: true, complaintId: true },
        });

        for (const candidate of candidates) {
            // Skip if a match record already exists between these two
            const existing = await prisma.evidenceMatch.findFirst({
                where: {
                    OR: [
                        { sourceId: newEvidenceId, targetId: candidate.id },
                        { sourceId: candidate.id, targetId: newEvidenceId },
                    ],
                },
            });
            if (existing) continue;

            let similarity = 0;
            let matchType = 'SIMILAR';

            // 1. Exact SHA-256 hash match
            if (newEvidence.hashChecksum && candidate.hashChecksum &&
                newEvidence.hashChecksum === candidate.hashChecksum) {
                similarity = 1.0;
                matchType = 'EXACT';
            }
            // 2. Perceptual hash near-match (images only)
            else if (myPHash && candidate.pHash) {
                similarity = pHashSimilarity(myPHash, candidate.pHash);
            }

            if (similarity < SIMILARITY_THRESHOLD) continue;

            logger.info(`[evidenceMatching] Match found: ${newEvidenceId} ↔ ${candidate.id} | ${(similarity * 100).toFixed(1)}% (${matchType})`);

            // Create EvidenceMatch
            const match = await prisma.evidenceMatch.create({
                data: {
                    sourceId: newEvidenceId,
                    targetId: candidate.id,
                    similarityScore: similarity,
                    matchType,
                },
            });

            // Link complaints if both evidence are attached to DIFFERENT complaints
            await maybeCreateComplaintLink(
                newEvidence.complaintId,
                candidate.complaintId,
                match.id,
            );
        }
    } catch (err) {
        // Non-fatal — matching failure must never break the main complaint flow
        logger.error(`[evidenceMatching] Similarity check error: ${err.message}`);
    }
}

// ─── Complaint Linking ────────────────────────────────────────────────────────
/**
 * When evidence is attached to a complaint later (complaints.js /submit),
 * re-run linking for all matches involving the freshly linked evidence IDs.
 *
 * @param {string[]} evidenceIds  - evidence IDs just linked to a complaint
 */
async function linkComplaintsForEvidence(evidenceIds) {
    try {
        for (const eid of evidenceIds) {
            const ev = await prisma.evidence.findUnique({
                where: { id: eid },
                select: { complaintId: true },
            });
            if (!ev?.complaintId) continue;

            // Find all matches involving this evidence
            const matches = await prisma.evidenceMatch.findMany({
                where: { OR: [{ sourceId: eid }, { targetId: eid }] },
                select: { id: true, sourceId: true, targetId: true },
            });

            for (const match of matches) {
                const otherEvidenceId = match.sourceId === eid ? match.targetId : match.sourceId;
                const other = await prisma.evidence.findUnique({
                    where: { id: otherEvidenceId },
                    select: { complaintId: true },
                });
                await maybeCreateComplaintLink(ev.complaintId, other?.complaintId ?? null, match.id);
            }
        }
    } catch (err) {
        logger.error(`[evidenceMatching] Complaint link sweep error: ${err.message}`);
    }
}

// ─── Internal helper ──────────────────────────────────────────────────────────
async function maybeCreateComplaintLink(complaintAId, complaintBId, evidenceMatchId) {
    if (!complaintAId || !complaintBId || complaintAId === complaintBId) return;

    // Canonicalise order to satisfy the unique constraint
    const [a, b] = [complaintAId, complaintBId].sort();

    try {
        await prisma.complaintLink.upsert({
            where: { complaintAId_complaintBId: { complaintAId: a, complaintBId: b } },
            create: {
                complaintAId: a,
                complaintBId: b,
                linkReason: 'SIMILAR_EVIDENCE',
                evidenceMatchId,
            },
            update: {}, // already linked — no change needed
        });
        logger.info(`[evidenceMatching] Complaint link created/confirmed: ${a} ↔ ${b}`);
    } catch (err) {
        if (!err.message.includes('Unique constraint')) {
            logger.error(`[evidenceMatching] ComplaintLink upsert error: ${err.message}`);
        }
    }
}

module.exports = { computePHash, runSimilarityCheck, linkComplaintsForEvidence };
