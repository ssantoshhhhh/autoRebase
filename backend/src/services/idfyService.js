const axios = require('axios');
const twilio = require('twilio');
const { logger } = require('../utils/logger');

// ── Settings ───────────────────────────────────────────────────────────
// Use https://eve.idfy.com for Sandbox testing
// Use https://api.idfy.com for Production
const IDFY_BASE = process.env.IDFY_BASE_URL;
const IDFY_ACCOUNT_ID = process.env.IDFY_ACCOUNT_ID;
const IDFY_API_KEY = process.env.IDFY_API_KEY;

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

// Store manual OTPs (use Redis in prod)
const manualOtpStore = new Map();

// IDfy client
const idfy = axios.create({
  baseURL: IDFY_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'api-key': IDFY_API_KEY,
    'account-id': IDFY_ACCOUNT_ID,
  },
});

const isIdfyConfigured = () => !!(IDFY_ACCOUNT_ID && IDFY_API_KEY && IDFY_BASE);
const isTwilioConfigured = () => !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

// ─────────────────────────────────────────────────────────────────────────────
// AADHAAR FLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send OTP to Aadhaar-linked mobile (Official UIDAI flow via IDfy)
 */
async function sendAadhaarOtp(aadhaarNumber) {
  const last4 = aadhaarNumber.slice(-4);

  if (!isIdfyConfigured()) {
    throw new Error('IDfy service is not configured. Please check environment variables.');
  }

  try {
    const { data } = await idfy.post('/v2/tasks/async/verify_with_source/ind_aadhaar_otp', {
      task_id: `REVA-AA-${Date.now()}`,
      group_id: `REVA-GRP-${Date.now()}`,
      data: { id_number: aadhaarNumber },
    });

    logger.info(`IDfy Aadhaar OTP initiated for …${last4}: taskId=${data.task_id}`);

    return {
      provider: 'idfy',
      taskId: data.task_id,
      message: 'OTP sent to your Aadhaar-linked mobile number',
    };
  } catch (err) {
    const status = err.response?.status;
    const errorBody = err.response?.data;
    logger.error(`IDfy Aadhaar OTP Failed [${status}]:`, errorBody || err.message);

    if (status === 401)
      throw new Error('IDfy Authentication failed. Ensure API Key and Account ID are correct.');
    if (status === 403)
      throw new Error('IDfy access denied. Check whitelisting or product activation.');
    throw new Error(errorBody?.message || 'Failed to trigger Aadhaar OTP.');
  }
}

/**
 * Verify Aadhaar OTP
 */
async function verifyAadhaarOtp(aadhaarNumber, otp, taskId, provider) {
  const last4 = aadhaarNumber.slice(-4);

  if (provider !== 'idfy') {
    throw new Error('Invalid authentication provider for Aadhaar.');
  }

  try {
    const { data } = await idfy.post('/v2/tasks/async/verify_with_source/ind_aadhaar', {
      task_id: `REVA-VRF-${Date.now()}`,
      group_id: `REVA-GRP-${Date.now()}`,
      data: { id_number: aadhaarNumber, otp },
    });

    const src = data?.result?.source_output || data?.data || {};
    const verified = data?.status === 'completed' || src?.status === 'id_found';

    // Handle async processing if IDfy hasn't finished yet
    if (!verified && data?.request_id) {
      return { asyncPending: true, requestId: data.request_id };
    }

    return {
      verified,
      name: src.full_name || src.name || null,
      aadhaarMasked: `XXXX-XXXX-${last4}`,
    };
  } catch (err) {
    logger.error('IDfy Aadhaar Verify Failed:', err.response?.data || err.message);
    if (err.response?.status === 400)
      throw new Error('Invalid Aadhaar OTP. Please check the code sent to your phone.');
    throw new Error('Verification service error. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAN FLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify PAN and return details
 */
async function verifyPan(panNumber) {
  if (!isIdfyConfigured()) {
    throw new Error('IDfy service is not configured for PAN verification.');
  }

  try {
    const { data } = await idfy.post('/v2/tasks/sync/verify_with_source/ind_pan', {
      task_id: `PAN-VRF-${Date.now()}`,
      group_id: `PAN-GRP-${Date.now()}`,
      data: { id_number: panNumber },
    });

    const result = data?.result?.source_output || {};

    if (data.status === 'completed' && (result.status === 'id_found' || result.is_match)) {
      return {
        verified: true,
        name: result.name || result.full_name,
        fathersName: result.father_name || result.fathers_name,
        panNumber: result.id_number || panNumber,
      };
    }

    throw new Error('PAN not found or invalid.');
  } catch (err) {
    logger.error('IDfy PAN Verify Failed:', err.response?.data || err.message);
    throw new Error(
      err.response?.data?.message || 'PAN verification failed. Ensure the number is correct.'
    );
  }
}

/**
 * Send manual OTP via Twilio to a specific mobile
 */
async function sendMobileOtp(mobileNumber) {
  if (!isTwilioConfigured()) {
    throw new Error('Twilio SMS service is not configured.');
  }

  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const formatted = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;

    await client.messages.create({
      body: `Your REVA Verification Code: ${otp}. Valid for 5 minutes.`,
      from: TWILIO_FROM,
      to: formatted,
    });

    manualOtpStore.set(mobileNumber, { otp, expires: Date.now() + 5 * 60 * 1000 });
    return { provider: 'twilio', message: 'Verification code sent to your mobile number.' };
  } catch (err) {
    logger.error('Twilio Send Failed:', err.message);
    throw new Error(`Failed to send SMS: ${err.message}`);
  }
}

/**
 * Verify manual mobile OTP
 */
async function verifyMobileOtp(mobileNumber, otp) {
  const stored = manualOtpStore.get(mobileNumber);
  if (stored && stored.otp === otp && stored.expires > Date.now()) {
    manualOtpStore.delete(mobileNumber);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

async function pollTaskResult(requestId, maxAttempts = 12, intervalMs = 2500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { data } = await idfy.get(`/v2/tasks?request_id=${requestId}`);
      const task = Array.isArray(data) ? data[0] : data;
      if (task?.status === 'completed') {
        const src = task.result?.source_output || {};
        return {
          verified: src.status === 'id_found' || src.is_match === true,
          name: src.full_name || src.name || null,
        };
      }
      if (task?.status === 'failed') throw new Error('Identity verification task failed.');
    } catch (e) {
      logger.debug('Polling attempt failed:', e.message);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Verification timed out. Please try again.');
}

const maskAadhaar = (a) => `XXXX-XXXX-${a.replace(/\D/g, '').slice(-4)}`;
const validateAadhaar = (a) => /^[2-9]\d{11}$/.test(a?.replace(/\D/g, ''));
const validatePan = (p) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(p?.toUpperCase());

module.exports = {
  // Aadhaar
  sendAadhaarOtp,
  verifyAadhaarOtp,
  // PAN
  verifyPan,
  // Mobile/Twilio
  sendMobileOtp,
  verifyMobileOtp,
  // Helpers
  pollTaskResult,
  maskAadhaar,
  validateAadhaar,
  validatePan,
};
