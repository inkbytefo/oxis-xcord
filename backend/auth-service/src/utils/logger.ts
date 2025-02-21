import winston from 'winston';

// Configure log level based on environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  const errorLogPath = process.env.ERROR_LOG_PATH || 'logs/error.log';
  const combinedLogPath = process.env.COMBINED_LOG_PATH || 'logs/combined.log';

  logger.add(new winston.transports.File({ 
    filename: errorLogPath, 
    level: 'error'
  }));
  
  logger.add(new winston.transports.File({ 
    filename: combinedLogPath
  }));
  
  logger.info(`Logger initialized in production mode. Error logs: ${errorLogPath}, Combined logs: ${combinedLogPath}`);
}