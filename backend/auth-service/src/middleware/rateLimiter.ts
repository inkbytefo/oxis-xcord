import rateLimit, { Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response, RequestHandler } from 'express';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

const createRateLimiter = (options: RateLimitOptions): RequestHandler => {
  const {
    windowMs = 60 * 1000, // Default: 1 minute
    max = 5, // Default: 5 requests
    message = 'Too many requests, please try again later.'
  } = options;

  // Ensure Redis is available
  if (!redis.status || redis.status !== 'ready') {
    logger.error('Redis is not available for rate limiting');
    throw new Error('Redis connection is required for rate limiting');
  }

  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rate-limit:'
    }),
    windowMs,
    max,
    statusCode: 429,
    message: {
      status: 429,
      message
    },
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: true,
        message
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting in development environment
      return process.env.NODE_ENV === 'development';
    },
    keyGenerator: (req: Request) => {
      // Generate unique key based on IP and endpoint
      return `${req.ip}:${req.originalUrl}`;
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
  } as Options);
};

export default createRateLimiter;