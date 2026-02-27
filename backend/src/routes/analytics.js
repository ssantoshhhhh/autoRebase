const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');
const { authenticatePolice, requireRole, superAdminScope } = require('../middleware/auth');

router.use(authenticatePolice);

// GET /api/analytics/overview
router.get('/overview', superAdminScope, async (req, res, next) => {
  try {
    const filter = req.stationFilter;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalComplaints,
      byPriority,
      byStatus,
      recentTrend,
      byIncidentType,
      
      avgResolutionTime,
    ] = await Promise.all([
      prisma.complaint.count({ where: filter }),
      prisma.complaint.groupBy({
        by: ['priorityLevel'],
        where: filter,
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['status'],
        where: filter,
        _count: { id: true },
      }),
      prisma.complaint.groupBy({
        by: ['incidentType'],
        where: { ...filter, incidentType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      prisma.complaint.findMany({
        where: { ...filter, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, priorityLevel: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
        FROM complaints 
        WHERE status IN ('RESOLVED', 'CLOSED')
      `,
    ]);

    res.json({
      totalComplaints,
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priorityLevel] = item._count.id;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {}),
      topIncidentTypes: byIncidentType.map(i => ({
        type: i.incidentType,
        count: i._count.id,
      })),
      recentTrend: groupByDay(recentTrend),
    });
  } catch (error) {
    next(error);
  }
});

function groupByDay(complaints) {
  const grouped = {};
  complaints.forEach(c => {
    const day = c.createdAt.toISOString().split('T')[0];
    grouped[day] = (grouped[day] || 0) + 1;
  });
  return Object.entries(grouped).map(([date, count]) => ({ date, count }));
}

module.exports = router;
