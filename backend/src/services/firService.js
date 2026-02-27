'use strict';

const { AzureOpenAI } = require('openai');
const { logger } = require('../utils/logger');

/**
 * Generates a formal First Information Report (FIR) from a complaint transcript and summary.
 * @param {Object} complaintData 
 * @returns {Promise<string>} Formal FIR text
 */
async function generateFormalFIR(complaintData) {
    const openai = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
    });

    const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'sih-vision';
    const { transcript, summaryText, incidentType, trackingId, user, station, createdAt } = complaintData;

    const userDetails = user ? `${user.name || 'N/A'}, Mobile: ${user.mobileNumber || 'N/A'}` : 'Anonymous';
    const stationDetails = station ? `${station.stationName}, ${station.district || ''}` : 'N/A';
    const dateStr = new Date(createdAt || Date.now()).toLocaleString('en-IN');

    const prompt = `
You are a senior Indian Police Officer. Your task is to draft a formal First Information Report (FIR) based on the intake conversation and summary provided below.

INSTRUCTIONS:
- Use formal, legal, and professional language suitable for an Indian Police FIR.
- Structure it with clear sections: I. Complainant Information, II. Nature of Offense, III. Date/Time/Location of Incident, IV. Statement of Facts, V. Prayer/Request.
- Be precise and objective.
- Include the Tracking ID: ${trackingId}
- Include Station: ${stationDetails}
- Complainant: ${userDetails}
- Data Filed: ${dateStr}

INTAKE SUMMARY:
${summaryText}

FULL TRANSCRIPT:
${transcript}

Incident Type: ${incidentType}

Draft the formal FIR text now. Do not include any conversational filler. Only the FIR report.
`;

    try {
        const response = await openai.chat.completions.create({
            model: DEPLOYMENT,
            messages: [
                { role: 'system', content: 'You are a professional legal drafter for the Indian Police Service.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1500,
        });

        return response.choices[0].message.content.trim();
    } catch (err) {
        logger.error('[firService] FIR generation failed:', err);
        return `FORMAL FIR REPORT FOR ${trackingId}\n\nSummary: ${summaryText}\n\nNote: Automated formal drafting failed. Please refer to summary above.`;
    }
}

module.exports = { generateFormalFIR };
