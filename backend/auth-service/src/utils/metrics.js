import client from 'prom-client';
import { config } from '../config/index.js';

// Metrics koleksiyonunu yapılandır
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: config.metrics.prefix });

// Custom metrikler
const authMetrics = {
  loginAttempts: new client.Counter({
    name: `${config.metrics.prefix}login_attempts_total`,
    help: 'Toplam giriş denemesi sayısı',
    labelNames: ['status']
  }),

  activeUsers: new client.Gauge({
    name: `${config.metrics.prefix}active_users`,
    help: 'Aktif kullanıcı sayısı'
  }),

  registrations: new client.Counter({
    name: `${config.metrics.prefix}registrations_total`,
    help: 'Toplam kayıt sayısı',
    labelNames: ['provider'] // 'email', 'google', 'github', 'discord'
  }),

  tokenRefreshes: new client.Counter({
    name: `${config.metrics.prefix}token_refreshes_total`,
    help: 'Token yenileme sayısı'
  }),

  twoFactorAttempts: new client.Counter({
    name: `${config.metrics.prefix}two_factor_attempts_total`,
    help: '2FA doğrulama denemesi sayısı',
    labelNames: ['status']
  }),

  requestDuration: new client.Histogram({
    name: `${config.metrics.prefix}http_request_duration_seconds`,
    help: 'HTTP isteklerinin süre dağılımı',
    labelNames: ['method', 'path', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
  }),

  activeSessions: new client.Gauge({
    name: `${config.metrics.prefix}active_sessions`,
    help: 'Aktif oturum sayısı'
  }),

  rateLimit: new client.Counter({
    name: `${config.metrics.prefix}rate_limit_hits_total`,
    help: 'Rate limit aşım sayısı',
    labelNames: ['path']
  })
};

// Metrik yardımcı fonksiyonları
export const metrics = {
  // Giriş denemelerini kaydet
  trackLogin: (success) => {
    authMetrics.loginAttempts.inc({ status: success ? 'success' : 'failure' });
  },

  // Aktif kullanıcı sayısını güncelle
  updateActiveUsers: (count) => {
    authMetrics.activeUsers.set(count);
  },

  // Yeni kayıt işlemini kaydet
  trackRegistration: (provider = 'email') => {
    authMetrics.registrations.inc({ provider });
  },

  // Token yenileme işlemini kaydet
  trackTokenRefresh: () => {
    authMetrics.tokenRefreshes.inc();
  },

  // 2FA denemesini kaydet
  track2FAAttempt: (success) => {
    authMetrics.twoFactorAttempts.inc({ status: success ? 'success' : 'failure' });
  },

  // İstek süresini kaydet
  trackRequestDuration: (method, path, statusCode, duration) => {
    authMetrics.requestDuration.observe(
      { method, path, status_code: statusCode },
      duration
    );
  },

  // Aktif oturum sayısını güncelle
  updateActiveSessions: (count) => {
    authMetrics.activeSessions.set(count);
  },

  // Rate limit aşımını kaydet
  trackRateLimit: (path) => {
    authMetrics.rateLimit.inc({ path });
  }
};

// Metrics middleware'i
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Response gönderildikten sonra metrikleri kaydet
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // saniye cinsinden
    metrics.trackRequestDuration(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );
  });

  next();
};

// Metrics endpoint'i için handler
export const metricsHandler = async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (error) {
    res.status(500).json({ error: 'Metrikler alınamadı' });
  }
};

// Metrics kurulumu
export const setupMetrics = (app) => {
  // Metrics middleware'ini ekle
  app.use(metricsMiddleware);

  // Metrics endpoint'ini ekle
  app.get('/metrics', metricsHandler);
};

// Metrics temizleme
export const clearMetrics = () => {
  client.register.clear();
};