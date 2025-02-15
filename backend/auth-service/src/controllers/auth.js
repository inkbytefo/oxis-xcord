import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/index.js';

const generateTokens = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    email: user.email,
    roles: user.roles
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn
  });

  const refreshToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    logger.debug('Register request received', { username, email });

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    logger.debug('Validating password');
    if (!passwordRegex.test(password)) {
      logger.warn('Password validation failed');
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Check if user exists
    logger.debug('Checking if user exists');
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      logger.warn('User already exists', { existingUser: userExists.username || userExists.email });
      return res.status(400).json({
        message: userExists.username === username ? 'Username is taken' : 'Email is already registered'
      });
    }

    // Create new user
    logger.debug('Creating new user');
    const user = new User({
      username,
      email,
      password,
      roles: ['user']
    });

    logger.debug('Saving user to database');
    await user.save();

    logger.info('User registered successfully', { username, email });
    res.status(201).json({
      message: 'User registered successfully'
    });
  } catch (error) {
    logger.error('Error registering user', { error: error.message, stack: error.stack });
    res.status(500).json({
      message: 'Error registering user',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email instead of username
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Geçersiz e-posta veya şifre' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update user's refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      token: accessToken, // Frontend'de sadece access token kullanacağız
      user: {
        email: user.email,
        username: user.username,
        roles: user.roles
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Giriş sırasında bir hata oluştu',
      error: error.message
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const { id } = req.user;
    const { refreshToken } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    res.status(500).json({
      message: 'Error refreshing token',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { id } = req.user;

    // Clear refresh token
    await User.findByIdAndUpdate(id, {
      $unset: { refreshToken: 1 }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error during logout',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update email if provided
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      user.email = email;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Validate new password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating profile',
      error: error.message
    });
  }
};
