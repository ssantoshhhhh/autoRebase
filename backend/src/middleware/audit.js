const { prisma } = require('../utils/prisma');

// Lightweight audit middleware - records API access
const auditMiddleware = async (req, res, next) => {
  const originalSend = res.json.bind(res);
  
  res.json = function(data) {
    // Log significant actions asynchronously (non-blocking)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      setImmediate(async () => {
        try {
          const userType = req.userType || 'CITIZEN';
          const userId = req.user?.id || null;
          const policeUserId = req.policeUser?.id || null;
          
          if (userId || policeUserId) {
            await prisma.auditLog.create({
              data: {
                userType,
                userId: userType === 'CITIZEN' ? userId : null,
                policeUserId: userType === 'POLICE' ? policeUserId : null,
                action: `${req.method} ${req.path}`,
                resourceType: req.path.split('/')[3] || null,
                resourceId: req.params?.id || null,
                ipAddress: req.clientIP,
                metadata: {
                  statusCode: res.statusCode,
                  userAgent: req.headers['user-agent'],
                },
              },
            });
          }
        } catch (e) {
          // Audit failures should not break the app
        }
      });
    }
    
    return originalSend(data);
  };
  
  next();
};

module.exports = { auditMiddleware };
