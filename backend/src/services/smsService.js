const twilio = require('twilio');
const { logger } = require('../utils/logger');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

const isTwilioConfigured = () => !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

/**
 * Sends an SMS via Twilio
 * @param {string} to - Recipient mobile number
 * @param {string} body - SMS content
 */
async function sendSMS(to, body) {
  if (!isTwilioConfigured()) {
    logger.warn(`SMS skipped (Twilio not configured): To=${to}, Body="${body}"`);
    return { success: false, reason: 'NOT_CONFIGURED' };
  }

  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    // Ensure number is in E.164 format for India if no + prefix
    const formatted = to.startsWith('+') ? to : `+91${to}`;

    await client.messages.create({
      body,
      from: TWILIO_FROM,
      to: formatted,
    });

    logger.info(`SMS sent successfully to ${to}`);
    return { success: true };
  } catch (err) {
    logger.error(`Twilio SMS Failed: ${err.message}`, { to, body });
    return { success: false, error: err.message };
  }
}

module.exports = { sendSMS };
