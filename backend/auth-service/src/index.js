import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import { errorHandler, logRequest, logger } from './middleware/error.js';
import sequelize from './config/database.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(logRequest);

// Database connection
sequelize.authenticate()
  .then(() => {
    logger.info('Connected to PostgreSQL database');
    return sequelize.sync();
  })
  .then(() => {
    logger.info('Database synchronized');
  })
  .catch(err => {
    logger.error('Database connection error:', err);
    process.exit(1);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  logger.info(`Auth service running on port ${config.port}`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});
