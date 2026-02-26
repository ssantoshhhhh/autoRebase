const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/prisma');
const { AppError } = require('../middleware/errorHandler');
const { authenticatePolice, requireRole } = require('../middleware/auth');

const generatePoliceTokens = (policeUserId, stationId, role) => {
  const accessToken = jwt.sign(
    { policeUserId, stationId, role, type: 'POLICE' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '8h' }
  );
  const refreshToken = jwt.sign(
    { policeUserId, stationId, type: 'POLICE' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
  return { accessToken, refreshToken };
};

const setPoliceAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('policeAccessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.cookie('policeRefreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/police/auth/refresh',
  });
};

// POST /api/police/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password required', 400, 'MISSING_FIELDS');
    }

    const policeUser = await prisma.policeUser.findUnique({
      where: { email },
      include: {
        station: {
          select: {
            id: true,
            stationName: true,
            district: true,
            state: true,
          },
        },
      },
    });

    if (!policeUser || !policeUser.isActive) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await bcrypt.compare(password, policeUser.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const { accessToken, refreshToken } = generatePoliceTokens(
      policeUser.id, 
      policeUser.stationId, 
      policeUser.role
    );

    await prisma.policeUser.update({
      where: { id: policeUser.id },
      data: { 
        lastLogin: new Date(),
        refreshToken: await bcrypt.hash(refreshToken, 8),
      },
    });

    setPoliceAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: 'Login successful',
      officer: {
        id: policeUser.id,
        name: policeUser.name,
        email: policeUser.email,
        role: policeUser.role,
        station: policeUser.station,
      },
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/police/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.policeRefreshToken;
    if (!refreshToken) throw new AppError('Refresh token required', 401, 'NO_TOKEN');

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const policeUser = await prisma.policeUser.findUnique({
      where: { id: decoded.policeUserId },
    });

    if (!policeUser || !policeUser.isActive || !policeUser.refreshToken) {
      throw new AppError('Invalid session', 401, 'INVALID_SESSION');
    }

    const isValidRefresh = await bcrypt.compare(refreshToken, policeUser.refreshToken);
    if (!isValidRefresh) {
      await prisma.policeUser.update({
        where: { id: policeUser.id },
        data: { refreshToken: null },
      });
      throw new AppError('Session compromised', 401, 'TOKEN_REUSE');
    }

    const { accessToken, refreshToken: newRefresh } = generatePoliceTokens(
      policeUser.id,
      policeUser.stationId,
      policeUser.role
    );

    await prisma.policeUser.update({
      where: { id: policeUser.id },
      data: { refreshToken: await bcrypt.hash(newRefresh, 8) },
    });

    setPoliceAuthCookies(res, accessToken, newRefresh);
    res.json({ message: 'Token refreshed', accessToken });
  } catch (error) {
    next(error);
  }
});

// POST /api/police/auth/logout
router.post('/logout', authenticatePolice, async (req, res, next) => {
  try {
    await prisma.policeUser.update({
      where: { id: req.policeUser.id },
      data: { refreshToken: null },
    });
    res.clearCookie('policeAccessToken');
    res.clearCookie('policeRefreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/police/auth/register (Global/Super/Station Admin)
router.post('/register', authenticatePolice, requireRole('GLOBAL_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN'), async (req, res, next) => {
  try {
    const { name, email, password, role, stationId } = req.body;
    
    // Determine the station ID based on the requester's role
    let targetStationId = null;
    if (req.policeUser.role === 'GLOBAL_ADMIN') {
      targetStationId = stationId || null; // Can be null for other Global Admins
    } else if (req.policeUser.role === 'SUPER_ADMIN') {
      targetStationId = stationId || req.stationId;
    } else {
      targetStationId = req.stationId;
    }

    // Role restrictions
    if (req.policeUser.role === 'STATION_ADMIN') {
      if (!['OFFICER'].includes(role)) {
        throw new AppError('Station Admins can only create officers', 403, 'FORBIDDEN');
      }
    } else if (req.policeUser.role === 'SUPER_ADMIN') {
      if (!['OFFICER', 'STATION_ADMIN'].includes(role)) {
        throw new AppError('Super Admins can only create Officers or Station Admins', 403, 'FORBIDDEN');
      }
    }

    const existing = await prisma.policeUser.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(password, 12);
    
    const newOfficer = await prisma.policeUser.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        stationId: targetStationId,
        isActive: true,
      },
    });

    res.status(201).json({
      message: 'Officer registered successfully',
      officer: {
        id: newOfficer.id,
        name: newOfficer.name,
        email: newOfficer.email,
        role: newOfficer.role,
        stationId: newOfficer.stationId,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
