import { Redis } from 'ioredis';
import { config } from './index.js';

class RedisConnectionPool {
  constructor() {
    this.pool = null;
    this.options = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
  }

  getConnection() {
    if (!this.pool) {
      this.pool = new Redis({
        ...this.options,
        keyPrefix: config.redis.prefix
      });

      this.pool.on('error', (error) => {
        console.error('Redis bağlantı hatası:', error);
      });

      this.pool.on('connect', () => {
        console.info('Redis bağlantısı kuruldu');
      });
    }
    return this.pool;
  }
}

export const redisPool = new RedisConnectionPool();
export const getRedisConnection = () => redisPool.getConnection();