import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import config from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { circuitBreaker } from './middleware/circuit-breaker.js';
import prometheus from 'prom-client';
import logger from './utils/logger.js';

// Prometheus metriklerini ayarla
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'api_gateway_' });

const app = express();

// CORS ayarları
app.use(cors({
  origin: config.CORS.ORIGINS,
  credentials: config.CORS.CREDENTIALS,
  methods: config.CORS.METHODS,
  allowedHeaders: config.CORS.ALLOWED_HEADERS
}));

// Güvenlik middleware'leri
app.use(helmet());
app.use(express.json());

// HTTP istek sürelerini ölç
const httpRequestDuration = new prometheus.Histogram({
  name: 'api_gateway_http_request_duration_seconds',
  help: 'HTTP isteği süre metrikleri',
  labelNames: ['method', 'route', 'status_code']
});

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
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin.'
});
app.use(limiter);

// Circuit breaker
app.use(circuitBreaker);

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

// Error handler middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log(`API Gateway ${PORT} portunda çalışıyor`);
  console.log('Servis URL\'leri:');
  Object.entries(config.SERVICES).forEach(([service, config]) => {
    console.log(`${service}: ${config.URL}${config.PREFIX}`);
  });
  console.log('CORS Origins:', config.CORS.ORIGINS);
});

process.on('unhandledRejection', (err) => {
  console.error('Yakalanmamış Promise Reddi:', err);
  process.exit(1);
});
