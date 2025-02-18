import { RateLimitError } from '../utils/errors.js';
import { getRedisConnection } from '../config/redis.js';
import { config } from '../config/index.js';
import { promisify } from 'util';

const redis = getRedisConnection();
const sleep = promisify(setTimeout);

class RateLimiter {
  constructor(options) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.max = options.max || 30;
    this.keyPrefix = options.keyPrefix || 'rl:';
    this.keyGenerator = options.keyGenerator;
    this.errorHandler = options.errorHandler || this.defaultErrorHandler;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.requestTimeout = options.requestTimeout || 5000;
  }

  async handleRateLimit(key, skipIncrement = false) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      const multi = redis.multi();
      
      // Atomic işlemler
      multi.zremrangebyscore(key, 0, windowStart);
      if (!skipIncrement) {
        multi.zadd(key, now, `${now}`);
      }
      multi.zcard(key);
      multi.pexpire(key, this.windowMs);

      const results = await multi.exec();
      if (!results) {
        throw new Error('Redis işlemi başarısız');
      }

      const totalHits = results[2][1];

      return {
        totalHits,
        isRateLimited: totalHits > this.max,
        remaining: Math.max(0, this.max - totalHits),
        resetTime: Math.ceil((now + this.windowMs) / 1000)
      };
    } catch (error) {
      console.error('Rate limit kontrolü hatası:', error);
      if (this.skipFailedRequests) {
        return { isRateLimited: false, remaining: this.max };
      }
      throw error;
    }
  }

  defaultErrorHandler(req, res, next, error) {
    console.error('Rate limiter hatası:', error);
    next(new RateLimitError());
  }

  middleware() {
    return async (req, res, next) => {
      if (!this.keyGenerator) {
        this.keyGenerator = (req) => {
          return req.user ? `${this.keyPrefix}user:${req.user.id}` : `${this.keyPrefix}ip:${req.ip}`;
        };
      }

      const key = this.keyGenerator(req);
      
      try {
        const result = await Promise.race([
          this.handleRateLimit(key),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Rate limit timeout')), this.requestTimeout)
          )
        ]);

        // Response headers'a rate limit bilgisi ekle
        res.set({
          'X-RateLimit-Limit': this.max,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': result.resetTime
        });

        if (result.isRateLimited) {
          res.set('Retry-After', Math.ceil(this.windowMs / 1000));
          throw new RateLimitError();
        }

        next();
      } catch (error) {
        this.errorHandler(req, res, next, error);
      }
    };
  }
}

// Önceden tanımlanmış rate limiter'lar
export const loginLimiter = new RateLimiter({
  ...config.rateLimiting.login,
  keyPrefix: 'rl:login:',
  skipFailedRequests: true
});

export const registerLimiter = new RateLimiter({
  ...config.rateLimiting.register,
  keyPrefix: 'rl:register:'
});

export const passwordResetLimiter = new RateLimiter({
  ...config.rateLimiting.passwordReset,
  keyPrefix: 'rl:pwreset:'
});

export const twoFactorLimiter = new RateLimiter({
  ...config.rateLimiting.twoFactor,
  keyPrefix: 'rl:2fa:'
});

// IP bazlı genel rate limiter
export const globalLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: 'rl:global:',
  keyGenerator: (req) => `rl:global:${req.ip}`
});

// Kullanıcı bazlı rate limiter
export const userLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 50,
  keyPrefix: 'rl:user:',
  keyGenerator: (req) => req.user ? `rl:user:${req.user.id}` : `rl:ip:${req.ip}`,
  skipFailedRequests: true
});

// Rate limit durumunu kontrol et
export const checkRateLimit = async (key, windowMs, max) => {
  const limiter = new RateLimiter({ windowMs, max });
  return await limiter.handleRateLimit(key, true);
};