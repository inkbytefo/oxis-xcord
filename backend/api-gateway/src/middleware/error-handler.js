import winston from 'winston';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Error details:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Determine error type and appropriate response
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request data',
      details: err.details,
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'ServiceUnavailableError') {
    return res.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE'
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    status: 'error',
    message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
};
