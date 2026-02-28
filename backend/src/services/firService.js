'use strict';

const { AzureOpenAI } = require('openai');
const { logger } = require('../utils/logger');

/**
 * Generates a structured First Information Report (FIR) under Section 154 CrPC
 * by analysing the full chat transcript and returning a JSON object with all fields.
 * @param {Object} complaintData
 * @returns {Promise<Object>} Structured FIR data object
 */
async function generateFormalFIR(complaintData) {
    const openai = new AzureOpenAI({
        apiKey: process.env.AZURE_OPENAI_KEY,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
    });

    const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'sih-vision';
    const { transcript, summaryText, incidentType, trackingId, user, station, createdAt } = complaintData;

    const complainantName = user?.name || 'Not Provided';
    const complainantMobile = user?.mobileNumber || 'Not Provided';
    const stationName = station ? `${station.stationName}, ${station.district || ''}` : 'N/A';
    const filingDate = new Date(createdAt || Date.now()).toLocaleDateString('en-IN');

    const systemPrompt = `You are a senior Indian Police Officer who drafts First Information Reports (FIR) under Section 154 of the CrPC. 
You extract facts precisely from the complainant's conversation transcript and fill every FIR field accurately. 
You must return ONLY a valid JSON object — no markdown, no extra text.`;

    const userPrompt = `Analyse the complainant's chat transcript below and extract all available facts to fill a formal FIR under Section 154 CrPC.

KNOWN DETAILS (from system registration):
- Complainant Name: ${complainantName}
- Complainant Mobile: ${complainantMobile}
- Police Station: ${stationName}
- FIR/Tracking No: ${trackingId}
- Date Filed: ${filingDate}
- Incident Type: ${incidentType || 'General'}

FULL CHAT TRANSCRIPT:
${transcript}

SUMMARY (if available):
${summaryText || 'N/A'}

Return ONLY a JSON object with exactly these keys (use "Not mentioned" if info is absent in transcript):
{
  "complainant_name": "Full name from transcript or registration",
  "fathers_or_husbands_name": "Father's / husband's name if mentioned",
  "age": "Age in years, e.g. '17 years'",
  "gender": "Male / Female / Other",
  "occupation": "Occupation if mentioned",
  "address": "Full residential address as mentioned in transcript",
  "contact_number": "Mobile number from registration or transcript",
  "date_of_occurrence": "DD/MM/YYYY format — extract from transcript",
  "time_of_occurrence": "Approximate time, e.g. 'Approximately 4:00 AM'",
  "place_of_occurrence": "Full place name with city/district/state",
  "nature_of_offence": "Offence name with applicable IPC/BNS section, e.g. 'Theft (Section 378 IPC)'",
  "ipc_sections": "Applicable IPC/BNS sections as a comma-separated string",
  "incident_specific_details_label": "Label for section 9, e.g. 'Details of Stolen Property' or 'Description of Accused' or 'Details of Assault'",
  "incident_specific_details": "Bullet-pointed details relevant to the offence type. For theft: Mobile details, IMEI, colour, value. For assault: suspect description, weapon. Etc.",
  "brief_facts": "A formal, first-person, past-tense narrative paragraph (~4-6 sentences) describing what happened, suitable for an official FIR. Start with 'On [date] at approximately [time], while I was at [place]...'",
  "witnesses": "Names and addresses of witnesses if any, else 'None mentioned'",
  "action_requested": "What the complainant is requesting police to do",
  "date_of_filing": "${filingDate}",
  "place_of_filing": "City/town where complaint is being filed (extract from place of occurrence or station location)"
}`;

    try {
        const response = await openai.chat.completions.create({
            model: DEPLOYMENT,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        });

        const rawContent = response.choices[0].message.content.trim();
        const firData = JSON.parse(rawContent);
        return { success: true, data: firData };
    } catch (err) {
        logger.error('[firService] FIR generation failed:', err);
        // Fallback: return minimal structured data from what we know
        return {
            success: false,
            data: {
                complainant_name: complainantName,
                contact_number: complainantMobile,
                nature_of_offence: incidentType || 'General Complaint',
                brief_facts: summaryText || 'Details to be filled by investigating officer.',
                date_of_filing: filingDate,
                place_of_filing: station?.district || 'N/A',
                ipc_sections: 'To be determined',
                address: 'Not mentioned',
                age: 'Not mentioned',
                gender: 'Not mentioned',
                occupation: 'Not mentioned',
                fathers_or_husbands_name: 'Not mentioned',
                date_of_occurrence: 'Not mentioned',
                time_of_occurrence: 'Not mentioned',
                place_of_occurrence: 'Not mentioned',
                incident_specific_details_label: 'Incident Details',
                incident_specific_details: 'To be filled by officer based on transcript.',
                witnesses: 'None mentioned',
                action_requested: 'Register complaint and take necessary legal action.',
            },
        };
    }
}

module.exports = { generateFormalFIR };
