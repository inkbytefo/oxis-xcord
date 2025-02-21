import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import SocketManager from './socket/socketManager.js';
import config from './config.js';
import prometheus from 'prom-client';
import { logger, loggerMiddleware } from './utils/logger.js';

// Prometheus metriklerini ayarla
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'messaging_' });

// Özel metrikler
const httpRequestDuration = new prometheus.Histogram({
  name: 'messaging_http_request_duration_seconds',
  help: 'HTTP isteği süre metrikleri',
  labelNames: ['method', 'route', 'status_code']
});

const wsConnectionsGauge = new prometheus.Gauge({
  name: 'messaging_websocket_connections',
  help: 'Aktif WebSocket bağlantı sayısı'
});

const errorCounter = new prometheus.Counter({
  name: 'messaging_errors_total',
  help: 'Toplam hata sayısı',
  labelNames: ['type']
});

const app = express();
const server = http.createServer(app);

// Güvenlik middleware'leri
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());

// Logging middleware'i
app.use(loggerMiddleware);

// HTTP istek sürelerini ölç
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      },
      duration / 1000
    );
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100
});
app.use(limiter);

// Socket.IO yöneticisini başlat
const socketManager = new SocketManager(server);

// WebSocket bağlantı sayısını izle
socketManager.on('connection', () => {
  wsConnectionsGauge.inc();
  logger.info('WebSocket client connected');
});

socketManager.on('disconnect', () => {
  wsConnectionsGauge.dec();
  logger.info('WebSocket client disconnected');
});

// Metrics endpoint'i
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (err) {
    logger.error('Metrics endpoint error', { error: err });
    res.status(500).end(err);
  }
});

// Health check endpoint'i
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  logger.debug('Health check completed');
});

// WebSocket durumu endpoint'i
app.get('/status', (req, res) => {
  const status = {
    activeConnections: socketManager.userSockets.size,
    activeRooms: socketManager.roomSockets.size,
    uptime: process.uptime()
  };
  logger.info('Status check', { status });
  res.status(200).json(status);
});

// Hata yönetimi
app.use((err, req, res, next) => {
  errorCounter.inc({ type: err.name || 'unknown' });
  logger.error('Application error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
  });
  res.status(500).json({ 
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = config.port || 3002;

server.listen(PORT, () => {
  logger.info(`Messaging Service başlatıldı`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    corsOrigin: config.corsOrigin
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
  server.close(() => {
    logger.info('Sunucu kapatıldı');
    process.exit(0);
  });
});

// Beklenmeyen hataları yakala
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Yakalanmamış Promise Reddi', {
    error: reason,
    promise: promise
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Yakalanmamış Hata', {
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  process.exit(1);
});
