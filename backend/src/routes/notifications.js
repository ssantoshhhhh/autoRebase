const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/prisma');
const { authenticateUser } = require('../middleware/auth');

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    res.json({ notifications, total, unreadCount });
  } catch (error) {
    next(error);
  }
});

router.patch('/mark-read', authenticateUser, async (req, res, next) => {
  try {
    const { ids } = req.body;
    await prisma.notification.updateMany({
      where: { userId: req.user.id, id: { in: ids } },
      data: { isRead: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
