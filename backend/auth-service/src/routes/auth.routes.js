import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validator.middleware.js';
import {
  authenticate,
  authorize,
  validateSession,
  require2FA
} from '../middleware/auth.middleware.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  twoFactorLimiter
} from '../middleware/rate-limiter.middleware.js';

const router = Router();

// Validasyon şemaları
const registerSchema = [
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

const loginSchema = [
  body('email').trim().isEmail().withMessage('Geçerli bir email adresi giriniz'),
  body('password').notEmpty().withMessage('Şifre gereklidir')
];

const updateProfileSchema = [
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
    .withMessage('Yeni şifre politikaya uygun olmalıdır')
];

// Public routes
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
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
router.put('/profile', validate(updateProfileSchema), authController.updateProfile);

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
  async (req, res) => {
    // Admin paneli için kullanıcı listesi endpoint'i
    // İleride implement edilecek
    res.status(501).json({ message: 'Not implemented' });
  }
);

// Health check endpoint'i
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

export default router;