import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    retry_after: Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000)
  },
  skip: (req) => {
    return req.path === '/health';
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip;
  }
});
