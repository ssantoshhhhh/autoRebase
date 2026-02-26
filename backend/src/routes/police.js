const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');
const {
  authenticatePolice,
  requireRole,
  enforceStationScope,
  superAdminScope,
} = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { sendSMS } = require('../services/smsService');
const { logger } = require('../utils/logger');

// All police routes require authentication
router.use(authenticatePolice);

// GET /api/police/dashboard
// Station dashboard summary
router.get('/dashboard', enforceStationScope, async (req, res, next) => {
  try {
    const filter = req.stationFilter;

    const [total, emergency, pending, inProgress, resolved, highPriority, recent] =
      await Promise.all([
        prisma.complaint.count({ where: filter }),
        prisma.complaint.count({
          where: { ...filter, isEmergency: true, status: { not: 'CLOSED' } },
        }),
        prisma.complaint.count({ where: { ...filter, status: { in: ['FILED', 'UNDER_REVIEW'] } } }),
        prisma.complaint.count({ where: { ...filter, status: 'IN_PROGRESS' } }),
        prisma.complaint.count({ where: { ...filter, status: { in: ['RESOLVED', 'CLOSED'] } } }),
        prisma.complaint.count({
          where: { ...filter, priorityLevel: { in: ['EMERGENCY', 'HIGH'] } },
        }),
        prisma.complaint.findMany({
          where: { ...filter, status: { not: 'CLOSED' } },
          select: {
            id: true,
            trackingId: true,
            incidentType: true,
            priorityLevel: true,
            priorityScore: true,
            isEmergency: true,
            status: true,
            locationAddress: true,
            createdAt: true,
            user: { select: { name: true, mobileNumber: true } },
            assignedOfficer: { select: { name: true } },
          },
          orderBy: [{ isEmergency: 'desc' }, { priorityScore: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        }),
      ]);

    res.json({
      stats: { total, emergency, pending, inProgress, resolved, highPriority },
      recentComplaints: recent,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/police/complaints
// List complaints with filtering and pagination
router.get('/complaints', enforceStationScope, async (req, res, next) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { ...req.stationFilter };

    if (status) where.status = status;
    if (priority) where.priorityLevel = priority;
    if (assignedTo === 'me') where.assignedOfficerId = req.policeUser.id;
    if (assignedTo === 'unassigned') where.assignedOfficerId = null;

    if (search) {
      where.OR = [
        { trackingId: { contains: search, mode: 'insensitive' } },
        { incidentType: { contains: search, mode: 'insensitive' } },
        { summaryText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          user: { select: { name: true, mobileNumber: true, isAnonymous: true } },
          assignedOfficer: { select: { name: true, email: true } },
          evidence: { select: { id: true, fileType: true } },
          _count: { select: { updates: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit),
      }),
      prisma.complaint.count({ where }),
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

// GET /api/police/complaints/:id
// Full complaint detail
router.get('/complaints/:id', enforceStationScope, async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findFirst({
      where: {
        id: req.params.id,
        ...req.stationFilter,
      },
      include: {
        user: {
          select: {
            name: true,
            mobileNumber: true,
            aadhaarMasked: true,
            isAnonymous: true,
            complaintCount: true,
            riskFlagCount: true,
          },
        },
        assignedOfficer: { select: { name: true, email: true } },
        evidence: true,
        updates: { orderBy: { createdAt: 'asc' } },
        station: { select: { stationName: true, district: true } },
      },
    });

    if (!complaint) throw new AppError('Complaint not found or access denied', 404, 'NOT_FOUND');

    res.json(complaint);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/police/complaints/:id/assign
router.patch(
  '/complaints/:id/assign',
  enforceStationScope,
  requireRole('STATION_ADMIN', 'SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const { officerId } = req.body;

      // Verify officer belongs to same station
      const officer = await prisma.policeUser.findFirst({
        where: { id: officerId, stationId: req.stationId },
      });

      if (!officer) throw new AppError('Officer not found in your station', 404, 'NOT_FOUND');

      const complaint = await prisma.complaint.findFirst({
        where: { id: req.params.id, ...req.stationFilter },
      });
      if (!complaint) throw new AppError('Complaint not found', 404, 'NOT_FOUND');

      const updated = await prisma.complaint.update({
        where: { id: req.params.id },
        data: {
          assignedOfficerId: officerId,
          status: 'ASSIGNED',
        },
      });

      await prisma.complaintUpdate.create({
        data: {
          complaintId: complaint.id,
          updatedBy: req.policeUser.id,
          updateType: 'ASSIGNMENT',
          content: `Assigned to officer: ${officer.name}`,
        },
      });

      res.json({ message: 'Complaint assigned', complaint: updated });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/police/complaints/:id/status
router.patch('/complaints/:id/status', enforceStationScope, async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const validStatuses = [
      'UNDER_REVIEW',
      'ASSIGNED',
      'IN_PROGRESS',
      'ESCALATED',
      'RESOLVED',
      'CLOSED',
      'REJECTED',
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400, 'INVALID_STATUS');
    }

    const complaint = await prisma.complaint.findFirst({
      where: { id: req.params.id, ...req.stationFilter },
    });
    if (!complaint) throw new AppError('Not found or access denied', 404, 'NOT_FOUND');

    // Only admins can escalate or reject
    if (
      ['ESCALATED', 'REJECTED'].includes(status) &&
      !['STATION_ADMIN', 'SUPER_ADMIN'].includes(req.policeUser.role)
    ) {
      throw new AppError('Insufficient permissions for this status change', 403, 'FORBIDDEN');
    }

    const [updated] = await Promise.all([
      prisma.complaint.update({
        where: { id: req.params.id },
        data: { status },
      }),
      prisma.complaintUpdate.create({
        data: {
          complaintId: req.params.id,
          updatedBy: req.policeUser.id,
          updateType: 'STATUS_CHANGE',
          content: `Status changed to ${status}${note ? ': ' + note : ''}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: complaint.userId,
          complaintId: complaint.id,
          type: 'STATUS_UPDATE',
          message: `Your complaint (${complaint.trackingId}) status updated to: ${status}`,
        },
      }),
    ]);

    // Notify citizen via SMS
    const citizen = await prisma.user.findUnique({ where: { id: complaint.userId } });
    if (citizen && citizen.mobileNumber) {
      const smsBody = `REVA UPDATE: Your complaint ${complaint.trackingId} status changed to ${status}. Visit portal for details.`;
      sendSMS(citizen.mobileNumber, smsBody).catch((e) => logger.error('Status SMS failed:', e));
    }

    res.json({ message: 'Status updated', complaint: updated });
  } catch (error) {
    next(error);
  }
});

// POST /api/police/complaints/:id/notes
router.post('/complaints/:id/notes', enforceStationScope, async (req, res, next) => {
  try {
    const { note } = req.body;
    if (!note) throw new AppError('Note content required', 400, 'MISSING_NOTE');

    const complaint = await prisma.complaint.findFirst({
      where: { id: req.params.id, ...req.stationFilter },
    });
    if (!complaint) throw new AppError('Not found', 404, 'NOT_FOUND');

    const update = await prisma.complaintUpdate.create({
      data: {
        complaintId: req.params.id,
        updatedBy: req.policeUser.id,
        updateType: 'INTERNAL_NOTE',
        content: note,
      },
    });

    res.json({ message: 'Note added', update });
  } catch (error) {
    next(error);
  }
});

// GET /api/police/officers
router.get(
  '/officers',
  requireRole('GLOBAL_ADMIN', 'SUPER_ADMIN', 'STATION_ADMIN'),
  async (req, res, next) => {
    try {
      const { stationId } = req.query;
      let where = {};

      if (req.policeUser.role === 'GLOBAL_ADMIN') {
        // Global Admin can see all or filter by station
        where = stationId ? { stationId } : {};
      } else if (req.policeUser.role === 'SUPER_ADMIN') {
        // Super Admin can also see all or filter by station
        where = stationId ? { stationId } : {};
      } else {
        // Station Admin and others are restricted to their own station
        where = { stationId: req.stationId };
      }

      const officers = await prisma.policeUser.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          stationId: true,
          station: { select: { id: true, stationName: true } },
          _count: { select: { assignedComplaints: true } },
        },
        orderBy: { name: 'asc' },
      });

      res.json({ officers });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/police/me
router.get('/me', async (req, res) => {
  res.json({
    officer: {
      id: req.policeUser.id,
      name: req.policeUser.name,
      email: req.policeUser.email,
      role: req.policeUser.role,
      station: req.policeUser.station,
      lastLogin: req.policeUser.lastLogin,
    },
  });
});

// PATCH /api/police/station
// Update station details like radiusKm
router.patch(
  '/station',
  enforceStationScope,
  requireRole('STATION_ADMIN', 'SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const { radiusKm, contactNumber } = req.body;

      if (radiusKm && (isNaN(radiusKm) || radiusKm <= 0)) {
        throw new AppError('Invalid radius value', 400, 'INVALID_VALUE');
      }

      const updated = await prisma.policeStation.update({
        where: { id: req.stationId },
        data: {
          radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
          contactNumber: contactNumber || undefined,
        },
        select: { id: true, stationName: true, radiusKm: true, contactNumber: true },
      });

      res.json({ message: 'Station details updated', station: updated });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
