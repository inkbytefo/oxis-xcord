import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { rateLimiterMiddleware } from './middleware/rate-limiter';
import { errorHandlerMiddleware } from './middleware/error-handler';
import { validateRequest } from './middleware/validation';
import { router } from './routes';
import { NotFoundError } from './utils/errors';

const app = express();

// Security
app.disable('x-powered-by');
app.use(helmet());
app.use(cors(config.cors));

// Request parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting and auth
app.use(rateLimiterMiddleware);
app.use(authMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use('/api/v1', router);

// Handle 404
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Error handling
app.use(errorHandlerMiddleware);

// Uncaught error handling
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Rejection:', err);
  // Graceful shutdown
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err);
  // Graceful shutdown
  process.exit(1);
});

const server = app.listen(config.port, () => {
  console.log(`API Gateway listening on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received.');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
