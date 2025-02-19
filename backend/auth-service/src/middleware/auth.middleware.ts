import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { config } from '../config';
import { User, Session } from '../models/User';
import {
  AuthenticationError,
  AuthorizationError,
  InvalidTokenError
} from '../utils/errors';
import { getRedisConnection } from '../config/redis';

// Tip tanımlamaları
interface JWTPayload {
  id: string;
  username: string;
  roles: string[];
  exp?: number;
}

interface UserAttributes {
  id: string;
  username: string;
  roles: string[];
  twoFactorEnabled: boolean;
  verifyTwoFactorToken(token: string): Promise<boolean>;
}

interface SessionAttributes {
  id: string;
  userId: string;
  isRevoked: boolean;
  expiresAt: Date;
}

interface RequestWithUser extends Request {
  user?: UserAttributes;
  token?: string;
  session?: SessionAttributes;
}

const redis = getRedisConnection();
const TOKEN_EXPIRY_BUFFER = 5 * 60; // 5 dakika buffer

export const authenticate = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | null;
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

export const authorize = (...roles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError('Kimlik doğrulama gerekli'));
    }

    const hasRequiredRole = roles.some(role => 
      req.user?.roles && req.user.roles.includes(role)
    );

    if (!hasRequiredRole) {
      return next(new AuthorizationError('Yetkisiz erişim'));
    }

    next();
  };
};

export const validateSession = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next(new AuthenticationError('Kimlik doğrulama gerekli'));
  }

  try {
    const sessionId = req.headers['x-session-id'] as string;
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

export const require2FA = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next(new AuthenticationError('Kimlik doğrulama gerekli'));
  }

  try {
    if (!req.user.twoFactorEnabled) {
      return next();
    }

    const twoFactorToken = req.headers['x-2fa-token'] as string;
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

export const blacklistToken = async (token: string): Promise<boolean> => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
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
const verifyToken = async (token: string): Promise<JWTPayload> => {
  try {
    return jwt.verify(token, config.jwt.accessToken.secret) as JWTPayload;
  } catch (error) {
    throw new InvalidTokenError('Token doğrulama hatası');
  }
};

// 2FA token doğrulama yardımcı fonksiyonu
const verifyTwoFactorToken = async (user: UserAttributes, token: string): Promise<boolean> => {
  try {
    return await user.verifyTwoFactorToken(token);
  } catch (error) {
    console.error('2FA doğrulama hatası:', error);
    return false;
  }
};

// Token çıkarma yardımcı fonksiyonu
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
};