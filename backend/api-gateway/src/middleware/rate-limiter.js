import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

// Create custom rate limiter with configurable options
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    retry_after: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind proxy, otherwise use IP
    return req.headers['x-forwarded-for'] || req.ip;
  }
});
