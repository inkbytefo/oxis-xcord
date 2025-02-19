import { Router, Request, Response, NextFunction } from 'express';
import { body, ValidationChain } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validator.middleware';
import {
  authenticate,
  authorize,
  validateSession,
  require2FA
} from '../middleware/auth.middleware';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  twoFactorLimiter
} from '../middleware/rate-limiter.middleware';

const router = Router();

// Route handler tipleri
interface TypedRequestBody<T> extends Request {
  body: T;
}

interface TypedResponse<T> extends Response {
  json: (body: T) => this;
}

// Request body tipleri
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface UpdateProfileRequest {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Validasyon şemaları
const registerSchema: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Kullanıcı adı 3-30 karakter arasında olmalıdır')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Kullanıcı adı sadece harf, rakam, tire ve altçizgi içerebilir'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Geçerli bir email adresi giriniz')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Şifre en az 8 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir')
];

const loginSchema: ValidationChain[] = [
  body('email').trim().isEmail().withMessage('Geçerli bir email adresi giriniz'),
  body('password').notEmpty().withMessage('Şifre gereklidir')
];

const updateProfileSchema: ValidationChain[] = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Geçerli bir email adresi giriniz'),
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Mevcut şifre gereklidir'),
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Yeni şifre politikaya uygun olmalıdr')
];

// Public routes
router.post<{}, any, RegisterRequest>(
  '/register',
  registerLimiter,
  validate(registerSchema),
  authController.register
);

router.post<{}, any, LoginRequest>(
  '/login',
  loginLimiter,
  validate(loginSchema),
  authController.login
);

router.post('/refresh-token', authController.refreshToken);

// OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleAuth);
router.get('/github', authController.githubAuth);
router.get('/github/callback', authController.githubAuth);

// Protected routes
router.use(authenticate); // Bundan sonraki tüm route'lar için authentication gerekli

router.post('/logout', validateSession, authController.logout);
router.post('/logout-all', validateSession, authController.logoutAll);

router.get('/me', authController.getProfile);

router.put<{}, any, UpdateProfileRequest>(
  '/profile',
  validate(updateProfileSchema),
  authController.updateProfile
);

// 2FA routes
router.post('/2fa/enable', twoFactorLimiter, authController.enableTwoFactor);
router.post('/2fa/verify', twoFactorLimiter, authController.verifyTwoFactor);
router.post('/2fa/disable', twoFactorLimiter, require2FA, authController.disableTwoFactor);

// OAuth management routes
router.delete('/oauth/:provider', validateSession, authController.unlinkProvider);

// Admin routes
router.get(
  '/users',
  authorize('admin'),
  async (req: Request, res: Response) => {
    // Admin paneli için kullanıcı listesi endpoint'i
    // İleride implement edilecek
    res.status(501).json({ message: 'Not implemented' });
  }
);

// Health check endpoint'i
interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

router.get('/health', (req: Request, res: TypedResponse<HealthCheckResponse>) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

export default router;