import { CustomError } from '../utils/errors.js';
import { config, statusCodes } from '../config/index.js';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Hata detaylarını logla
  logger.error('Hata yakalandı:', {
    error: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });

  // CustomError instance'larını direkt olarak işle
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Express validation errors
  if (err.array && typeof err.array === 'function') {
    return res.status(statusCodes.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Doğrulama hatası',
        details: err.array()
      }
    });
  }

  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    return res.status(statusCodes.UNAUTHORIZED).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Geçersiz token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(statusCodes.UNAUTHORIZED).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token süresi dolmuş'
      }
    });
  }

  // Sequelize hataları
  if (err.name === 'SequelizeValidationError') {
    return res.status(statusCodes.BAD_REQUEST).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Veritabanı doğrulama hatası',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      }
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(statusCodes.BAD_REQUEST).json({
      error: {
        code: 'DUPLICATE_ERROR',
        message: 'Benzersizlik kısıtlaması hatası',
        details: err.errors.map(e => ({
          field: e.path,
          message: `${e.path} zaten kullanımda`
        }))
      }
    });
  }

  // Bilinmeyen hatalar için varsayılan yanıt
  const defaultError = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.env === 'development' 
        ? err.message 
        : 'Bir hata oluştu, lütfen daha sonra tekrar deneyin'
    }
  };

  // Development modunda stack trace ekle
  if (config.env === 'development') {
    defaultError.error.stack = err.stack;
  }

  res.status(statusCodes.INTERNAL_SERVER_ERROR).json(defaultError);
};