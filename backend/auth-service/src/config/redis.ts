import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Check Redis connection status
redis.on('connect', () => {
  logger.info('Redis connection successful');
});

redis.on('error', (error: Error) => {
  logger.error('Redis connection error:', error);
});

export { redis };