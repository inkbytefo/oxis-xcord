import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Redis } from 'ioredis';
import { config } from './config/index.js';
import authRoutes from './routes/auth.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { setupMetrics } from './utils/metrics.js';
import logger from './utils/logger.js';

// Express uygulamasını oluştur
const app = express();

// Redis bağlantısı
const redis = new Redis(config.redis.url);
redis.on('error', (err) => {
  logger.error('Redis bağlantı hatası:', err);
});
redis.on('connect', () => {
  logger.info('Redis bağlantısı başarılı');
});

// Temel middleware'ler
app.use(helmet()); // Güvenlik başlıkları
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } })); // Loglama
app.use(express.json()); // JSON request body parsing
app.use(express.urlencoded({ extended: true })); // URL-encoded request body parsing

// CORS yapılandırması
app.use(cors({
  origin: config.server.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-2FA-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true
}));

// Metrics kurulumu (Prometheus)
if (config.metrics.enabled) {
  setupMetrics(app);
}

// Health check endpoint'i
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString()
  });
});

// Ana route'lar
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'İstenen kaynak bulunamadı'
    }
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} alındı. Uygulama kapatılıyor...`);

  // HTTP sunucusunu kapat
  server.close(() => {
    logger.info('HTTP sunucusu kapatıldı');
  });

  // Redis bağlantısını kapat
  await redis.quit();
  logger.info('Redis bağlantısı kapatıldı');

  // Veritabanı bağlantısını kapat
  try {
    await sequelize.close();
    logger.info('Veritabanı bağlantısı kapatıldı');
  } catch (error) {
    logger.error('Veritabanı bağlantısı kapatılırken hata:', error);
  }

  // Prometheus metrikleri temizleme
  if (config.metrics.enabled) {
    clearMetrics();
  }

  process.exit(0);
};

// Shutdown sinyallerini dinle
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Yakalanmamış hataları logla
process.on('uncaughtException', (error) => {
  logger.error('Yakalanmamış hata:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('İşlenmemiş promise reddi:', reason);
  gracefulShutdown('unhandledRejection');
});

// Sunucuyu başlat
const server = app.listen(config.server.port, () => {
  logger.info(`Auth servisi ${config.server.port} portunda çalışıyor (${config.env} modu)`);
});

// Veritabanı bağlantısını kontrol et
import { sequelize } from './models/User.js';

sequelize
  .authenticate()
  .then(() => {
    logger.info('Veritabanı bağlantısı başarılı');
    // Tabloları senkronize et (development modunda)
    if (config.env === 'development') {
      return sequelize.sync({ alter: true });
    }
  })
  .catch((error) => {
    logger.error('Veritabanı bağlantı hatası:', error);
    process.exit(1);
  });

export default app;
