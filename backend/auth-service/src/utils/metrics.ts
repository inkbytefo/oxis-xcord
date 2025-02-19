import { Request, Response, NextFunction, Application } from 'express';
import client, { Counter, Gauge, Histogram } from 'prom-client';
import { config } from '../config';

// Özel tip tanımlamaları
type Provider = 'email' | 'google' | 'github' | 'discord';
type Status = 'success' | 'failure';

interface AuthMetrics {
  loginAttempts: Counter<string>;
  activeUsers: Gauge<string>;
  registrations: Counter<string>;
  tokenRefreshes: Counter<string>;
  twoFactorAttempts: Counter<string>;
  requestDuration: Histogram<string>;
  activeSessions: Gauge<string>;
  rateLimit: Counter<string>;
}

// Metrics koleksiyonunu yapılandır
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: config.metrics.prefix });

// Custom metrikler
const authMetrics: AuthMetrics = {
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
    labelNames: ['provider']
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
interface MetricsHelper {
  trackLogin(success: boolean): void;
  updateActiveUsers(count: number): void;
  trackRegistration(provider?: Provider): void;
  trackTokenRefresh(): void;
  track2FAAttempt(success: boolean): void;
  trackRequestDuration(method: string, path: string, statusCode: number, duration: number): void;
  updateActiveSessions(count: number): void;
  trackRateLimit(path: string): void;
}

export const metrics: MetricsHelper = {
  trackLogin: (success: boolean) => {
    authMetrics.loginAttempts.inc({ status: success ? 'success' : 'failure' });
  },

  updateActiveUsers: (count: number) => {
    authMetrics.activeUsers.set(count);
  },

  trackRegistration: (provider: Provider = 'email') => {
    authMetrics.registrations.inc({ provider });
  },

  trackTokenRefresh: () => {
    authMetrics.tokenRefreshes.inc();
  },

  track2FAAttempt: (success: boolean) => {
    authMetrics.twoFactorAttempts.inc({ status: success ? 'success' : 'failure' });
  },

  trackRequestDuration: (method: string, path: string, statusCode: number, duration: number) => {
    authMetrics.requestDuration.observe(
      { method, path, status_code: statusCode.toString() },
      duration
    );
  },

  updateActiveSessions: (count: number) => {
    authMetrics.activeSessions.set(count);
  },

  trackRateLimit: (path: string) => {
    authMetrics.rateLimit.inc({ path });
  }
};

// Metrics middleware
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.trackRequestDuration(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );
  });

  next();
};

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (error) {
    res.status(500).json({ error: 'Metrikler alınamadı' });
  }
};

// Metrics kurulumu
export const setupMetrics = (app: Application): void => {
  app.use(metricsMiddleware);
  app.get('/metrics', metricsHandler);
};

// Metrics temizleme
export const clearMetrics = (): void => {
  client.register.clear();
};