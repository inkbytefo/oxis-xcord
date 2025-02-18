import jwt from 'jsonwebtoken';
import ms from 'ms';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

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
    logger.debug('Kayıt isteği alındı', { username, email });

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    logger.debug('Şifre doğrulanıyor');
    if (!passwordRegex.test(password)) {
      logger.warn('Şifre doğrulama başarısız');
      return res.status(400).json({
        message: 'Şifre en az 8 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf ve bir sayı içermelidir'
      });
    }

    // Check if user exists
    logger.debug('Kullanıcı varlığı kontrol ediliyor');
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      logger.warn('Kullanıcı zaten mevcut', { existingUser: userExists.username || userExists.email });
      return res.status(400).json({
        message: userExists.username === username ? 'Bu kullanıcı adı zaten alınmış' : 'Bu e-posta adresi zaten kayıtlı'
      });
    }

    // Create new user
    logger.debug('Yeni kullanıcı oluşturuluyor');
    const user = new User({
      username,
      email,
      password,
      roles: ['user']
    });

    logger.debug('Kullanıcı veritabanına kaydediliyor');
    await user.save();

    logger.info('Kullanıcı başarıyla kaydedildi', { username, email });
    res.status(201).json({
      message: 'Kullanıcı başarıyla kaydedildi'
    });
  } catch (error) {
    logger.error('Kullanıcı kaydı sırasında hata', { error: error.message, stack: error.stack });
    res.status(500).json({
      message: 'Kullanıcı kaydı sırasında bir hata oluştu',
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

    // HTTP-only cookie olarak refresh token'ı gönder
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ms(config.jwt.refreshExpiresIn)
    });

    res.json({
      token: accessToken,
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
      return res.status(401).json({ message: 'Geçersiz yenileme tokeni' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json(tokens);
  } catch (error) {
    res.status(500).json({
      message: 'Token yenileme sırasında bir hata oluştu',
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

    res.json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    res.status(500).json({
      message: 'Çıkış yapılırken bir hata oluştu',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({
      message: 'Profil bilgileri alınırken bir hata oluştu',
      error: error.message
    });
  }
};

export const updateProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).session(session);

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Update email if provided
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email }).session(session);
      if (emailExists) {
        return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda' });
      }
      user.email = email;
    }

    // Update password if provided
    if (currentPassword && newPassword) {
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Mevcut şifre yanlış' });
      }

      // Validate new password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message: 'Yeni şifre en az 8 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf ve bir sayı içermelidir'
        });
      }

      user.password = newPassword;
    }

    await user.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.json({
      message: 'Profil başarıyla güncellendi',
      user: user.toJSON()
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      message: 'Profil güncellenirken bir hata oluştu',
      error: error.message
    });
  }
};
