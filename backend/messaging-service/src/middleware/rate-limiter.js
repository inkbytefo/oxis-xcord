import Redis from 'redis';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect().catch(err => logger.error('Redis connection error:', err));

// Rate limit configuration
const WINDOW_SIZE_IN_SECONDS = 60; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30; // 30 messages per minute

export const messageRateLimiter = async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error('Authentication required'));
  }

  const key = `rateLimit:${userId}`;
  
  try {
    // Get current count
    const currentCount = await redisClient.get(key);
    
    if (currentCount === null) {
      // First message in window
      await redisClient.setEx(key, WINDOW_SIZE_IN_SECONDS, 1);
      return next();
    }
    
    const count = parseInt(currentCount);
    if (count >= MAX_MESSAGES_PER_WINDOW) {
      return next(new Error('Rate limit exceeded. Please try again later.'));
    }
    
    // Increment count
    await redisClient.incr(key);
    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    next(new Error('Internal server error'));
  }
};

// HTTP rate limiter middleware
export const httpRateLimiter = async (req, res, next) => {
  const userId = req.user?.id; // Assuming auth middleware sets req.user
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const key = `rateLimit:${userId}`;
  
  try {
    const currentCount = await redisClient.get(key);
    
    if (currentCount === null) {
      await redisClient.setEx(key, WINDOW_SIZE_IN_SECONDS, 1);
      return next();
    }
    
    const count = parseInt(currentCount);
    if (count >= MAX_MESSAGES_PER_WINDOW) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: WINDOW_SIZE_IN_SECONDS
      });
    }
    
    await redisClient.incr(key);
    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
