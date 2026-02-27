require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { auditMiddleware } = require('./middleware/audit');

// Routes
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const policeAuthRoutes = require('./routes/policeAuth');
const policeRoutes = require('./routes/police');
const stationRoutes = require('./routes/stations');
const notificationRoutes = require('./routes/notifications');
const geofenceRoutes = require('./routes/geofence');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const imageAnalysisRoutes = require('./routes/imageAnalysis');
const evidenceRoutes = require('./routes/evidence');
const chatRoutes = require('./routes/chat');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.azure.com", "https://*.microsoft.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Station-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please wait 5 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/auth/send-otp', strictLimiter);
app.use('/api/auth/verify-otp', strictLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// IP tracking middleware
app.use((req, res, next) => {
  req.clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  next();
});

// Audit logging
app.use(auditMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'REVA-AI Backend Gateway',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/police/auth', policeAuthRoutes);
app.use('/api/police', policeRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/geofence', geofenceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/image-analysis', imageAnalysisRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 REVA-AI Backend running on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
