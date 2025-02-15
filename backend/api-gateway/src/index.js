import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import config from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { circuitBreaker } from './middleware/circuit-breaker.js';

const app = express();

// Güvenlik middleware'leri
app.use(helmet());
app.use(cors());
app.use(express.json());

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

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
});

process.on('unhandledRejection', (err) => {
  console.error('Yakalanmamış Promise Reddi:', err);
  process.exit(1);
});
