import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/errors';
import { config, statusCodes } from '../config';
import logger from '../utils/logger';
import { ValidationError as ExpressValidationError } from 'express-validator';

interface User {
  id?: string;
}

interface RequestWithUser extends Request {
  user?: User;
}

// Express Validator hata tipi
interface ValidationErrorItem {
  param: string;
  msg: string;
  location?: string;
  value?: any;
}

interface ValidationErrorArray {
  array(): ValidationErrorItem[];
}

// Sequelize hata tipi
interface SequelizeError {
  name: string;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

// JWT hata tipleri
interface JWTError extends Error {
  name: 'JsonWebTokenError' | 'TokenExpiredError' | 'NotBeforeError';
}

type ErrorTypes = Error | CustomError | ValidationErrorArray | SequelizeError | JWTError;

function isValidationErrorArray(error: ErrorTypes): error is ValidationErrorArray {
  return 'array' in error && typeof error.array === 'function';
}

function isSequelizeError(error: ErrorTypes): error is SequelizeError {
  return 'name' in error && 'errors' in error && Array.isArray((error as SequelizeError).errors);
}

function getErrorMessage(error: ErrorTypes): string {
  if (isValidationErrorArray(error)) {
    return 'Doğrulama hatası';
  }
  return error instanceof Error ? error.message : 'Bilinmeyen hata';
}

function getErrorStack(error: ErrorTypes): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

export const errorHandler = (
  err: ErrorTypes,
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  // Hata detaylarını logla
  logger.error('Hata yakalandı:', {
    error: getErrorMessage(err),
    stack: config.env === 'development' ? getErrorStack(err) : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // CustomError instance'larını direkt olarak işle
  if (err instanceof CustomError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Express validation errors
  if (isValidationErrorArray(err)) {
    res.status(statusCodes.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doğrulama hatası',
        details: err.array()
      }
    });
    return;
  }

  // JWT hataları
  if ('name' in err) {
    if (err.name === 'JsonWebTokenError') {
      res.status(statusCodes.UNAUTHORIZED).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Geçersiz token'
        }
      });
      return;
    }

    if (err.name === 'TokenExpiredError') {
      res.status(statusCodes.UNAUTHORIZED).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token süresi dolmuş'
        }
      });
      return;
    }

    // Sequelize hataları
    if (err.name === 'SequelizeValidationError' && isSequelizeError(err)) {
      res.status(statusCodes.BAD_REQUEST).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Veritabanı doğrulama hatası',
          details: err.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        }
      });
      return;
    }

    if (err.name === 'SequelizeUniqueConstraintError' && isSequelizeError(err)) {
      res.status(statusCodes.BAD_REQUEST).json({
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'Benzersizlik kısıtlaması hatası',
          details: err.errors.map(e => ({
            field: e.path,
            message: `${e.path} zaten kullanımda`
          }))
        }
      });
      return;
    }
  }

  // Bilinmeyen hatalar için varsayılan yanıt
  const defaultError = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.env === 'development' 
        ? getErrorMessage(err)
        : 'Bir hata oluştu, lütfen daha sonra tekrar deneyin'
    }
  };

  // Development modunda stack trace ekle
  if (config.env === 'development') {
    const stack = getErrorStack(err);
    if (stack) {
      (defaultError.error as any).stack = stack;
    }
  }

  res.status(statusCodes.INTERNAL_SERVER_ERROR).json(defaultError);
};