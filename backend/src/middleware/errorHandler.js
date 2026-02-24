const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.clientIP,
  });

  const response = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

module.exports = { errorHandler, AppError };
