'use strict';

const express = require('express');
const { generateChatResponse } = require('../services/chatService');
const { logger } = require('../utils/logger');

const router = express.Router();

// ─── POST /api/chat ──────────────────────────────────────────────────────────
/**
 * Generate AI chat response for REVA assistant
 * 
 * Body (JSON):
 *   - message       (required) — User's message text
 *   - languageCode  (optional) — Language code (en, hi, ta, etc.) Default: 'en'
 *   - context       (optional) — Object with userName, location, mobile, history
 * 
 * Response:
 *   - reply         — AI assistant's response text
 */
router.post('/', async (req, res, next) => {
    try {
        const { message, languageCode = 'en', context = {} } = req.body;

        // Validate required fields
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a non-empty string',
            });
        }

        // Validate languageCode format
        if (languageCode && !/^[a-z]{2}$/.test(languageCode)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid languageCode. Must be a 2-letter code (e.g., en, hi, ta)',
            });
        }

        // Validate context structure if provided
        if (context && typeof context !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Context must be an object',
            });
        }

        // Validate history format if provided
        if (context.history && !Array.isArray(context.history)) {
            return res.status(400).json({
                success: false,
                error: 'Context.history must be an array',
            });
        }

        logger.info(`[chat] Received message (${message.length} chars) | Language: ${languageCode}`);

        // Generate AI response
        const reply = await generateChatResponse(message, languageCode, context);

        return res.status(200).json({
            success: true,
            reply,
        });
    } catch (error) {
        logger.error('[chat] Error processing chat request:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate AI response',
        });
    }
});

module.exports = router;
