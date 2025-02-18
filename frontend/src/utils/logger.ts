interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private prefix: string;

  private constructor(options: LoggerOptions) {
    this.logLevel = options.level;
    this.prefix = options.prefix || '[App]';
  }

  static getInstance(options: LoggerOptions = { level: 'info' }): Logger {
    if (!this.instance) {
      this.instance = new Logger(options);
    }
    return this.instance;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    return `${this.prefix} [${level.toUpperCase()}] ${this.getTimestamp()}: ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, error?: Error, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(
        this.formatMessage('error', message),
        error ? `\nError: ${error.message}\nStack: ${error.stack}` : '',
        ...args
      );
    }
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLevel(): LogLevel {
    return this.logLevel;
  }
}

// import.meta.env kullanarak Vite ortam değişkenlerine erişim
const isDevelopment = import.meta.env.DEV;

export const logger = Logger.getInstance({
  level: isDevelopment ? 'debug' : 'error',
  prefix: '[Auth]'
});

export type { LogLevel, LoggerOptions };