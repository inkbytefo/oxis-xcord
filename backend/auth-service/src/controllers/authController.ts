import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User, ServiceError } from '../types';
import * as db from '../config/database';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../config/jwt';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password }: { username: string; email: string; password: string } = req.body;

    // Check if user exists
    const userExists = await db.query<User>(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const result = await db.query<User>(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].id;
    const accessToken = generateAccessToken({ id: userId });
    const refreshToken = generateRefreshToken({ id: userId });

    logger.info(`New user registered: ${username}`);

    res.status(201).json({
      message: 'User created successfully',
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error('Error during registration:', error);
    const serviceError = error as ServiceError;
    res.status(serviceError.statusCode || 500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;

    // Find user
    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Update last login time
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`User logged in: ${user.username}`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('Error during login:', error);
    const serviceError = error as ServiceError;
    res.status(serviceError.statusCode || 500).json({ message: 'Server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify the refresh token
    const decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET!);
    
    // Generate new access token
    const accessToken = generateAccessToken({ id: decoded.id });
    
    res.json({ accessToken });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Token cleanup is handled client-side
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
};