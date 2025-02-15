const config = {
  port: process.env.PORT || 3002,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/messaging'
  },
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379
  }
};

export default config;
