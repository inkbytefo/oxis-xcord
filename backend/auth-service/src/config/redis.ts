import { Redis, RedisOptions } from 'ioredis';
import { config } from './index';

interface RedisConnectionOptions extends RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
}

// Redis URL'den bağlantı detaylarını çıkar
const parseRedisUrl = (url: string): { host: string; port: number; password?: string } => {
  const match = url.match(/redis:\/\/(?:([^@]*)@)?([^:]+):(\d+)/);
  if (!match) {
    throw new Error('Geçersiz Redis URL formatı');
  }

  const [, auth, host, port] = match;
  return {
    host,
    port: parseInt(port, 10),
    ...(auth ? { password: auth } : {})
  };
};

class RedisConnectionPool {
  private pool: Redis | null = null;
  private readonly options: RedisConnectionOptions;

  constructor() {
    const connectionInfo = parseRedisUrl(config.redis.url);

    this.options = {
      ...connectionInfo,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number): number | void => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    };
  }

  getConnection(): Redis {
    if (!this.pool) {
      this.pool = new Redis({
        ...this.options,
        keyPrefix: config.redis.prefix
      });

      this.pool.on('error', (error: Error) => {
        console.error('Redis bağlantı hatası:', error);
      });

      this.pool.on('connect', () => {
        console.info('Redis bağlantısı kuruldu');
      });
    }
    return this.pool;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.quit();
      this.pool = null;
    }
  }
}

export const redisPool = new RedisConnectionPool();

export const getRedisConnection = (): Redis => redisPool.getConnection();

// Graceful shutdown için
export const closeRedisConnection = async (): Promise<void> => {
  await redisPool.close();
};