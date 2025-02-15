import winston from 'winston';
import Transport from 'winston-transport';

class TCPTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.host = opts.host || 'logstash';
    this.port = opts.port || 5000;
    this.net = require('net');
    this.client = null;
    this.retrying = false;
    this.connectToLogstash();
  }

  connectToLogstash() {
    this.client = new this.net.Socket();

    this.client.on('error', (err) => {
      console.error('TCP Transport Error:', err);
      if (!this.retrying) {
        this.retrying = true;
        setTimeout(() => {
          this.retrying = false;
          this.connectToLogstash();
        }, 5000);
      }
    });

    this.client.connect(this.port, this.host, () => {
      console.log('Connected to Logstash');
    });
  }

  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (this.client && this.client.writable) {
      const logEntry = {
        ...info,
        service: 'messaging-service',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      };

      this.client.write(JSON.stringify(logEntry) + '\n');
    }

    callback();
  }
}

// Log formatını yapılandır
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Logger'ı oluştur
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'messaging-service' },
  transports: [
    // Konsol transport'u
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // TCP transport'u (Logstash'e gönderim)
    new TCPTransport({
      host: 'logstash',
      port: 5000,
      level: 'info'
    })
  ]
});

// HTTP istekleri için middleware
export const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      responseTime: duration,
      userId: req.user?.id,
      ip: req.ip
    });
  });

  next();
};

// WebSocket olayları için özel logger
export const socketLogger = {
  info: (event, data) => {
    logger.info('WebSocket Event', { event, ...data });
  },
  error: (event, error) => {
    logger.error('WebSocket Error', {
      event,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

export default logger;