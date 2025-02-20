import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, TokenPayload } from '../types';
import logger from '../utils/logger';

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Authorization header'ını kontrol et
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: true,
        message: 'Yetkilendirme başlığı eksik'
      });
    }

    // Bearer token'ı ayıkla
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Token bulunamadı'
      });
    }

    // Token'ı doğrula
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as TokenPayload;
    
    // Kullanıcı bilgisini request nesnesine ekle
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Süresi dolmuş token kullanım denemesi');
      return res.status(401).json({
        error: true,
        message: 'Token süresi dolmuş'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Geçersiz token kullanım denemesi');
      return res.status(401).json({
        error: true,
        message: 'Geçersiz token'
      });
    }

    logger.error('Kimlik doğrulama hatası:', error);
    res.status(500).json({
      error: true,
      message: 'Kimlik doğrulama işlemi sırasında bir hata oluştu'
    });
  }
};

// Belirli rollere sahip kullanıcıları kontrol et
export const authorize = (roles: string[] = []) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: true,
          message: 'Yetkilendirme gerekli'
        });
      }

      if (roles.length && !roles.includes(req.user.role || '')) {
        logger.warn(`Yetkisiz erişim denemesi - Kullanıcı: ${req.user.id}, İstenen rol: ${roles.join(', ')}`);
        return res.status(403).json({
          error: true,
          message: 'Bu işlem için yetkiniz yok'
        });
      }

      next();
    } catch (error) {
      logger.error('Yetkilendirme hatası:', error);
      res.status(500).json({
        error: true,
        message: 'Yetkilendirme işlemi sırasında bir hata oluştu'
      });
    }
  };
};