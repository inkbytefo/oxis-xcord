import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import passport from 'passport';
import { Server } from 'http';
import { Redis } from 'ioredis';
import { logger } from './utils/logger.js';
import { authRoutes } from './routes/authRoutes.js';
import { authenticate } from './middleware/authenticate.js';
import { config } from './config/index.js';
import { AuthRequest } from './types/index.js';
import { testConnection as testDBConnection } from './config/database.js';
import { redis } from './config/redis.js';

// Create Express application
const app = express();

// Configure middleware
app.use(bodyParser.json());
app.use(cors({
  origin: config.server.cors.origin,
  methods: config.server.cors.methods,
  credentials: true
}));

// Initialize Passport
app.use(passport.initialize());

// Health check endpoint
const healthCheckHandler: RequestHandler = (_req, res) => {
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString()
  });
};
app.get('/health', healthCheckHandler);

// Metrics endpoint
const metricsHandler: RequestHandler = (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.status(200).send(`
    # HELP auth_login_attempts_total Total login attempts
    auth_login_attempts_total ${global.loginAttempts || 0}
    # HELP auth_login_failures_total Failed login attempts
    auth_login_failures_total ${global.loginFailures || 0}
    # HELP auth_active_sessions Active sessions
    auth_active_sessions ${global.activeSessions || 0}
  `);
};
app.get('/metrics', metricsHandler);

// Add auth routes
app.use('/auth', authRoutes);

// Protected route example
const protectedHandler: RequestHandler = (_req: Request, res: Response) => {
  res.json({ message: 'This is a protected endpoint' });
};
app.get('/protected', authenticate as RequestHandler, protectedHandler);

// Error handling middleware
const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Application error:', err);
  res.status(500).json({
    error: true,
    message: 'Server error'
  });
};
app.use(errorHandler);

// 404 handler for unknown routes
const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint not found'
  });
};
app.use(notFoundHandler);

// Check connections and start server
const startServer = async () => {
  try {
    // Check PostgreSQL connection
    await testDBConnection();

    // Check Redis connection
    await new Promise<void>((resolve, reject) => {
      redis.ping((err: Error | null) => {
        if (err) {
          logger.error('Redis connection error:', err);
          reject(err);
        } else {
          logger.info('Redis connection successful');
          resolve();
        }
      });
    });

    // Start server
    const PORT = config.server.port;
    const server: Server = app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('SIGTERM signal received. Shutting down server...');
      server.close(() => {
        logger.info('Server shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Server failed to start:', error);
    process.exit(1);
  }
};

// Start server
startServer();

export { app };