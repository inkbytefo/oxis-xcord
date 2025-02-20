import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Redis bağlantı durumunu kontrol et
redis.on('connect', () => {
  console.info('Redis bağlantısı başarılı');
});

redis.on('error', (error) => {
  console.error('Redis bağlantı hatası:', error);
});

export default redis;