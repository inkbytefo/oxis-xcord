import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { Redis } from 'ioredis';
import { config, validation } from '../config/index.js';
import { User, Session } from '../models/User.js';
import {
  AuthenticationError,
  AccountLockedError,
  AccountSuspendedError,
  EmailNotVerifiedError,
  InvalidTokenError
} from '../utils/errors.js';
import ms from 'ms';

const redis = new Redis(config.redis.url);

class AuthService {
  // Şifre politikası kontrolü
  #validatePassword(password) {
    if (!validation.password.test(password)) {
      throw new AuthenticationError(
        'INVALID_PASSWORD',
        'Şifre politikası gereksinimlerini karşılamıyor'
      );
    }
  }

  // Kullanıcı kaydı
  async register({ username, email, password }) {
    this.#validatePassword(password);

    const user = await User.create({
      username,
      email,
      password,
      emailVerificationToken: crypto.randomBytes(32).toString('hex')
    });

    // Email doğrulama maili gönder
    await this.#sendVerificationEmail(user);

    return user;
  }

  // Kullanıcı girişi
  async login({ email, password, userAgent, ip }) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError();
    }

    // Hesap durumu kontrolleri
    if (user.isSuspended) {
      throw new AccountSuspendedError(user.suspensionReason);
    }

    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    // Hesap kilidi kontrolü
    if (this.#isAccountLocked(user)) {
      throw new AccountLockedError('Çok fazla başarısız giriş denemesi');
    }

    // Şifre kontrolü
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await this.#handleFailedLogin(user);
      throw new AuthenticationError();
    }

    // Başarılı giriş işlemleri
    await this.#resetLoginAttempts(user);

    // Token oluşturma
    const { accessToken, refreshToken } = await this.#generateTokenPair(user);

    // Oturum kaydı
    const session = await Session.create({
      userId: user.id,
      token: refreshToken,
      userAgent,
      ip,
      expiresAt: new Date(Date.now() + ms(config.jwt.refreshToken.expiresIn))
    });

    return {
      user,
      tokens: { accessToken, refreshToken },
      sessionId: session.id
    };
  }

  // 2FA aktivasyonu
  async enableTwoFactor(userId) {
    const user = await this.#getUserById(userId);

    if (user.twoFactorEnabled) {
      throw new Error('2FA zaten aktif');
    }

    const secret = await user.generateTwoFactorSecret();
    const backupCodes = this.#generateBackupCodes();

    user.twoFactorSecret = secret;
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    const otpauth = authenticator.keyuri(
      user.email,
      config.twoFactor.issuer,
      secret
    );

    return {
      secret,
      otpauth,
      backupCodes
    };
  }

  // 2FA doğrulama
  async verifyTwoFactor(userId, token) {
    const user = await this.#getUserById(userId);

    if (!user.twoFactorEnabled) {
      throw new Error('2FA aktif değil');
    }

    const isValid = await user.verifyTwoFactorToken(token);
    if (!isValid) {
      throw new AuthenticationError('AUTH004', 'Geçersiz 2FA kodu');
    }

    return true;
  }

  // Token yenileme
  async refreshToken(refreshToken, sessionId) {
    const session = await Session.findOne({
      where: { id: sessionId, token: refreshToken, isRevoked: false }
    });

    if (!session || session.expiresAt < new Date()) {
      throw new InvalidTokenError('Geçersiz veya süresi dolmuş refresh token');
    }

    const user = await User.findByPk(session.userId);
    if (!user || user.isSuspended) {
      throw new AuthenticationError();
    }

    // Yeni token çifti oluştur
    const tokens = await this.#generateTokenPair(user);

    // Eski oturumu geçersiz kıl ve yenisini oluştur
    await session.update({ isRevoked: true });
    await Session.create({
      userId: user.id,
      token: tokens.refreshToken,
      userAgent: session.userAgent,
      ip: session.ip,
      expiresAt: new Date(Date.now() + ms(config.jwt.refreshToken.expiresIn))
    });

    return tokens;
  }

  // Çıkış yapma
  async logout(userId, sessionId) {
    await Session.update(
      { isRevoked: true },
      { where: { id: sessionId, userId } }
    );
  }

  // Tüm oturumlardan çıkış
  async logoutAll(userId) {
    await Session.update(
      { isRevoked: true },
      { where: { userId, isRevoked: false } }
    );
  }

  // Profil güncelleme
  async updateProfile(userId, data) {
    const user = await this.#getUserById(userId);

    if (data.password) {
      this.#validatePassword(data.password);
      user.password = data.password;
    }

    if (data.email) {
      user.email = data.email;
    }

    await user.save();
    return user;
  }

  // Yardımcı metodlar
  async #getUserById(id) {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }
    return user;
  }

  async #generateTokenPair(user) {
    const payload = {
      id: user.id,
      email: user.email,
      roles: user.roles
    };

    const accessToken = jwt.sign(
      payload,
      config.jwt.accessToken.secret,
      { expiresIn: config.jwt.accessToken.expiresIn }
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwt.refreshToken.secret,
      { expiresIn: config.jwt.refreshToken.expiresIn }
    );

    return { accessToken, refreshToken };
  }

  #isAccountLocked(user) {
    if (!user.lastFailedLogin) return false;

    const lockoutEnd = new Date(
      user.lastFailedLogin.getTime() + config.passwordPolicy.lockoutDuration
    );
    return (
      user.loginAttempts >= config.passwordPolicy.maxAttempts &&
      lockoutEnd > new Date()
    );
  }

  async #handleFailedLogin(user) {
    user.loginAttempts += 1;
    user.lastFailedLogin = new Date();
    await user.save();
  }

  async #resetLoginAttempts(user) {
    user.loginAttempts = 0;
    user.lastFailedLogin = null;
    user.lastLogin = new Date();
    await user.save();
  }

  #generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < config.twoFactor.backupCodeCount; i++) {
      codes.push(
        crypto
          .randomBytes(config.twoFactor.backupCodeLength)
          .toString('hex')
          .slice(0, config.twoFactor.backupCodeLength)
      );
    }
    return codes;
  }

  async #sendVerificationEmail(user) {
    // Email gönderme işlemi burada implement edilecek
  }
}

export const authService = new AuthService();
