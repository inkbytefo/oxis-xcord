import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import VoiceManager from './websocket/voiceManager.js';
import config from './config.js';
import { Worker } from 'mediasoup';
import prometheus from 'prom-client';
import logger, {
  loggerMiddleware,
  webrtcLogger,
  mediasoupLogger,
  roomLogger
} from './utils/logger.js';

// Prometheus metriklerini ayarla
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'voice_' });

// Özel metrikler
const activeRoomsGauge = new prometheus.Gauge({
  name: 'voice_active_rooms',
  help: 'Aktif ses odası sayısı'
});

const activeConnectionsGauge = new prometheus.Gauge({
  name: 'voice_active_connections',
  help: 'Aktif WebSocket bağlantı sayısı'
});

const mediasoupWorkersGauge = new prometheus.Gauge({
  name: 'voice_mediasoup_workers',
  help: 'Aktif MediaSoup worker sayısı'
});

const webrtcConnectionsGauge = new prometheus.Gauge({
  name: 'voice_webrtc_connections',
  help: 'Aktif WebRTC bağlantı sayısı'
});

const errorCounter = new prometheus.Counter({
  name: 'voice_errors_total',
  help: 'Toplam hata sayısı',
  labelNames: ['type']
});

const httpRequestDuration = new prometheus.Histogram({
  name: 'voice_http_request_duration_seconds',
  help: 'HTTP isteği süre metrikleri',
  labelNames: ['method', 'route', 'status_code']
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

// Logging middleware'i
app.use(loggerMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100
});
app.use(limiter);

// Voice WebSocket yöneticisini başlat
const voiceManager = new VoiceManager(server);

// WebSocket metrikleri
voiceManager.on('connection', () => {
  activeConnectionsGauge.inc();
  logger.info('WebSocket client connected');
});
voiceManager.on('disconnect', () => {
  activeConnectionsGauge.dec();
  logger.info('WebSocket client disconnected');
});

// Oda metrikleri
voiceManager.on('roomCreated', (roomId) => {
  activeRoomsGauge.inc();
  roomLogger.info(roomId, 'roomCreated');
});
voiceManager.on('roomClosed', (roomId) => {
  activeRoomsGauge.dec();
  roomLogger.info(roomId, 'roomClosed');
});

// WebRTC metrikleri
voiceManager.on('webrtcConnected', (roomId, peerId) => {
  webrtcConnectionsGauge.inc();
  webrtcLogger.info('webrtcConnected', { roomId, peerId });
});
voiceManager.on('webrtcDisconnected', (roomId, peerId) => {
  webrtcConnectionsGauge.dec();
  webrtcLogger.info('webrtcDisconnected', { roomId, peerId });
});

// MediaSoup worker'ları başlat
const workers = new Map();
const numWorkers = Object.keys(require('os').cpus()).length;

async function createWorkers() {
  for (let i = 0; i < numWorkers; i++) {
    const worker = await Worker.createWorker({
      logLevel: config.environment === 'development' ? 'debug' : 'error',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 49999
    });

    worker.on('died', () => {
      console.error(`MediaSoup worker ${i} öldü, yeniden başlatılıyor...`);
      mediasoupWorkersGauge.dec();
      errorCounter.inc({ type: 'worker_died' });
      mediasoupLogger.error(i, 'workerDied');
      createWorker(i);
    });

    workers.set(i, worker);
    mediasoupWorkersGauge.inc();
    mediasoupLogger.info(i, 'workerCreated');
    console.log(`MediaSoup worker ${i} başlatıldı`);
  }
}

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
  const status = {
    service: 'OK',
    workers: workers.size,
    timestamp: new Date().toISOString()
  };
  logger.debug('Health check completed');
  res.status(200).json(status);
});

// WebSocket ve MediaSoup durumu endpoint'i
app.get('/status', (req, res) => {
  const status = {
    connections: voiceManager.connections.size,
    activeRooms: voiceManager.rooms.getRoomCount(),
    workers: workers.size,
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

const PORT = config.port || 3003;

async function startServer() {
  try {
    await createWorkers();

    server.listen(PORT, () => {
      logger.info(`Voice Service başlatıldı`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        corsOrigin: config.corsOrigin
      });
    });
  } catch (error) {
    console.error('Sunucu başlatma hatası:', error);
    errorCounter.inc({ type: 'startup_error' });
    logger.error('Sunucu başlatma hatası', { error });
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM sinyali alındı. Sunucu kapatılıyor...');
  
  // MediaSoup worker'ları kapat
  for (const [_, worker] of workers) {
    worker.close();
    mediasoupWorkersGauge.dec();
  }

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
  errorCounter.inc({ type: 'unhandled_rejection' });
});

process.on('uncaughtException', (error) => {
  logger.error('Yakalanmamış Hata', {
    error: {
      message: error.message,
      stack: error.stack
    }
  });
  errorCounter.inc({ type: 'uncaught_exception' });
  process.exit(1);
});
