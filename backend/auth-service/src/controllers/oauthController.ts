import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, StrategyOptions as GoogleStrategyOptions } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User, OAuthProfile } from '../types';
import { generateAccessToken, generateRefreshToken } from '../config/jwt';
import * as db from '../config/database';
import { logger } from '../utils/logger';

// OAuth stratejilerini koşullu olarak yükle
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const googleOptions: GoogleStrategyOptions = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!
  };

  passport.use(new GoogleStrategy(googleOptions,
    async (_accessToken: string, _refreshToken: string, profile: OAuthProfile, done: any) => {
      try {
        // Kullanıcı var mı kontrol et
        const userResult = await db.query<User>(
          'SELECT * FROM users WHERE google_id = $1',
          [profile.id]
        );

        if (userResult.rows.length === 0) {
          // Yeni kullanıcı oluştur
          const result = await db.query<User>(
            'INSERT INTO users (username, email, google_id) VALUES ($1, $2, $3) RETURNING *',
            [profile.displayName, profile.emails?.[0]?.value || '', profile.id]
          );
          const user = result.rows[0];
          logger.info(`Yeni Google kullanıcısı oluşturuldu: ${user.username}`);
          return done(null, user);
        }

        const user = userResult.rows[0];
        logger.info(`Google kullanıcısı giriş yaptı: ${user.username}`);
        return done(null, user);
      } catch (error) {
        logger.error('Google OAuth hatası:', error);
        return done(error, null);
      }
    }
  ));
} else {
  logger.warn('Google OAuth kimlik bilgileri eksik. Google ile giriş devre dışı.');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  const githubOptions = {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL!
  };

  passport.use(new GitHubStrategy(githubOptions,
    async (_accessToken: string, _refreshToken: string, profile: OAuthProfile, done: any) => {
      try {
        // Kullanıcı var mı kontrol et
        const userResult = await db.query<User>(
          'SELECT * FROM users WHERE github_id = $1',
          [profile.id]
        );

        if (userResult.rows.length === 0) {
          // Yeni kullanıcı oluştur
          const result = await db.query<User>(
            'INSERT INTO users (username, github_id) VALUES ($1, $2) RETURNING *',
            [profile.displayName || profile.id, profile.id]
          );
          const user = result.rows[0];
          logger.info(`Yeni GitHub kullanıcısı oluşturuldu: ${user.username}`);
          return done(null, user);
        }

        const user = userResult.rows[0];
        logger.info(`GitHub kullanıcısı giriş yaptı: ${user.username}`);
        return done(null, user);
      } catch (error) {
        logger.error('GitHub OAuth hatası:', error);
        return done(error, null);
      }
    }
  ));
} else {
  logger.warn('GitHub OAuth kimlik bilgileri eksik. GitHub ile giriş devre dışı.');
}

// Google auth başlat
export const googleAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ message: 'Google ile giriş şu anda kullanılamıyor' });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

// Google callback
export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ message: 'Google ile giriş şu anda kullanılamıyor' });
  }
  
  passport.authenticate('google', { session: false }, async (err: Error, user: User) => {
    if (err) {
      logger.error('Google callback hatası:', err);
      return res.redirect('/auth/login?error=oauth_failed');
    }

    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.redirect(`/auth/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
  })(req, res, next);
};

// GitHub auth başlat
export const githubAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(501).json({ message: 'GitHub ile giriş şu anda kullanılamıyor' });
  }
  passport.authenticate('github', {
    scope: ['user:email']
  })(req, res, next);
};

// GitHub callback
export const githubCallback = (req: Request, res: Response, next: NextFunction) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(501).json({ message: 'GitHub ile giriş şu anda kullanılamıyor' });
  }

  passport.authenticate('github', { session: false }, async (err: Error, user: User) => {
    if (err) {
      logger.error('GitHub callback hatası:', err);
      return res.redirect('/auth/login?error=oauth_failed');
    }

    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.redirect(`/auth/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
  })(req, res, next);
};