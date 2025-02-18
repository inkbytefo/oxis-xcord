import Redis from 'ioredis';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', err => logger.error('Redis connection error:', err));

// Rate limit configuration - Auth service spesifik limitler
const WINDOW_SIZE_IN_SECONDS = 300; // 5 dakika
const MAX_REQUESTS_PER_WINDOW = 20; // 5 dakika içinde 20 istek

export const rateLimiter = async (req, res, next) => {
  const identifier = req.ip; // IP bazlı rate limiting
  const key = `rateLimit:auth:${identifier}`;
  
  try {
    let currentCount = await redisClient.get(key);
    
    if (currentCount === null) {
      await redisClient.setEx(key, WINDOW_SIZE_IN_SECONDS, 1);
      return next();
    }
    
    const count = parseInt(currentCount);
    if (count >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: WINDOW_SIZE_IN_SECONDS
      });
    }
    
    await redisClient.multi()
      .incr(key)
      .expire(key, WINDOW_SIZE_IN_SECONDS)
      .exec();
    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
