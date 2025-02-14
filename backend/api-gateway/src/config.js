export const config = {
  // Server settings
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service URLs
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3002',
    voice: process.env.VOICE_SERVICE_URL || 'http://localhost:3003',
    serverManagement: process.env.SERVER_MANAGEMENT_URL || 'http://localhost:3004'
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  },

  // Circuit breaker settings
  circuitBreaker: {
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    requestTimeout: 3000 // 3 seconds
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Security settings
  security: {
    jwtPublicKey: process.env.JWT_PUBLIC_KEY,
    trustProxy: process.env.TRUST_PROXY === 'true',
    maxBodySize: '1mb'
  }
};
