import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Redis } from 'ioredis';
import { Server } from 'http';
import { config } from './config';
import { sequelize } from './models/User';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';
import { setupMetrics, clearMetrics } from './utils/metrics';
import logger from './utils/logger';

// Express uygulamasını oluştur
const app = express();

// Redis bağlantısı
const redis = new Redis(config.redis.url);
redis.on('error', (err: Error) => {
  logger.error('Redis bağlantı hatası:', err);
});
redis.on('connect', () => {
  logger.info('Redis bağlantısı başarılı');
});

// Temel middleware'ler
app.use(helmet()); // Güvenlik başlıkları
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } })); // Loglama
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
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString()
  });
});

// Ana route'lar
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'İstenen kaynak bulunamadı'
    }
  });
});

// Error handler
app.use(errorHandler);

let server: Server;

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} alındı. Uygulama kapatılıyor...`);

  // HTTP sunucusunu kapat
  if (server) {
    server.close(() => {
      logger.info('HTTP sunucusu kapatıldı');
    });
  }

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
process.on('uncaughtException', (error: Error) => {
  logger.error('Yakalanmamış hata:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('İşlenmemiş promise reddi:', reason);
  gracefulShutdown('unhandledRejection');
});

// Veritabanı bağlantısını kontrol et ve sunucuyu başlat
const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Veritabanı bağlantısı başarılı');
    
    // Tabloları senkronize et (development modunda)
    if (config.env === 'development') {
      await sequelize.sync({ alter: true });
    }

    // Sunucuyu başlat
    server = app.listen(config.server.port, () => {
      logger.info(`Auth servisi ${config.server.port} portunda çalışıyor (${config.env} modu)`);
    });

  } catch (error) {
    logger.error('Veritabanı bağlantı hatası:', error);
    process.exit(1);
  }
};

startServer();

export default app;