const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');

// Citizen authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        isVerified: true,
        language: true,
        isAnonymous: true,
      },
    });

    if (!user || !user.isVerified) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    req.userType = 'CITIZEN';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Police authentication middleware
const authenticatePolice = async (req, res, next) => {
  try {
    const token = req.cookies.policeAccessToken || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Police authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    if (decoded.type !== 'POLICE') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const policeUser = await prisma.policeUser.findUnique({
      where: { id: decoded.policeUserId },
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
      return res.status(401).json({ error: 'Invalid or inactive police account' });
    }

    req.policeUser = policeUser;
    req.stationId = policeUser.stationId;
    req.userType = 'POLICE';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control for police
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.policeUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.policeUser.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }
    
    next();
  };
};

// Station-scoped data isolation middleware
const enforceStationScope = (req, res, next) => {
  if (!req.stationId) {
    return res.status(403).json({ error: 'Station context required' });
  }
  
  // Inject station filter into all queries
  req.stationFilter = { stationId: req.stationId };
  next();
};

// Super admin bypass (can see all stations)
const superAdminScope = (req, res, next) => {
  if (req.policeUser?.role === 'SUPER_ADMIN' || req.policeUser?.role === 'GLOBAL_ADMIN') {
    req.stationFilter = {};
  } else {
    req.stationFilter = { stationId: req.stationId };
  }
  next();
};

module.exports = { 
  authenticateUser, 
  authenticatePolice, 
  requireRole, 
  enforceStationScope,
  superAdminScope,
};
