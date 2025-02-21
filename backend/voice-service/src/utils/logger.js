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
        service: 'voice-service',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      };

      this.client.write(JSON.stringify(logEntry) + '\n');
    }

    callback();
  }
}

// Create the base logger instance
const createBaseLogger = () => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  return winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'voice-service' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new TCPTransport({
        host: 'logstash',
        port: 5000,
        level: 'info'
      })
    ]
  });
};

const logger = createBaseLogger();

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

// WebRTC olayları için özel logger
export const webrtcLogger = {
  info: (event, data) => {
    logger.info('WebRTC Event', {
      event,
      ...data,
      category: 'webrtc'
    });
  },
  error: (event, error) => {
    logger.error('WebRTC Error', {
      event,
      error: {
        message: error.message,
        stack: error.stack
      },
      category: 'webrtc'
    });
  }
};

// MediaSoup worker'ları için özel logger
export const mediasoupLogger = {
  info: (workerId, event, data = {}) => {
    logger.info('MediaSoup Event', {
      workerId,
      event,
      ...data,
      category: 'mediasoup'
    });
  },
  error: (workerId, event, error) => {
    logger.error('MediaSoup Error', {
      workerId,
      event,
      error: {
        message: error.message,
        stack: error.stack
      },
      category: 'mediasoup'
    });
  }
};

// Oda yönetimi için özel logger
export const roomLogger = {
  info: (roomId, event, data = {}) => {
    logger.info('Room Event', {
      roomId,
      event,
      ...data,
      category: 'room'
    });
  },
  error: (roomId, event, error) => {
    logger.error('Room Error', {
      roomId,
      event,
      error: {
        message: error.message,
        stack: error.stack
      },
      category: 'room'
    });
  }
};

export default logger;
