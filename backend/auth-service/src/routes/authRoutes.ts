import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as oauthController from '../controllers/oauthController.js';
import createRateLimiter from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import { ValidationRules } from '../types/index.js';

const router = Router();

// Rate limiting rules
const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5 // 5 requests
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3 // 3 requests
});

// Validation rules
const registerValidation: ValidationRules = {
  username: {
    exists: true,
    isLength: { min: 3, max: 50 },
    matches: /^[a-zA-Z0-9_]+$/
  },
  email: {
    exists: true,
    isEmail: true
  },
  password: {
    exists: true,
    isLength: { min: 8 },
    matches: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  }
};

const loginValidation: ValidationRules = {
  email: {
    exists: true,
    isEmail: true
  },
  password: {
    exists: true
  }
};

// Auth routes
router.post('/register', registerLimiter, validate(registerValidation), authController.register);
router.post('/login', loginLimiter, validate(loginValidation), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// OAuth routes
router.get('/google', oauthController.googleAuth);
router.get('/google/callback', oauthController.googleCallback);
router.get('/github', oauthController.githubAuth);
router.get('/github/callback', oauthController.githubCallback);

export { router as authRoutes };