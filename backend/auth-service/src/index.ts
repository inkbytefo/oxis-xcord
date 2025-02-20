import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import passport from 'passport';
import { Server } from 'http';
import logger from './utils/logger';
import authRoutes from './routes/authRoutes';
import { authenticate } from './middleware/authenticate';
import { config } from './config';
import { AuthRequest } from './types';

// Express uygulamasını oluştur
const app = express();

// Middleware'leri ayarla
app.use(bodyParser.json());
app.use(cors({
  origin: config.server.cors.origin,
  methods: config.server.cors.methods,
  credentials: true
}));

// Passport initialize
app.use(passport.initialize());

// Sağlık kontrolü endpoint'i
const healthCheckHandler: RequestHandler = (_req, res) => {
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString()
  });
};
app.get('/health', healthCheckHandler);

// Metrics endpoint'i
const metricsHandler: RequestHandler = (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.status(200).send(`
    # HELP auth_login_attempts_total Toplam giriş denemesi sayısı
    auth_login_attempts_total ${global.loginAttempts || 0}
    # HELP auth_login_failures_total Başarısız giriş denemesi sayısı
    auth_login_failures_total ${global.loginFailures || 0}
    # HELP auth_active_sessions Aktif oturum sayısı
    auth_active_sessions ${global.activeSessions || 0}
  `);
};
app.get('/metrics', metricsHandler);

// Auth route'larını ekle
app.use('/auth', authRoutes);

// Korumalı route örneği
const protectedHandler: RequestHandler = (_req: Request, res: Response) => {
  res.json({ message: 'Bu korumalı bir endpoint' });
};
app.get('/protected', authenticate as RequestHandler, protectedHandler);

// Hata yakalama middleware'i
const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Uygulama hatası:', err);
  res.status(500).json({
    error: true,
    message: 'Sunucu hatası'
  });
};
app.use(errorHandler);

// Bulunamayan route'lar için 404
const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint bulunamadı'
  });
};
app.use(notFoundHandler);

// PostgreSQL bağlantısını kontrol et
import { getPool } from './config/database';
const pool = getPool();
pool.query('SELECT NOW()', (err) => {
  if (err) {
    logger.error('PostgreSQL bağlantı hatası:', err);
    process.exit(1);
  }
  logger.info('PostgreSQL bağlantısı başarılı');
});

// Redis bağlantısını kontrol et
import redis from './config/redis';
redis.ping((err) => {
  if (err) {
    logger.error('Redis bağlantı hatası:', err);
    process.exit(1);
  }
  logger.info('Redis bağlantısı başarılı');
});

// Sunucuyu başlat
const PORT = config.server.port;
const server: Server = app.listen(PORT, () => {
  logger.info(`Auth Service ${PORT} portunda çalışıyor`);
  logger.info(`Ortam: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
  
  // Açık bağlantıları kapat
  pool.end();
  redis.quit();
  
  // Sunucuyu kapat
  server.close(() => {
    logger.info('Sunucu kapatıldı');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;