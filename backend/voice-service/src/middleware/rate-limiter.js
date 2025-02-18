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

// Voice service için özel rate limit ayarları
const ROOM_JOIN_WINDOW = 60; // 1 dakika
const MAX_ROOM_JOINS = 5; // 1 dakika içinde maksimum 5 oda değişimi
const SIGNAL_WINDOW = 10; // 10 saniye
const MAX_SIGNALS = 30; // 10 saniye içinde maksimum 30 sinyal

export const roomJoinRateLimiter = async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error('Authentication required'));
  }

  const key = `rateLimit:voice:roomJoin:${userId}`;

  try {
    const currentCount = await redisClient.get(key);

    if (currentCount === null) {
      await redisClient.setEx(key, ROOM_JOIN_WINDOW, 1);
      return next();
    }

    const count = parseInt(currentCount);
    if (count >= MAX_ROOM_JOINS) {
      return next(new Error('Too many room changes. Please wait before joining another room.'));
    }

    await redisClient.incr(key);
    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    next(new Error('Internal server error'));
  }
};

export const signalRateLimiter = async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error('Authentication required'));
  }

  const key = `rateLimit:voice:signal:${userId}`;

  try {
    const currentCount = await redisClient.get(key);

    if (currentCount === null) {
      await redisClient.setEx(key, SIGNAL_WINDOW, 1);
      return next();
    }

    const count = parseInt(currentCount);
    if (count >= MAX_SIGNALS) {
      return next(new Error('Too many signals. Please wait before sending more.'));
    }

    await redisClient.incr(key);
    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    next(new Error('Internal server error'));
  }
};