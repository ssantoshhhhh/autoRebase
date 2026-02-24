const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');
const { authenticateUser } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// GET /api/users/me - Get current user profile
router.get('/me', authenticateUser, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        policeStation: {
          select: {
            id: true,
            stationName: true,
            district: true,
          }
        }
      }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/profile - Update user profile details
router.patch('/profile', authenticateUser, async (req, res, next) => {
  try {
    const { name, mobileNumber, latitude, longitude, language } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (language !== undefined) updateData.language = language;

    // If location is updated, recalculate geofence
    if (latitude && longitude) {
      const stations = await prisma.policeStation.findMany({ where: { status: true } });
      let matchedStationId = null;
      let minDistance = Infinity;

      for (const station of stations) {
        const dist = haversineDistance(parseFloat(latitude), parseFloat(longitude), station.latitude, station.longitude);
        if (dist <= station.radiusKm && dist < minDistance) {
          minDistance = dist;
          matchedStationId = station.id;
        }
      }
      updateData.geofenceId = matchedStationId;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
    });

    res.json({ user: updatedUser });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('Mobile number already in use', 400, 'DUPLICATE_MOBILE'));
    }
    next(error);
  }
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

module.exports = router;
