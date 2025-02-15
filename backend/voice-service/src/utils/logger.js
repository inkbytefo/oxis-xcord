import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'voice-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      dirname: 'logs' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      dirname: 'logs'
    })
  ]
});

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: 'logs/exceptions.log'
  })
);

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

// Development logging helper
const isDevelopment = process.env.NODE_ENV !== 'production';

// Remove default console transport if we're in development
if (isDevelopment) {
  // Find and remove existing console transport
  const consoleTransport = logger.transports.find(t => t instanceof winston.transports.Console);
  if (consoleTransport) {
    logger.remove(consoleTransport);
  }

  // Add a single console transport with custom formatting
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        return `${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
      })
    )
  }));
}
