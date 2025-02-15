import winston from 'winston';
import Transport from 'winston-transport';
import net from 'net';

class TCPTransport extends Transport {
  host: string;
  port: number;
  net: typeof net;
  client: net.Socket | null;
  retrying: boolean;

  constructor(opts: { host?: string; port?: number; level?: string }) {
    super(opts);
    this.host = opts.host || 'logstash';
    this.port = opts.port || 5000;
    this.net = net;
    this.client = null;
    this.retrying = false;
    this.connectToLogstash();
  }

  connectToLogstash() {
    this.client = new this.net.Socket();

    this.client.on('error', (err: Error) => {
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

  log(info: winston.LogEntry, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (this.client && this.client.writable) {
      const logEntry = {
        ...info,
        service: 'frontend',
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
  defaultMeta: { service: 'frontend' },
  transports: [
    // Konsol transport'u (geliştirme ortamı için)
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

export default logger;