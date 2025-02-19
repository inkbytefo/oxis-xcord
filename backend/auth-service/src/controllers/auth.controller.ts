import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { authService, TokenPair } from '../services/auth.service';
import { oauthService } from '../services/oauth.service';
import { asyncHandler } from '../utils/errors';
import { blacklistToken } from '../middleware/auth.middleware';
import { config, statusCodes } from '../config';
import { User } from '../models/User';

// Tip tanımlamaları
interface LoginResult {
  user: User;
  tokens: TokenPair;
  sessionId: string;
}

interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

interface UpdateProfileBody {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Generic Request tipleri
interface RequestWithUser<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: User;
  headers: Request['headers'] & {
    'x-session-id'?: string;
  };
}

interface OAuthQueryParams {
  code?: string;
}

type OAuthProvider = 'google' | 'github';

// OAuth yönlendirme URL'i
const FRONTEND_CALLBACK_URL = process.env.FRONTEND_CALLBACK_URL || 'http://localhost:3000/auth/callback';

// Kullanıcı kaydı
export const register = asyncHandler(async (
  req: Request<{}, {}, RegisterRequestBody>,
  res: Response
) => {
  const user = await authService.register(req.body);
  
  res.status(statusCodes.CREATED).json({
    message: 'Kullanıcı başarıyla kaydedildi. Lütfen email adresinizi doğrulayın.',
    user: user.toJSON()
  });
});

// Kullanıcı girişi
export const login = asyncHandler(async (
  req: Request<{}, {}, LoginRequestBody>,
  res: Response
) => {
  const result = await authService.login({
    ...req.body,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  // Refresh token'ı cookie olarak gönder
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
  });

  // Session ID'yi header olarak gönder
  res.set('X-Session-ID', result.sessionId);

  res.json({
    message: 'Giriş başarılı',
    token: result.tokens.accessToken,
    user: result.user.toJSON()
  });
});

// Token yenileme
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  const sessionId = req.headers['x-session-id'] as string;

  const tokens = await authService.refreshToken(refreshToken, sessionId);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    message: 'Token yenilendi',
    token: tokens.accessToken
  });
});

// Çıkış yapma
export const logout = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const sessionId = req.headers['x-session-id'];
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  await authService.logout(req.user.id, sessionId);
  await blacklistToken(token);

  res.clearCookie('refreshToken');
  
  res.json({ message: 'Başarıyla çıkış yapıldı' });
});

// Tüm oturumlardan çıkış
export const logoutAll = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  await authService.logoutAll(req.user.id);
  await blacklistToken(token);

  res.clearCookie('refreshToken');
  
  res.json({ message: 'Tüm oturumlardan çıkış yapıldı' });
});

// Profil bilgileri
export const getProfile = asyncHandler(async (req: RequestWithUser, res: Response) => {
  res.json({ user: req.user.toJSON() });
});

// Profil güncelleme
export const updateProfile = asyncHandler(async (
  req: RequestWithUser<{}, {}, UpdateProfileBody>,
  res: Response
) => {
  const updatedUser = await authService.updateProfile(req.user.id, req.body);
  
  res.json({
    message: 'Profil başarıyla güncellendi',
    user: updatedUser.toJSON()
  });
});

// 2FA aktivasyonu
export const enableTwoFactor = asyncHandler(async (req: RequestWithUser, res: Response) => {
  const result = await authService.enableTwoFactor(req.user.id);
  
  res.json({
    message: '2FA başarıyla aktifleştirildi',
    ...result
  });
});

// 2FA doğrulama
export const verifyTwoFactor = asyncHandler(async (
  req: RequestWithUser<{}, {}, { token: string }>,
  res: Response
) => {
  const { token } = req.body;
  
  await authService.verifyTwoFactor(req.user.id, token);
  
  res.json({ message: '2FA doğrulaması başarılı' });
});

// 2FA deaktivasyonu
export const disableTwoFactor = asyncHandler(async (
  req: RequestWithUser<{}, {}, { token: string }>,
  res: Response
) => {
  const { token } = req.body;
  
  await authService.disableTwoFactor(req.user.id, token);
  
  res.json({ message: '2FA başarıyla deaktif edildi' });
});

// OAuth endpoints
export const googleAuth = asyncHandler(async (
  req: Request<{}, {}, {}, OAuthQueryParams>,
  res: Response
) => {
  const { code } = req.query;

  if (!code) {
    throw new Error('OAuth code bulunamadı');
  }

  const user = await oauthService.handleGoogleAuth(code);
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect(`${FRONTEND_CALLBACK_URL}?token=${accessToken}`);
});

export const githubAuth = asyncHandler(async (
  req: Request<{}, {}, {}, OAuthQueryParams>,
  res: Response
) => {
  const { code } = req.query;

  if (!code) {
    throw new Error('OAuth code bulunamadı');
  }

  const user = await oauthService.handleGithubAuth(code);
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect(`${FRONTEND_CALLBACK_URL}?token=${accessToken}`);
});

// OAuth bağlantılarını yönetme
export const unlinkProvider = asyncHandler(async (
  req: RequestWithUser<{ provider: string }>,
  res: Response
) => {
  const { provider } = req.params;
  
  await oauthService.unlinkProvider(req.user.id, provider as OAuthProvider);
  
  res.json({ 
    message: `${provider} bağlantısı başarıyla kaldırıldı` 
  });
});