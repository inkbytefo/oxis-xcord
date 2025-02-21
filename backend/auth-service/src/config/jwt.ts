import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Validate required environment variables
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  logger.error('Missing required JWT environment variables');
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined in environment variables');
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string, secret: string): TokenPayload => {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw error;
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    logger.error('Token decoding failed:', error);
    return null;
  }
};