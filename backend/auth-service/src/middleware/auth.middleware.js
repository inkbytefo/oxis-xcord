import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, Session } from '../models/User.js';
import {
  AuthenticationError,
  AuthorizationError,
  InvalidTokenError
} from '../utils/errors.js';
import { getRedisConnection } from '../config/redis.js';

const redis = getRedisConnection();
const TOKEN_EXPIRY_BUFFER = 5 * 60; // 5 dakika buffer

export const authenticate = async (req, res, next) => {
  let token;
  try {
    token = extractToken(req);
    if (!token) {
      throw new AuthenticationError('Token bulunamadı');
    }

    // Token blacklist kontrolü - Redis'te atomic operation
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new InvalidTokenError('Geçersiz token');
    }

    const decoded = await verifyToken(token);
    
    // Kullanıcı kontrolü ve aktiflik durumu - Tek sorguda
    const user = await User.findOne({
      where: {
        id: decoded.id,
        isActive: true
      },
      attributes: ['id', 'username', 'roles', 'twoFactorEnabled']
    });

    if (!user) {
      throw new AuthenticationError('Kullanıcı bulunamadı veya aktif değil');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new InvalidTokenError('Token doğrulama hatası'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Kimlik doğrulama gerekli'));
    }

    const hasRequiredRole = roles.some(role => 
      req.user.roles && req.user.roles.includes(role)
    );

    if (!hasRequiredRole) {
      return next(new AuthorizationError('Yetkisiz erişim'));
    }

    next();
  };
};

export const validateSession = async (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Kimlik doğrulama gerekli'));
  }

  try {
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      throw new AuthenticationError('Oturum ID\'si bulunamadı');
    }

    // Session kontrolü - Tek sorguda tüm kontroller
    const session = await Session.findOne({
      where: {
        id: sessionId,
        userId: req.user.id,
        isRevoked: false,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!session) {
      throw new AuthenticationError('Geçersiz veya süresi dolmuş oturum');
    }

    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

export const require2FA = async (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Kimlik doğrulama gerekli'));
  }

  try {
    if (!req.user.twoFactorEnabled) {
      return next();
    }

    const twoFactorToken = req.headers['x-2fa-token'];
    if (!twoFactorToken) {
      throw new AuthenticationError('2FA token gerekli');
    }

    const isValid = await verifyTwoFactorToken(req.user, twoFactorToken);
    if (!isValid) {
      throw new AuthenticationError('Geçersiz 2FA token');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      throw new Error('Geçersiz token formatı');
    }

    const ttl = Math.max((decoded.exp * 1000) - Date.now() + (TOKEN_EXPIRY_BUFFER * 1000), 0);
    if (ttl > 0) {
      await redis.set(
        `blacklist:${token}`,
        '1',
        'PX',
        ttl
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token blacklist hatası:', error);
    throw new Error('Token blacklist işlemi başarısız');
  }
};

// Token doğrulama yardımcı fonksiyonu
const verifyToken = async (token) => {
  try {
    return jwt.verify(token, config.jwt.accessToken.secret);
  } catch (error) {
    throw new InvalidTokenError('Token doğrulama hatası');
  }
};

// 2FA token doğrulama yardımcı fonksiyonu
const verifyTwoFactorToken = async (user, token) => {
  try {
    return await user.verifyTwoFactorToken(token);
  } catch (error) {
    console.error('2FA doğrulama hatası:', error);
    return false;
  }
};

// Token çıkarma yardımcı fonksiyonu
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
};