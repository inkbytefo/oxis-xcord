export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
    },
    messaging: {
      url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3001',
    },
    voice: {
      url: process.env.VOICE_SERVICE_URL || 'http://localhost:3003',
    },
    serverManagement: {
      url: process.env.SERVER_MANAGEMENT_SERVICE_URL || 'http://localhost:3004',
    },
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },
};
