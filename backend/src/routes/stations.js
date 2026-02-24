const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');
const { authenticatePolice, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// GET /api/stations - Public endpoint to list active stations
router.get('/', async (req, res, next) => {
  try {
    const stations = await prisma.policeStation.findMany({
      where: { status: true },
      select: {
        id: true,
        stationName: true,
        district: true,
        state: true,
        latitude: true,
        longitude: true,
        radiusKm: true,
        contactNumber: true,
      },
    });
    res.json({ stations });
  } catch (error) {
    next(error);
  }
});

// POST /api/stations - Super Admin creates station
router.post('/', authenticatePolice, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { stationName, district, state, latitude, longitude, radiusKm, contactNumber } = req.body;
    
    const station = await prisma.policeStation.create({
      data: { stationName, district, state, latitude, longitude, radiusKm: radiusKm || 5, contactNumber },
    });

    res.status(201).json({ message: 'Station created', station });
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/nearest?lat=&lng=
router.get('/nearest', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) throw new AppError('Coordinates required', 400, 'MISSING_COORDS');

    const stations = await prisma.policeStation.findMany({ where: { status: true } });
    
    let nearest = null;
    let minDistance = Infinity;

    for (const station of stations) {
      const dist = haversineDistance(parseFloat(lat), parseFloat(lng), station.latitude, station.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = { ...station, distanceKm: dist.toFixed(2) };
      }
    }

    res.json({ station: nearest, withinGeofence: nearest && minDistance <= nearest.radiusKm });
  } catch (error) {
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
