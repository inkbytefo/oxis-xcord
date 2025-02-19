import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors';
import { getRedisConnection } from '../config/redis';
import { config } from '../config';
import { promisify } from 'util';
import { Redis, ChainableCommander } from 'ioredis';

const redis = getRedisConnection();
const sleep = promisify(setTimeout);

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  keyGenerator?: (req: RequestWithUser) => string;
  errorHandler?: (req: RequestWithUser, res: Response, next: NextFunction, error: Error) => void;
  skipFailedRequests?: boolean;
  requestTimeout?: number;
}

interface RateLimitResult {
  totalHits: number;
  isRateLimited: boolean;
  remaining: number;
  resetTime: number;
}

interface RequestWithUser extends Request {
  user?: {
    id: string;
  };
}

class RateLimiter {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly keyPrefix: string;
  private keyGenerator?: (req: RequestWithUser) => string;
  private readonly errorHandler: (req: RequestWithUser, res: Response, next: NextFunction, error: Error) => void;
  private readonly skipFailedRequests: boolean;
  private readonly requestTimeout: number;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.max = options.max || 30;
    this.keyPrefix = options.keyPrefix || 'rl:';
    this.keyGenerator = options.keyGenerator;
    this.errorHandler = options.errorHandler || this.defaultErrorHandler;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.requestTimeout = options.requestTimeout || 5000;
  }

  async handleRateLimit(key: string, skipIncrement = false): Promise<RateLimitResult> {
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

      const totalHits = (results[2][1] as number) || 0;

      return {
        totalHits,
        isRateLimited: totalHits > this.max,
        remaining: Math.max(0, this.max - totalHits),
        resetTime: Math.ceil((now + this.windowMs) / 1000)
      };
    } catch (error) {
      console.error('Rate limit kontrolü hatası:', error);
      if (this.skipFailedRequests) {
        return { totalHits: 0, isRateLimited: false, remaining: this.max, resetTime: 0 };
      }
      throw error;
    }
  }

  private defaultErrorHandler(req: RequestWithUser, res: Response, next: NextFunction, error: Error): void {
    console.error('Rate limiter hatası:', error);
    next(new RateLimitError());
  }

  middleware() {
    return async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
      if (!this.keyGenerator) {
        this.keyGenerator = (req) => {
          return req.user ? `${this.keyPrefix}user:${req.user.id}` : `${this.keyPrefix}ip:${req.ip}`;
        };
      }

      const key = this.keyGenerator(req);
      
      try {
        const result = await Promise.race([
          this.handleRateLimit(key),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Rate limit timeout')), this.requestTimeout)
          )
        ]);

        // Response headers'a rate limit bilgisi ekle
        res.set({
          'X-RateLimit-Limit': String(this.max),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime)
        });

        if (result.isRateLimited) {
          res.set('Retry-After', String(Math.ceil(this.windowMs / 1000)));
          throw new RateLimitError();
        }

        next();
      } catch (error) {
        this.errorHandler(req, res, next, error as Error);
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
export const checkRateLimit = async (
  key: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> => {
  const limiter = new RateLimiter({ windowMs, max });
  return await limiter.handleRateLimit(key, true);
};