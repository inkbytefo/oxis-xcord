import { errorCodes, statusCodes } from '../config/index.js';

export class CustomError extends Error {
  constructor(code, message, statusCode = statusCodes.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details })
      }
    };
  }
}

export class ValidationError extends CustomError {
  constructor(details) {
    super(
      'VALIDATION_ERROR',
      'Doğrulama hatası',
      statusCodes.BAD_REQUEST,
      details
    );
  }
}

export class AuthenticationError extends CustomError {
  constructor(code = 'AUTH001', message = errorCodes.AUTH001) {
    super(code, message, statusCodes.UNAUTHORIZED);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message = 'Bu işlem için yetkiniz yok') {
    super('FORBIDDEN', message, statusCodes.FORBIDDEN);
  }
}

export class RateLimitError extends CustomError {
  constructor(message = errorCodes.AUTH005) {
    super('RATE_LIMIT', message, statusCodes.TOO_MANY_REQUESTS);
  }
}

export class AccountLockedError extends CustomError {
  constructor(message = errorCodes.AUTH006, details = null) {
    super('ACCOUNT_LOCKED', message, statusCodes.UNAUTHORIZED, details);
  }
}

export class AccountSuspendedError extends CustomError {
  constructor(reason) {
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
  constructor(message = errorCodes.AUTH003) {
    super('INVALID_TOKEN', message, statusCodes.UNAUTHORIZED);
  }
}

export class TwoFactorRequiredError extends CustomError {
  constructor(tempToken) {
    super(
      'TWO_FACTOR_REQUIRED',
      '2FA doğrulaması gerekli',
      statusCodes.UNAUTHORIZED,
      { tempToken }
    );
  }
}

// Hata yakalama yardımcı fonksiyonları
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createErrorResponse = (error) => {
  if (error instanceof CustomError) {
    return error.toJSON();
  }

  // Sequelize hata dönüşümleri
  if (error.name === 'SequelizeValidationError') {
    const validationError = new ValidationError(
      error.errors.map(err => ({
        field: err.path,
        message: err.message
      }))
    );
    return validationError.toJSON();
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const validationError = new ValidationError(
      error.errors.map(err => ({
        field: err.path,
        message: `${err.path} zaten kullanımda`
      }))
    );
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

// JWT hata dönüşümleri
export const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new InvalidTokenError('Geçersiz token formatı');
  }
  if (error.name === 'TokenExpiredError') {
    return new InvalidTokenError('Token süresi dolmuş');
  }
  if (error.name === 'NotBeforeError') {
    return new InvalidTokenError('Token henüz geçerli değil');
  }
  return error;
};