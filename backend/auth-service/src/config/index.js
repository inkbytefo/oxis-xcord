import 'dotenv/config';

const requiredEnvs = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

// Zorunlu env değişkenlerini kontrol et
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Eksik ortam değişkeni: ${env}`);
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true
    }
  },
  database: {
    url: process.env.DATABASE_URL,
    options: {
      logging: process.env.NODE_ENV === 'development',
      pool: {
        max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
        min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  redis: {
    url: process.env.REDIS_URL,
    prefix: 'auth:',
    ttl: {
      session: 60 * 60 * 24 * 7, // 7 gün
      rateLimiting: 60 * 15 // 15 dakika
    }
  },
  jwt: {
    accessToken: {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m'
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d'
    }
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 dakika
  },
  twoFactor: {
    issuer: 'XCord Auth',
    window: 1,
    backupCodeCount: 10,
    backupCodeLength: 10
  },
  rateLimiting: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 dakika
      max: 5 // 5 istek
    },
    register: {
      windowMs: 60 * 60 * 1000, // 1 saat
      max: 3 // 3 istek
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 saat
      max: 3 // 3 istek
    },
    twoFactor: {
      windowMs: 15 * 60 * 1000, // 15 dakika
      max: 3 // 3 istek
    }
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackUrl: process.env.DISCORD_CALLBACK_URL
    }
  },
  email: {
    from: process.env.EMAIL_FROM || 'noreply@xcord.app',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    prefix: 'auth_'
  }
};

// Validasyon regexleri
export const validation = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  username: /^[a-zA-Z0-9_-]{3,30}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
};

// Hata kodları
export const errorCodes = {
  AUTH001: 'Geçersiz kimlik bilgileri',
  AUTH002: 'Oturum süresi dolmuş',
  AUTH003: 'Geçersiz token',
  AUTH004: '2FA doğrulama başarısız',
  AUTH005: 'Rate limit aşıldı',
  AUTH006: 'Hesap kilitlendi',
  AUTH007: 'Hesap askıya alındı',
  AUTH008: 'E-posta doğrulanmamış',
  AUTH009: 'OAuth bağlantısı başarısız',
  AUTH010: 'Geçersiz yedek kod'
};

// HTTP durum kodları
export const statusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};
