import jwt, { SignOptions, Secret, JwtPayload } from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { Redis } from 'ioredis';
import { config, validation } from '../config';
import { User, Session } from '../models/User';
import {
  AuthenticationError,
  AccountLockedError,
  AccountSuspendedError,
  EmailNotVerifiedError,
  InvalidTokenError
} from '../utils/errors';

// Type declarations
interface LoginParams {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  user: User;
  tokens: TokenPair;
  sessionId: string;
}

interface TwoFactorResult {
  secret: string;
  otpauth: string;
  backupCodes: string[];
}

interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  roles: string[];
}

type JWTSignOptions = {
  algorithm: jwt.Algorithm;
  expiresIn: number; // Always use seconds
};

interface JWTConfig {
  secret: string;
  expiresIn: number; // Always use seconds
}

const redis = new Redis(config.redis.url);

// Convert duration string to seconds
const durationToSeconds = (duration: string): number => {
  const units: { [key: string]: number } = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };

  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid duration format');
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};

// JWT sign helper
function signJWT(payload: TokenPayload, secret: string, options: SignOptions): string {
  return jwt.sign(payload, secret, {
    ...options,
    algorithm: 'HS256'
  });
}

class AuthService {
  // Private properties
  readonly #jwtConfig: { accessToken: JWTConfig; refreshToken: JWTConfig };
  readonly #jwtBaseOptions: Omit<SignOptions, 'expiresIn'>;

  constructor() {
    this.#jwtConfig = {
      accessToken: {
        secret: config.jwt.accessToken.secret,
        expiresIn: durationToSeconds(config.jwt.accessToken.expiresIn)
      },
      refreshToken: {
        secret: config.jwt.refreshToken.secret,
        expiresIn: durationToSeconds(config.jwt.refreshToken.expiresIn)
      }
    };

    this.#jwtBaseOptions = {
      algorithm: 'HS256'
    };
  }

  // Şifre politikası kontrolü
  #validatePassword(password: string): void {
    if (!validation.password.test(password)) {
      throw new AuthenticationError(
        'INVALID_PASSWORD',
        'Şifre politikası gereksinimlerini karşılamıyor'
      );
    }
  }

  // Kullanıcı kaydı
  async register(params: { username: string; email: string; password: string }): Promise<User> {
    this.#validatePassword(params.password);

    const user = await User.create({
      username: params.username,
      email: params.email,
      password: params.password,
      emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      roles: ['user'],
      isActive: true,
      isSuspended: false,
      loginAttempts: 0,
      emailVerified: false,
      twoFactorEnabled: false,
      twoFactorBackupCodes: []
    });

    await this.#sendVerificationEmail(user);

    return user;
  }

  // Kullanıcı girişi
  async login(params: LoginParams): Promise<LoginResult> {
    const user = await User.findOne({ where: { email: params.email } });
    if (!user) {
      throw new AuthenticationError();
    }

    if (user.isSuspended) {
      throw new AccountSuspendedError(user.suspensionReason || 'Hesap askıya alındı');
    }

    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    if (this.#isAccountLocked(user)) {
      throw new AccountLockedError('Çok fazla başarısız giriş denemesi');
    }

    const isValidPassword = await user.comparePassword(params.password);
    if (!isValidPassword) {
      await this.#handleFailedLogin(user);
      throw new AuthenticationError();
    }

    await this.#resetLoginAttempts(user);

    const { accessToken, refreshToken } = await this.#generateTokenPair(user);

    const session = await Session.create({
      userId: user.id,
      token: refreshToken,
      userAgent: params.userAgent || null,
      ip: params.ip || null,
      expiresAt: new Date(Date.now() + this.#jwtConfig.refreshToken.expiresIn * 1000),
      isRevoked: false
    });

    return {
      user,
      tokens: { accessToken, refreshToken },
      sessionId: session.id
    };
  }

  // Token yenileme
  async refreshToken(refreshToken: string, sessionId: string): Promise<TokenPair> {
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

    const tokens = await this.#generateTokenPair(user);

    await session.update({ isRevoked: true });
    await Session.create({
      userId: user.id,
      token: tokens.refreshToken,
      userAgent: session.userAgent,
      ip: session.ip,
      expiresAt: new Date(Date.now() + this.#jwtConfig.refreshToken.expiresIn * 1000),
      isRevoked: false
    });

    return tokens;
  }

  // ... [Other methods remain the same until #generateTokenPair]

  async #generateTokenPair(user: User): Promise<TokenPair> {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      roles: user.roles
    };

    const accessToken = signJWT(
      payload,
      this.#jwtConfig.accessToken.secret,
      {
        ...this.#jwtBaseOptions,
        expiresIn: this.#jwtConfig.accessToken.expiresIn
      }
    );

    const refreshToken = signJWT(
      payload,
      this.#jwtConfig.refreshToken.secret,
      {
        ...this.#jwtBaseOptions,
        expiresIn: this.#jwtConfig.refreshToken.expiresIn
      }
    );

    return { accessToken, refreshToken };
  }

  // ... [Rest of the class methods remain the same]

  #isAccountLocked(user: User): boolean {
    if (!user.lastFailedLogin) return false;

    const lockoutEnd = new Date(
      user.lastFailedLogin.getTime() + config.passwordPolicy.lockoutDuration
    );
    return (
      user.loginAttempts >= config.passwordPolicy.maxAttempts &&
      lockoutEnd > new Date()
    );
  }

  async #handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts += 1;
    user.lastFailedLogin = new Date();
    await user.save();
  }

  async #resetLoginAttempts(user: User): Promise<void> {
    user.loginAttempts = 0;
    user.lastFailedLogin = null;
    user.lastLogin = new Date();
    await user.save();
  }

  #generateBackupCodes(): string[] {
    const codes: string[] = [];
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

  async #sendVerificationEmail(user: User): Promise<void> {
    // Email gönderme işlemi burada implement edilecek
  }
}

export const authService = new AuthService();