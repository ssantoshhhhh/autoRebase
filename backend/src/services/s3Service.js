'use strict';

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});

/**
 * Uploads a file buffer to S3 using a content-hash-based key.
 * The key is: evidence/<first8ofHash>/<fullHash>.<ext>
 * This ensures identical files deduplicate and the URL is tamper-evident.
 *
 * @param {Buffer} buffer       Raw file bytes
 * @param {string} mimeType     e.g. "image/jpeg"
 * @param {string} originalName e.g. "photo_123.jpg"
 * @returns {Promise<{s3Key, s3Bucket, s3Region, cdnUrl, hashChecksum}>}
 */
async function uploadToS3(buffer, mimeType, originalName) {
    const ext = (originalName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const s3Key = `evidence/${hash.slice(0, 8)}/${hash}.${ext}`;
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION || 'ap-south-1';

    logger.info(`[s3Service] Uploading to s3://${bucket}/${s3Key} (${(buffer.length / 1024).toFixed(1)} KB)`);

    await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
    }));

    const cdnUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    logger.info(`[s3Service] Upload complete. URL: ${cdnUrl}`);

    return {
        s3Key,
        s3Bucket: bucket,
        s3Region: region,
        hashChecksum: hash,
        cdnUrl,
    };
}

module.exports = { uploadToS3, getPresignedUrl };

/**
 * Generates a pre-signed GET URL for a private S3 object.
 * Valid for `expiresInSeconds` (default 15 minutes).
 *
 * @param {string} s3Key  The S3 object key stored in the evidence record
 * @param {number} expiresInSeconds
 * @returns {Promise<string>} Temporary signed URL
 */
async function getPresignedUrl(s3Key, expiresInSeconds = 900) {
    const bucket = process.env.S3_BUCKET;
    const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    logger.info(`[s3Service] Pre-signed URL generated for key: ${s3Key} (expires in ${expiresInSeconds}s)`);
    return url;
}
