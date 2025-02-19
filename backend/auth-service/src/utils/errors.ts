import { Request, Response, NextFunction } from 'express';
import { ValidationError as SequelizeValidationError } from 'sequelize';
import { errorCodes, statusCodes } from '../config';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface ValidationDetail {
  field: string;
  message: string;
}

export class CustomError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: unknown | null;

  constructor(code: string, message: string, statusCode?: number, details: unknown = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode || statusCodes.INTERNAL_SERVER_ERROR;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: this.code,
        message: this.message
      }
    };

    if (this.details !== null) {
      response.error.details = this.details;
    }

    return response;
  }
}

export class ValidationError extends CustomError {
  constructor(details: ValidationDetail[]) {
    super(
      'VALIDATION_ERROR',
      'Doğrulama hatası',
      statusCodes.BAD_REQUEST,
      details
    );
  }
}

export class AuthenticationError extends CustomError {
  constructor(code: string = 'AUTH001', message: string = errorCodes.AUTH001) {
    super(code, message, statusCodes.UNAUTHORIZED);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Bu işlem için yetkiniz yok') {
    super('FORBIDDEN', message, statusCodes.FORBIDDEN);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = errorCodes.AUTH005) {
    super('RATE_LIMIT', message, statusCodes.TOO_MANY_REQUESTS);
  }
}

export class AccountLockedError extends CustomError {
  constructor(message: string = errorCodes.AUTH006, details: unknown = null) {
    super('ACCOUNT_LOCKED', message, statusCodes.UNAUTHORIZED, details);
  }
}

export class AccountSuspendedError extends CustomError {
  constructor(reason: string) {
    super(
      'ACCOUNT_SUSPENDED',
      errorCodes.AUTH007,
      statusCodes.UNAUTHORIZED,
      { reason }
    );
  }
}

export class EmailNotVerifiedError extends CustomError {
  constructor() {
    super('EMAIL_NOT_VERIFIED', errorCodes.AUTH008, statusCodes.UNAUTHORIZED);
  }
}

export class InvalidTokenError extends CustomError {
  constructor(message: string = errorCodes.AUTH003) {
    super('INVALID_TOKEN', message, statusCodes.UNAUTHORIZED);
  }
}

export class TwoFactorRequiredError extends CustomError {
  constructor(tempToken: string) {
    super(
      'TWO_FACTOR_REQUIRED',
      '2FA doğrulaması gerekli',
      statusCodes.UNAUTHORIZED,
      { tempToken }
    );
  }
}

// Hata yakalama yardımcı fonksiyonları
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => 
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

interface SequelizeError {
  name: string;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export const createErrorResponse = (error: Error | CustomError | SequelizeError): ErrorResponse => {
  if (error instanceof CustomError) {
    return error.toJSON();
  }

  // Sequelize hata dönüşümleri
  if (error.name === 'SequelizeValidationError') {
    const seqError = error as SequelizeError;
    const validationDetails: ValidationDetail[] = seqError.errors
      .filter(err => err.path != null)
      .map(err => ({
        field: err.path,
        message: err.message
      }));

    const validationError = new ValidationError(validationDetails);
    return validationError.toJSON();
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const seqError = error as SequelizeError;
    const validationDetails: ValidationDetail[] = seqError.errors
      .filter(err => err.path != null)
      .map(err => ({
        field: err.path,
        message: `${err.path} zaten kullanımda`
      }));

    const validationError = new ValidationError(validationDetails);
    return validationError.toJSON();
  }

  // Varsayılan hata yanıtı
  const defaultError = new CustomError(
    'INTERNAL_SERVER_ERROR',
    'Bir hata oluştu',
    statusCodes.INTERNAL_SERVER_ERROR
  );

  return defaultError.toJSON();
};

interface JWTError extends Error {
  name: 'JsonWebTokenError' | 'TokenExpiredError' | 'NotBeforeError';
}

// JWT hata dönüşümleri
export const handleJWTError = (error: JWTError | Error): CustomError => {
  if (error.name === 'JsonWebTokenError') {
    return new InvalidTokenError('Geçersiz token formatı');
  }
  if (error.name === 'TokenExpiredError') {
    return new InvalidTokenError('Token süresi dolmuş');
  }
  if (error.name === 'NotBeforeError') {
    return new InvalidTokenError('Token henüz geçerli değil');
  }
  return error as CustomError;
};