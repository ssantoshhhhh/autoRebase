const axios = require('axios');
const { logger } = require('../utils/logger');

const TOKEN = process.env.AADHAAR_KYC_TOKEN;
const BASE_URL = 'https://kyc-api.aadhaarkyc.io/api/v1';

const kycApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
});

/**
 * Generate Aadhaar OTP
 * Returns client_id to be used for verification
 */
async function sendAadhaarOtp(aadhaarNumber) {
  try {
    const { data } = await kycApi.post('/aadhaar-v2/generate-otp', {
      id_number: aadhaarNumber,
    });

    // Based on typical response structure for this provider
    // If it's different, we might need to adjust, but usually it returns a client_id
    const clientId = data.data?.client_id || data.client_id;

    if (!clientId) {
      throw new Error('Failed to generate client_id from Aadhaar service');
    }

    return {
      provider: 'kyc-api',
      taskId: clientId, // we map client_id to taskId for consistency in routes
      message: 'OTP sent to your Aadhaar-linked mobile number',
    };
  } catch (err) {
    logger.error('Aadhaar KYC Generate OTP Failed:', err.response?.data || err.message);
    throw new Error(err.response?.data?.message || 'Failed to send Aadhaar OTP');
  }
}

/**
 * Submit Aadhaar OTP
 */
async function verifyAadhaarOtp(aadhaarNumber, otp, clientId) {
  try {
    const { data } = await kycApi.post('/aadhaar-v2/submit-otp', {
      client_id: clientId,
      otp: otp,
    });

    const citizenData = data.data || data;

    // Check if verification was successful
    // Usually successful if we get the data back
    if (citizenData && (citizenData.full_name || citizenData.name)) {
      return {
        verified: true,
        name: citizenData.full_name || citizenData.name,
        aadhaarMasked: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
        rawDetails: citizenData, // Store all details if needed
      };
    }

    return { verified: false };
  } catch (err) {
    logger.error('Aadhaar KYC Submit OTP Failed:', err.response?.data || err.message);
    if (err.response?.status === 422 || err.response?.status === 400) {
      throw new Error('Invalid OTP. Please try again.');
    }
    throw new Error('Verification failed. Service may be unavailable.');
  }
}

module.exports = {
  sendAadhaarOtp,
  verifyAadhaarOtp,
};
