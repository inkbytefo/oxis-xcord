import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import routes from './routes/index.js';
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

const app = express();

// Trust proxy if enabled
if (config.security.trustProxy) {
  app.enable('trust proxy');
}

// Basic security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
}));

// CORS configuration
app.use(cors(config.cors));

// Request parsing
app.use(express.json({ limit: config.security.maxBodySize }));
app.use(express.urlencoded({ extended: true, limit: config.security.maxBodySize }));

// Compression
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip
    });
  });
  next();
});

// Rate limiting
app.use(rateLimiter);

// API Routes
app.use('/api', routes);

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'API Gateway',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Environment:', config.nodeEnv);
  logger.info('Service URLs:', config.services);
});
