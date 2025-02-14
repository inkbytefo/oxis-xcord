import express from 'express';
import { register, login, refresh, logout, getProfile, updateProfile } from '../controllers/auth.js';
import { verifyToken, verifyRefreshToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', verifyRefreshToken, refresh);

// Protected routes
router.use(verifyToken);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Admin routes
router.get('/admin/users', checkRole(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching users',
      error: error.message
    });
  }
});

export default router;
