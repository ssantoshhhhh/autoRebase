'use strict';

const { AzureOpenAI } = require('openai');
const { logger } = require('../utils/logger');
const {
    AI_DETECTION_PROMPT,
    FORENSIC_CAPTION_SYSTEM_PROMPT,
    FORENSIC_CAPTION_USER_PROMPT,
} = require('./imageAnalysisPrompts');

// ─── Azure OpenAI Client ──────────────────────────────────────────────────────
const openai = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
});

const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'sih-vision';

/**
 * Step 1: Checks if an image is AI-generated using GPT-4o Vision.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<{isAiGenerated: boolean, confidence: number, reason: string}>}
 */
async function checkIfAiGenerated(imageBuffer, mimeType) {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
        model: DEPLOYMENT,
        temperature: 0,
        max_tokens: 300,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: AI_DETECTION_PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
                ],
            },
        ],
    });

    const rawText = response.choices[0].message.content.trim();
    try {
        const result = JSON.parse(rawText);
        return {
            isAiGenerated: Boolean(result.isAiGenerated),
            confidence: parseFloat(result.confidence) || 0,
            reason: result.reason || 'No reason provided.',
        };
    } catch {
        logger.warn('[imageAnalysisService] AI detection response parse failed, treating as real image.');
        return { isAiGenerated: false, confidence: 0, reason: 'Detection inconclusive.' };
    }
}

/**
 * Step 2: Generates a structured forensic caption for a real (non-AI) image.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<Object>} Structured forensic analysis report
 */
async function generateForensicCaption(imageBuffer, mimeType) {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
        model: DEPLOYMENT,
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
            { role: 'system', content: FORENSIC_CAPTION_SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'text', text: FORENSIC_CAPTION_USER_PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
                ],
            },
        ],
    });

    const rawText = response.choices[0].message.content.trim();
    try {
        return JSON.parse(rawText);
    } catch {
        logger.warn('[imageAnalysisService] Forensic caption response parse failed, returning raw text.');
        return {
            overview: 'Parsing error. Raw analysis returned.',
            rawAnalysis: rawText,
            objects: [],
            persons: [],
            analysis: { riskLevel: 'Unknown', riskReason: 'Response could not be parsed.' },
        };
    }
}

/**
 * Main orchestrator: Runs Module 1 image analysis pipeline.
 * 1) AI detection (gatekeeper)
 * 2) Forensic captioning (only for real images)
 *
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<Object>} Module 1 result
 */
async function runImageAnalysis(imageBuffer, mimeType) {
    const startTime = Date.now();

    logger.info('[imageAnalysisService] Starting AI detection check...');
    let detectionResult;
    try {
        detectionResult = await checkIfAiGenerated(imageBuffer, mimeType);
    } catch (err) {
        logger.error('[imageAnalysisService] AI detection failed:', err.message);
        throw new Error('AI detection service failed: ' + err.message);
    }

    logger.info(`[imageAnalysisService] Detection complete. AI Generated: ${detectionResult.isAiGenerated}`);

    // Early exit if AI generated
    if (detectionResult.isAiGenerated) {
        logger.info('━━━━━━━━━━━━━━━━ IMAGE ANALYSIS REPORT ━━━━━━━━━━━━━━━━');
        logger.info(`[imageAnalysisService] 🤖 AI GENERATED IMAGE detected`);
        logger.info(`[imageAnalysisService] 🎯 Confidence : ${(detectionResult.confidence * 100).toFixed(1)}% AI`);
        logger.info(`[imageAnalysisService] 📝 Reason     : ${detectionResult.reason}`);
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return {
            status: 'completed',
            isAiGenerated: true,
            confidence: detectionResult.confidence,
            reason: detectionResult.reason,
            forensicAnalysis: null,
            processingTimeMs: Date.now() - startTime,
        };
    }

    // Generate forensic caption for real images
    logger.info('[imageAnalysisService] Real image confirmed. Generating forensic caption...');
    let forensicAnalysis;
    try {
        forensicAnalysis = await generateForensicCaption(imageBuffer, mimeType);
    } catch (err) {
        logger.error('[imageAnalysisService] Forensic captioning failed:', err.message);
        throw new Error('Forensic captioning service failed: ' + err.message);
    }

    const totalTime = Date.now() - startTime;

    // ─── Rich structured log ──────────────────────────────────────────────────
    const f = forensicAnalysis || {};
    const analysis = f.analysis || {};
    const objects = Array.isArray(f.objects) ? f.objects : [];
    const persons = Array.isArray(f.persons) ? f.persons : [];

    logger.info('━━━━━━━━━━━━━━━━ IMAGE ANALYSIS REPORT ━━━━━━━━━━━━━━━━');
    logger.info(`[imageAnalysisService] ✅ Real image | Confidence: ${(detectionResult.confidence * 100).toFixed(1)}% real`);
    logger.info(`[imageAnalysisService] ⚠  Risk Level : ${analysis.riskLevel || 'Unknown'}`);
    logger.info(`[imageAnalysisService] 📝 Overview   : ${f.overview || 'N/A'}`);
    logger.info(`[imageAnalysisService] 🔍 Risk Reason: ${analysis.riskReason || 'N/A'}`);

    if (objects.length > 0) {
        logger.info(`[imageAnalysisService] 📦 Objects (${objects.length}):`);
        objects.forEach((obj, i) => {
            logger.info(`  [${i + 1}] ${obj.type || 'Unknown'} — ${obj.details || 'No details'}`);
        });
    }

    if (persons.length > 0) {
        logger.info(`[imageAnalysisService] 👤 Persons (${persons.length}):`);
        persons.forEach((p, i) => {
            logger.info(`  [${i + 1}] ${p.gender || '?'}, ~${p.estimatedAge || '?'} | ${p.clothing || ''} | Action: ${p.action || 'N/A'} | Face visible: ${p.faceVisible}`);
        });
    }

    logger.info(`[imageAnalysisService] ⏱  Total time : ${totalTime}ms`);
    logger.info('[imageAnalysisService] Full JSON:');
    logger.info(JSON.stringify({ isAiGenerated: false, confidence: detectionResult.confidence, forensicAnalysis }, null, 2));
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
        status: 'completed',
        isAiGenerated: false,
        confidence: detectionResult.confidence,
        reason: detectionResult.reason,
        forensicAnalysis,
        processingTimeMs: totalTime,
    };
}

module.exports = { runImageAnalysis };
