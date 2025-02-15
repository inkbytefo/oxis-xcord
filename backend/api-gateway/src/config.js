export default {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  
  // Servis URL'leri
  SERVICES: {
    AUTH: {
      URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      PREFIX: '/auth'
    },
    MESSAGING: {
      URL: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3002',
      PREFIX: '/messaging'
    },
    VOICE: {
      URL: process.env.VOICE_SERVICE_URL || 'http://localhost:3003',
      PREFIX: '/voice'
    },
    SERVER_MANAGEMENT: {
      URL: process.env.SERVER_MANAGEMENT_SERVICE_URL || 'http://localhost:3004', // Port güncellendi: 3004
      PREFIX: '/servers'
    }
  },

  // Rate limiting ayarları
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 dakika
    MAX_REQUESTS: 100
  },

  // Circuit breaker ayarları
  circuitBreaker: {
    requestTimeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  }
};
