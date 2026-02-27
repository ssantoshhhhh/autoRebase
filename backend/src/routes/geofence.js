const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');

// GET /api/geofence/check?lat=&lng=
router.get('/check', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required' });

    const stations = await prisma.policeStation.findMany({ where: { status: true } });
    
    let matchedStation = null;
    let nearestStation = null;
    let minDistanceMatched = Infinity;
    let minDistanceNearest = Infinity;

    for (const station of stations) {
      const dist = haversineDistance(parseFloat(lat), parseFloat(lng), station.latitude, station.longitude);
      
      // Track absolute nearest station
      if (dist < minDistanceNearest) {
        minDistanceNearest = dist;
        nearestStation = { ...station, distanceKm: parseFloat(dist.toFixed(2)) };
      }

      // Track nearest station whose geofence actually contains the user (with 0.1km buffer)
      if (dist <= (station.radiusKm + 0.1) && dist < minDistanceMatched) {
        minDistanceMatched = dist;
        matchedStation = { ...station, distanceKm: parseFloat(dist.toFixed(2)) };
      }
    }

    res.json({
      withinGeofence: matchedStation !== null,
      station: matchedStation || nearestStation,
      routedToDefault: matchedStation === null,
    });
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
