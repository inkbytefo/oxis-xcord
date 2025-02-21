import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User, ServiceError } from '../types';
import * as db from '../config/database';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken } from '../config/jwt';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password }: { username: string; email: string; password: string } = req.body;

    // Kullanıcı var mı kontrol et
    const userExists = await db.query<User>(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Kullanıcı zaten mevcut' });
    }

    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Kullanıcıyı kaydet
    const result = await db.query<User>(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].id;
    const accessToken = generateAccessToken({ id: userId });
    const refreshToken = generateRefreshToken({ id: userId });

    logger.info(`Yeni kullanıcı kaydedildi: ${username}`);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error('Kayıt işlemi sırasında hata:', error);
    const serviceError = error as ServiceError;
    res.status(serviceError.statusCode || 500).json({ message: 'Sunucu hatası' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;

    // Kullanıcıyı bul
    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
    }

    const user = result.rows[0];

    // Şifreyi kontrol et
    const validPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!validPassword) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
    }

    // Token'ları oluştur
    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Son giriş zamanını güncelle
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    logger.info(`Kullanıcı giriş yaptı: ${user.username}`);

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
    logger.error('Giriş işlemi sırasında hata:', error);
    const serviceError = error as ServiceError;
    res.status(serviceError.statusCode || 500).json({ message: 'Sunucu hatası' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token gerekli' });
    }

    const decoded = generateAccessToken({ id: refreshToken });
    res.json({ accessToken: decoded });
  } catch (error) {
    logger.error('Token yenileme sırasında hata:', error);
    res.status(401).json({ message: 'Geçersiz refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Client tarafında token'ları temizlemek yeterli
    res.json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    logger.error('Çıkış işlemi sırasında hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};