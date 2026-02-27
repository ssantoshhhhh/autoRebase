const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../utils/prisma');
const { authenticateUser } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const { sendSMS } = require('../services/smsService');

// POST /api/complaints/start-session
// Initiates an AI complaint intake conversation
router.post('/start-session', authenticateUser, async (req, res, next) => {
  try {
    const { language = 'en', latitude, longitude, isAnonymous = false } = req.body;
    
    let stationId = null;
    let locationAddress = null;

    // Geofence lookup if location provided
    if (latitude && longitude) {
      const station = await findNearestStation(latitude, longitude);
      if (station) {
        stationId = station.id;
        locationAddress = `Near ${station.stationName}, ${station.district}`;
      }
    }

    // AI session initiation removed (since ai-service is being deleted)
    res.json({
      sessionId: uuidv4(),
      greeting: 'Please describe your complaint. What incident would you like to report?',
      stationRouted: stationId !== null,
      stationId,
    });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      // Fallback when AI service is down
      return res.json({
        sessionId: uuidv4(),
        greeting: 'Please describe your complaint. What incident would you like to report?',
        stationRouted: false,
        fallback: true,
      });
    }
    next(error);
  }
});

// POST /api/complaints/chat
// Sends a message to the AI agent
router.post('/chat', authenticateUser, async (req, res, next) => {
  try {
    const { sessionId, message, audioBase64, language } = req.body;
    
    if (!sessionId) throw new AppError('Session ID required', 400, 'NO_SESSION');

    const payload = {
      sessionId,
      userId: req.user.id,
      language: language || req.user.language,
    };

    if (audioBase64) {
      payload.audioBase64 = audioBase64;
    } else if (message) {
      payload.message = message;
    } else {
      throw new AppError('Message or audio required', 400, 'NO_INPUT');
    }

    // Chat logic removed from backend (now handled by frontend directly)
    res.json({
      response: 'Brain link inactive. Message received.',
      stage: 'NARRATIVE',
      isComplete: false,
    });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.json({
        response: 'I am experiencing technical difficulties. Please describe your complaint in detail.',
        stage: 'NARRATIVE',
        isComplete: false,
      });
    }
    next(error);
  }
});

// POST /api/complaints/submit
// Final submission after AI conversation
router.post('/submit', authenticateUser, async (req, res, next) => {
  try {
    const { 
      sessionId, 
      transcript,
      structuredJson,
      latitude, 
      longitude,
      locationAddress,
      legalConfirmed,
      isAnonymous = false,
    } = req.body;

    if (!legalConfirmed) {
      throw new AppError('Legal confirmation required', 400, 'LEGAL_NOT_CONFIRMED');
    }

    const crypto = require('crypto');
    
    // AI-generated summary logic
    const aiSummary = {
      summary: transcript?.slice(0, 500) || 'Manual complaint submission',
      structuredData: structuredJson || {},
      priorityScore: 25,
      priorityLevel: 'MODERATE',
      isEmergency: false,
      incidentType: structuredJson?.incidentType || 'General',
    };

    // --- CYBER SECURITY: INTEGRITY HASHING ---
    // Generate an 'Integrity Hash' (Digital Snapshot) to ensure no tempering
    const integritySnapshot = JSON.stringify({
      transcript,
      structuredJson,
      userId: req.user.id
    });
    const integrityHash = crypto.createHash('sha256').update(integritySnapshot).digest('hex');
    
    // Embed the hash into the structured data for audit/verification
    aiSummary.structuredData.integrity_envelope = {
      hash: integrityHash,
      algorithm: 'SHA-256',
      timestamp: new Date().toISOString()
    };
    // ------------------------------------------

    // Determine station via geofence
    let stationId = structuredJson?.stationId;
    if (!stationId && latitude && longitude) {
      const station = await findNearestStation(latitude, longitude);
      stationId = station?.id;
    }

    if (!stationId) {
      throw new AppError('Please select a police station to file your complaint', 400, 'STATION_REQUIRED');
    }

    const trackingId = `REVA-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // --- CYBER SECURITY: THREAT INTELLIGENCE & AUDIT VAULT ---
    const cyberKeywords = ['phishing', 'fraud', 'hacker', 'scam', 'otp', 'link', 'bullying', 'harassment', 'financial', 'bank'];
    const isCyberRelated = cyberKeywords.some(k => 
      (transcript || '').toLowerCase().includes(k) || 
      (structuredJson?.incidentType || '').toLowerCase().includes(k)
    );

    // Calculate a 'Cyber Threat Score' (0-100)
    let threatScore = isCyberRelated ? 45 : 10;
    if (isCyberRelated && (transcript || '').length > 500) threatScore += 25; // Technical complexity
    if (aiSummary.isEmergency) threatScore += 30;

    // Identify 'Attack Vector'
    let attackVector = 'Social Engineering';
    if ((transcript || '').includes('link') || (transcript || '').includes('email')) attackVector = 'Phishing';
    if ((transcript || '').includes('bank') || (transcript || '').includes('money')) attackVector = 'Financial Fraud';
    if ((transcript || '').includes('password') || (transcript || '').includes('otp')) attackVector = 'Credential Theft';

    // Generate a 'Digital Audit Signature' for Forensics
    const auditSignature = crypto.createHmac('sha256', process.env.JWT_ACCESS_SECRET || 'fallback-secret')
      .update(`${trackingId}|${req.user.id}|${new Date().toISOString()}`)
      .digest('hex');

    aiSummary.structuredData.cyber_forensics = {
      is_cyber_target: isCyberRelated,
      threat_score: threatScore,
      attack_vector: isCyberRelated ? attackVector : 'N/A',
      audit_signature: auditSignature,
      integrity_hash: integrityHash, // Previous integrity check
      forensic_timestamp: new Date().toISOString()
    };

    const complaint = await prisma.complaint.create({
      data: {
        trackingId,
        userId: req.user.id,
        stationId,
        status: aiSummary.priorityLevel === 'EMERGENCY' ? 'FILED' : 'FILED',
        priorityLevel: isCyberRelated && threatScore > 60 ? 'HIGH' : (aiSummary.priorityLevel || 'INFORMATIONAL'),
        priorityScore: threatScore, // Using threat score as priority score
        isEmergency: aiSummary.isEmergency || false,
        incidentType: isCyberRelated ? `Cybercrime: ${attackVector}` : (aiSummary.incidentType || 'General'),
        summaryText: aiSummary.summary,
        structuredJson: aiSummary.structuredData, // Contains forensics envelope
        transcript,
        locationLat: latitude,
        locationLng: longitude,
        locationAddress,
        isAnonymous,
        legalConfirmed: true,
      },
      include: { station: true },
    });

    // Update risk flag count on user
    if (aiSummary.isEmergency) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { riskFlagCount: { increment: 1 } },
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { complaintCount: { increment: 1 } },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        complaintId: complaint.id,
        type: 'STATUS_UPDATE',
        message: `Your complaint has been filed. Tracking ID: ${trackingId}`,
      },
    });

    // Send SMS with Tracking ID
    if (req.user.mobileNumber) {
      const smsBody = `REVA ALERT: Your complaint has been filed. Tracking ID: ${trackingId}. Use this to track status at REVA portal.`;
      sendSMS(req.user.mobileNumber, smsBody).catch(e => logger.error('Deferred SMS failed:', e));
    }

    // Emergency workflow
    if (aiSummary.isEmergency) {
      await prisma.complaintUpdate.create({
        data: {
          complaintId: complaint.id,
          updatedBy: 'SYSTEM',
          updateType: 'EMERGENCY_FLAG',
          content: '⚠️ Emergency complaint flagged for immediate attention',
        },
      });
    }

    res.status(201).json({
      message: 'Complaint filed successfully',
      trackingId,
      complaintId: complaint.id,
      station: complaint.station.stationName,
      priority: complaint.priorityLevel,
      isEmergency: complaint.isEmergency,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/complaints/track/:trackingId
router.get('/track/:trackingId', async (req, res, next) => {
  try {
    const { trackingId } = req.params;
    
    const complaint = await prisma.complaint.findUnique({
      where: { trackingId },
      select: {
        trackingId: true,
        status: true,
        priorityLevel: true,
        incidentType: true,
        locationAddress: true,
        createdAt: true,
        updatedAt: true,
        station: {
          select: { stationName: true, district: true },
        },
        updates: {
          select: { updateType: true, content: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!complaint) {
      throw new AppError('Complaint not found', 404, 'NOT_FOUND');
    }

    res.json(complaint);
  } catch (error) {
    next(error);
  }
});

// GET /api/complaints/my
router.get('/my', authenticateUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where: { userId: req.user.id },
        select: {
          trackingId: true,
          status: true,
          priorityLevel: true,
          isEmergency: true,
          incidentType: true,
          summaryText: true,
          createdAt: true,
          station: { select: { stationName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.complaint.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/complaints/:id
router.get('/:id', authenticateUser, async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        station: { select: { stationName: true, district: true, contactNumber: true } },
        updates: { orderBy: { createdAt: 'asc' } },
        evidence: { select: { id: true, fileType: true, uploadedAt: true } },
      },
    });

    if (!complaint) throw new AppError('Complaint not found', 404, 'NOT_FOUND');

    res.json(complaint);
  } catch (error) {
    next(error);
  }
});

// Helper: find nearest station by coordinates
async function findNearestStation(lat, lng) {
  // Get all active stations and calculate distance
  const stations = await prisma.policeStation.findMany({
    where: { status: true },
  });

  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    const distance = haversineDistance(lat, lng, station.latitude, station.longitude);
    // Added 0.1km buffer for precision
    if (distance <= (station.radiusKm + 0.1) && distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

module.exports = router;
