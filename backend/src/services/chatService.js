'use strict';

const { AzureOpenAI } = require('openai');
const { logger } = require('../utils/logger');

// ─── Azure OpenAI Client ──────────────────────────────────────────────────────
const openai = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
});

const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'sih-vision';

// ─── Language Mapping ─────────────────────────────────────────────────────────
const LANGUAGE_MAP = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'mr': 'Marathi',
    'bn': 'Bengali',
    'gu': 'Gujarati',
    'ml': 'Malayalam',
    'pa': 'Punjabi'
};

/**
 * Generate AI chat response using Azure OpenAI
 * @param {string} userMessage - User's message
 * @param {string} languageCode - Language code (en, hi, ta, etc.)
 * @param {Object} context - Additional context
 * @param {string} context.userName - User's name
 * @param {string} context.location - User's location
 * @param {string} context.mobile - User's mobile number
 * @param {Array} context.history - Previous messages [{role: 'user'|'assistant', content: '...'}]
 * @returns {Promise<string>} AI assistant's reply
 */
async function generateChatResponse(userMessage, languageCode = 'en', context = {}) {
    const languageName = LANGUAGE_MAP[languageCode] || 'English';

    // Build the system prompt with context
    let systemPrompt = "You are REVA, a compassionate AI Police Assistant for India.";
    
    if (context.userName) {
        systemPrompt += ` You are speaking to ${context.userName}.`;
    }
    if (context.location) {
        systemPrompt += ` The user is currently in ${context.location}.`;
    }
    if (context.mobile) {
        systemPrompt += ` Their verified mobile is ${context.mobile}.`;
    }
    
    systemPrompt += ` You MUST reply ONLY in ${languageName}. Keep responses short, concise, and natural for voice synthesis. 
Ask follow up questions one by one to gather complaint details: 1. Incident Type, 2. Location, 3. Description, 4. Date/Time.

When you have gathered ALL the details, you must conclude by saying something like "Thank you, I am now filing your complaint." and you MUST append a JSON block at the very end like this:
[[SUBMIT: {"incidentType": "...", "location": "...", "description": "...", "dateTime": "..."}]]`;

    // Prepare messages array
    const messages = [
        { role: 'system', content: systemPrompt },
        ...(context.history || []),
        { role: 'user', content: userMessage }
    ];

    try {
        logger.info(`[chatService] Generating response for language: ${languageCode}`);

        const response = await openai.chat.completions.create({
            model: DEPLOYMENT,
            messages: messages,
            max_tokens: 400,
            temperature: 0.7,
        });

        const assistantReply = response.choices[0].message.content;
        
        logger.info(`[chatService] Response generated successfully (${assistantReply.length} chars)`);
        
        return assistantReply;
    } catch (error) {
        logger.error('[chatService] Error generating chat response:', error.message);
        throw new Error(`Failed to generate AI response: ${error.message}`);
    }
}

module.exports = {
    generateChatResponse,
};
