import winston, { Logger, format } from 'winston';

// Log seviyesi tipi
type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

// Log formatı için yapılandırma
interface LogFormat {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const logger: Logger = winston.createLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Morgan için stream
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger;