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

    // ── Age-adaptive persona (injected FIRST so it dominates the entire response) ──
    let agePersona = '';
    if (context.userCategory === 'child') {
        agePersona = `CRITICAL INSTRUCTION — AGE PROFILE: CHILD (Age ${context.userAge})
You are talking to a CHILD. This overrides all other tone guidelines.
MANDATORY rules for EVERY single message you send:
• You MUST use the word "dear" in EVERY message without exception (e.g., "Don't worry, dear.", "You're doing great, dear!", "Can you tell me, dear, what happened?").
• Use only very simple words and very short sentences. Maximum 1–2 sentences per turn.
• Be warm, gentle, caring and highly reassuring at all times.
• NEVER use legal jargon, police terminology, or complex words.
• Ask only ONE simple question at a time — then STOP and wait.
• The child must feel safe, calm, and protected the entire time.
• If the child seems scared or confused, reassure them with "dear" first before asking anything.
`;
    } else if (context.userCategory === 'senior') {
        agePersona = `CRITICAL INSTRUCTION — AGE PROFILE: SENIOR CITIZEN (Age ${context.userAge})
You are talking to a SENIOR CITIZEN. This overrides all other tone guidelines.
MANDATORY rules for EVERY single message you send:
• Speak with deep respect and patience. Address them formally and kindly.
• Use plain, clear language — NO abbreviations, acronyms, or technical terms.
• Give instructions ONE step at a time. Never ask two things in one message.
• Repeat or gently rephrase important points when needed.
• Always say things like "Please take your time.", "You are doing very well.", "No hurry at all."
• Never sound rushed or impatient.
• Confirm what they said before moving to the next question.
`;
    } else if (context.userCategory === 'adult') {
        agePersona = `CRITICAL INSTRUCTION — AGE PROFILE: ADULT (Age ${context.userAge})
You are talking to an ADULT. This overrides all other tone guidelines.
MANDATORY rules for EVERY single message you send:
• Maintain a professional, structured, and efficient tone throughout.
• Be clear, concise, and factual. Avoid unnecessary filler words.
• Ask direct, focused follow-up questions to collect complaint details quickly.
• Use appropriate police and legal terminology where relevant.
• Stay businesslike but empathetic.
`;
    }

    // Build the system prompt — age persona goes FIRST
    let systemPrompt = agePersona;
    systemPrompt += `\nYou are REVA, a compassionate AI Police Assistant for India.`;

    if (context.userName) systemPrompt += ` You are speaking to ${context.userName}.`;
    if (context.location) systemPrompt += ` The user is currently in ${context.location}.`;
    if (context.mobile) systemPrompt += ` Their verified mobile is ${context.mobile}.`;

    systemPrompt += `\n\nYou MUST reply ONLY in ${languageName}. Keep responses natural for voice synthesis.
Gather complaint details one question at a time in this order: 1. Incident Type, 2. Location, 3. Description, 4. Date/Time.

--- CYBER SECURITY PROTOCOL ---
If the complaint relates to cybercrime (Financial Fraud, Phishing, Hacking, Cyber Bullying, Identity Theft):
1. Classify it as a Cybercrime immediately.
2. Advise calling 1930 (National Cyber Crime Helpline) for financial fraud.
3. Give a relevant Cyber Security Tip naturally within the conversation.
--- END PROTOCOL ---

When ALL details are collected, conclude with "Thank you, I am now filing your complaint." and append:
[[SUBMIT: {"incidentType": "...", "location": "...", "description": "...", "dateTime": "..."}]]

REMINDER: Maintain the age-appropriate tone defined above for EVERY response without exception.`;

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
