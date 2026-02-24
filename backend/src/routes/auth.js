const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { 
  verifyPan, 
  sendMobileOtp, verifyMobileOtp,
  maskAadhaar, validateAadhaar, validatePan 
} = require('../services/idfyService');
const aadhaarKyc = require('../services/aadhaarKycService');

/**
 * TOKEN UTILS
 */
const generateTokens = (userId) => ({
  accessToken: jwt.sign(
    { userId, type: 'CITIZEN' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  ),
  refreshToken: jwt.sign(
    { userId, type: 'CITIZEN' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  ),
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  const prod = process.env.NODE_ENV === 'production';
  res.cookie('accessToken', accessToken, {
    httpOnly: true, secure: prod, sameSite: prod ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: prod, sameSite: prod ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
};

// In-memory pending tasks
const pendingAadhaarTasks = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// AADHAAR ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/send-otp', async (req, res, next) => {
  try {
    const { aadhaar, language = 'en' } = req.body;
    if (!aadhaar) throw new AppError('Aadhaar is required', 400);

    const cleaned = aadhaar.replace(/\s|-/g, '');
    if (!validateAadhaar(cleaned)) throw new AppError('Invalid Aadhaar format', 400);

    const result = await aadhaarKyc.sendAadhaarOtp(cleaned);

    pendingAadhaarTasks.set(cleaned, {
      taskId: result.taskId,
      provider: result.provider,
      language,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    res.json({
      message: result.message,
      aadhaarMasked: maskAadhaar(cleaned),
      provider: result.provider,
      devMode: result.provider === 'dev',
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    });
  } catch (error) { next(error); }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { aadhaar, otp, language = 'en' } = req.body;
    if (!aadhaar || !otp) throw new AppError('Aadhaar and OTP required', 400);

    const cleaned = aadhaar.replace(/\s|-/g, '');
    const pending = pendingAadhaarTasks.get(cleaned);

    if (!pending || pending.expiresAt < Date.now()) {
      throw new AppError('OTP expired or not requested', 400);
    }

    let result = await aadhaarKyc.verifyAadhaarOtp(cleaned, otp, pending.taskId);

    if (!result.verified) throw new AppError('Invalid OTP', 400);

    pendingAadhaarTasks.delete(cleaned);
    const user = await upsertCitizenUser(maskAadhaar(cleaned), result.name, pending.language);

    const { accessToken, refreshToken } = generateTokens(user.id);
    await updateRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/pan/details', async (req, res, next) => {
  try {
    const { pan } = req.body;
    if (!pan) throw new AppError('PAN is required', 400);

    const cleaned = pan.toUpperCase().trim();
    if (!validatePan(cleaned)) throw new AppError('Invalid PAN format', 400);

    const details = await verifyPan(cleaned);
    res.json(details);
  } catch (error) { next(error); }
});

router.post('/send-mobile-otp', async (req, res, next) => {
  try {
    const { mobile } = req.body;
    if (!mobile) throw new AppError('Mobile number required', 400);

    const result = await sendMobileOtp(mobile);
    res.json(result);
  } catch (error) { next(error); }
});

router.post('/mobile/login', async (req, res, next) => {
  try {
    const { mobile, otp, name, language = 'en' } = req.body;
    if (!mobile || !otp) throw new AppError('Mobile and OTP required', 400);

    const isOtpValid = await verifyMobileOtp(mobile, otp);
    if (!isOtpValid) throw new AppError('Invalid OTP', 400);

    let user = await prisma.user.findFirst({ where: { mobileNumber: mobile } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          internalRef: `mob_${mobile}_${Date.now().toString().slice(-4)}`,
          mobileNumber: mobile,
          name: name || null,
          isVerified: true,
          language
        }
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await updateRefreshToken(user.id, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

// ─────────────────────────────────────────────────────────────────────────────
// BASE AUTH
// ─────────────────────────────────────────────────────────────────────────────

async function upsertCitizenUser(idMasked, name, language) {
  let user = await prisma.user.findFirst({ 
    where: { 
      OR: [
        { aadhaarMasked: idMasked },
        // If we have more identifiers we'd add them here
      ]
    } 
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: uuidv4(),
        internalRef: `reg_${idMasked.replace(/X|-/g, '')}_${Date.now().toString().slice(-4)}`,
        aadhaarMasked: idMasked,
        name: name || null,
        isVerified: true,
        language
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name: name || user.name, language }
    });
  }
  return user;
}

async function updateRefreshToken(userId, token) {
  const hash = await bcrypt.hash(token, 8);
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: hash } });
}

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new AppError('Refresh token required', 401);

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || !user.refreshToken) throw new AppError('Invalid session', 401);

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new AppError('Session compromised', 401);

    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(user.id);
    await updateRefreshToken(user.id, newRefresh);
    setAuthCookies(res, newAccess, newRefresh);

    res.json({ accessToken: newAccess });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await prisma.user.update({ where: { id: decoded.userId }, data: { refreshToken: null } });
    } catch (_) {}
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.post('/anonymous', async (req, res, next) => {
  try {
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        internalRef: `anon_${uuidv4().slice(0, 8)}`,
        isAnonymous: true,
        isVerified: true
      }
    });
    const { accessToken, refreshToken } = generateTokens(user.id);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user, accessToken });
  } catch (error) { next(error); }
});

module.exports = router;
