import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 500, 2000);
    logger.info(`Retrying Redis connection in ${delay}ms...`);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

redis.on('error', (error: Error) => {
  logger.error('Redis connection error:', error);
});

export { redis };