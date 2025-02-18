import { authService } from '../services/auth.service.js';
import { oauthService } from '../services/oauth.service.js';
import { asyncHandler } from '../utils/errors.js';
import { blacklistToken } from '../middleware/auth.middleware.js';
import { config, statusCodes } from '../config/index.js';

// Kullanıcı kaydı
export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  
  res.status(statusCodes.CREATED).json({
    message: 'Kullanıcı başarıyla kaydedildi. Lütfen email adresinizi doğrulayın.',
    user: user.toJSON()
  });
});

// Kullanıcı girişi
export const login = asyncHandler(async (req, res) => {
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
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  const sessionId = req.headers['x-session-id'];

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
export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const token = req.headers.authorization?.split(' ')[1];

  await authService.logout(req.user.id, sessionId);
  await blacklistToken(token);

  res.clearCookie('refreshToken');
  
  res.json({ message: 'Başarıyla çıkış yapıldı' });
});

// Tüm oturumlardan çıkış
export const logoutAll = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  await authService.logoutAll(req.user.id);
  await blacklistToken(token);

  res.clearCookie('refreshToken');
  
  res.json({ message: 'Tüm oturumlardan çıkış yapıldı' });
});

// Profil bilgileri
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// Profil güncelleme
export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await authService.updateProfile(req.user.id, req.body);
  
  res.json({
    message: 'Profil başarıyla güncellendi',
    user: updatedUser.toJSON()
  });
});

// 2FA aktivasyonu
export const enableTwoFactor = asyncHandler(async (req, res) => {
  const result = await authService.enableTwoFactor(req.user.id);
  
  res.json({
    message: '2FA başarıyla aktifleştirildi',
    ...result
  });
});

// 2FA doğrulama
export const verifyTwoFactor = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  await authService.verifyTwoFactor(req.user.id, token);
  
  res.json({ message: '2FA doğrulaması başarılı' });
});

// 2FA deaktivasyonu
export const disableTwoFactor = asyncHandler(async (req, res) => {
  await authService.disableTwoFactor(req.user.id, req.body.token);
  
  res.json({ message: '2FA başarıyla deaktif edildi' });
});

// OAuth endpoints
export const googleAuth = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const user = await oauthService.handleGoogleAuth(code);
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // Frontend'e yönlendir
  res.redirect(`${config.frontend.url}/auth/callback?token=${accessToken}`);
});

export const githubAuth = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const user = await oauthService.handleGithubAuth(code);
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect(`${config.frontend.url}/auth/callback?token=${accessToken}`);
});

// OAuth bağlantılarını yönetme
export const unlinkProvider = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  
  await oauthService.unlinkProvider(req.user.id, provider);
  
  res.json({ 
    message: `${provider} bağlantısı başarıyla kaldırıldı` 
  });
});