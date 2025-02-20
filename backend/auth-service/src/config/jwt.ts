import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types';

export const generateAccessToken = (user: TokenPayload): string => {
  return jwt.sign(user, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
};

export const generateRefreshToken = (user: TokenPayload): string => {
  return jwt.sign(user, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
};

export const verifyToken = (token: string, secret: string): TokenPayload => {
  return jwt.verify(token, secret) as TokenPayload;
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
};