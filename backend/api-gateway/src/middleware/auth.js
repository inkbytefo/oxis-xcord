import jwt from 'jsonwebtoken';
import config from '../config.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      status: 'error',
      code: 'AUTH_HEADER_MISSING',
      message: 'Yetkilendirme başlığı eksik'
    });
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_AUTH_FORMAT',
      message: 'Geçersiz yetkilendirme format'
    });
  }

  if (!config.JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not set');
    return res.status(500).json({
      status: 'error',
      code: 'JWT_SECRET_MISSING',
      message: 'Sunucu yapılandırma hatası'
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    if (!decoded.userId || !decoded.roles) {
      throw new Error('Invalid token payload');
    }
    
    req.user = {
      id: decoded.userId,
      roles: decoded.roles,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: err.name === 'TokenExpiredError' ? 'Token süresi dolmuş' : 'Geçersiz token'
    });
  }
};

export const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        code: 'USER_NOT_AUTHENTICATED',
        message: 'Kullanıcı kimliği doğrulanmamış'
      });
    }

    if (!Array.isArray(req.user.roles)) {
      return res.status(403).json({
        status: 'error',
        code: 'INVALID_ROLES_FORMAT',
        message: 'Geçersiz rol formatı'
      });
    }

    const hasRequiredRole = requiredRoles.some(role =>
      req.user.roles.includes(role)
    );

    if (!hasRequiredRole) {
      return res.status(403).json({
        status: 'error',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Bu işlem için gerekli yetkiye sahip değilsiniz. Gereken rollerden biri: ${requiredRoles.join(', ')}`
      });
    }

    next();
  };
};

// Özel yetki kontrolü için yeni middleware
export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(403).json({
        status: 'error',
        code: 'NO_PERMISSIONS',
        message: 'Yetkilendirme bilgisi bulunamadı'
      });
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        status: 'error',
        code: 'PERMISSION_DENIED',
        message: `${requiredPermission} yetkisi gerekli`
      });
    }

    next();
  };
};
