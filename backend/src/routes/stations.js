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

// POST /api/stations - GLOBAL_ADMIN creates station
router.post('/', authenticatePolice, requireRole('GLOBAL_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { stationName, district, state, latitude, longitude, radiusKm, contactNumber } = req.body;
    
    const station = await prisma.policeStation.create({
      data: { 
        stationName, 
        district, 
        state, 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude), 
        radiusKm: parseFloat(radiusKm) || 5, 
        contactNumber 
      },
    });

    res.status(201).json({ message: 'Station created successfully', station });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/stations/:id - Update station (Geofence, Status, Info)
router.patch('/:id', authenticatePolice, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stationName, district, state, latitude, longitude, radiusKm, contactNumber, status } = req.body;

    // STATION_ADMIN can only update their own station
    if (req.policeUser.role === 'STATION_ADMIN' && req.policeUser.stationId !== id) {
      throw new AppError('Unauthorized: Station Admin can only update their own station', 403, 'FORBIDDEN');
    }

    // Only high roles can update
    if (!['GLOBAL_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN'].includes(req.policeUser.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const updateData = {};
    if (stationName) updateData.stationName = stationName;
    if (district) updateData.district = district;
    if (state) updateData.state = state;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (radiusKm !== undefined) updateData.radiusKm = parseFloat(radiusKm);
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (status !== undefined) updateData.status = !!status;

    const updated = await prisma.policeStation.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: 'Station updated successfully', station: updated });
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
