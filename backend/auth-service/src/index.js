import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import { errorHandler, logRequest, logger } from './middleware/error.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(logRequest);

// MongoDB connection
mongoose.connect(config.mongodb.uri, config.mongodb.options)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1); // Uygulamayı durdur
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
