import { Request, Response, NextFunction } from 'express';
import { ValidationRules } from '../types';
import { logger } from '../utils/logger';

const validate = (validations: ValidationRules) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validasyon kurallarını uygula
      for (const field in validations) {
        const rules = validations[field];
        const value = req.body[field];

        // Alan var mı kontrol et
        if (rules.exists && !value) {
          return res.status(400).json({
            error: true,
            message: `${field} alanı gerekli`,
            field
          });
        }

        // Uzunluk kontrolü
        if (rules.isLength) {
          const { min, max } = rules.isLength;
          if (min && value.length < min) {
            return res.status(400).json({
              error: true,
              message: `${field} alanı en az ${min} karakter olmalı`,
              field
            });
          }
          if (max && value.length > max) {
            return res.status(400).json({
              error: true,
              message: `${field} alanı en fazla ${max} karakter olmalı`,
              field
            });
          }
        }

        // Regex kontrolü
        if (rules.matches && !rules.matches.test(value)) {
          return res.status(400).json({
            error: true,
            message: `${field} alanı geçerli formatta değil`,
            field
          });
        }

        // Email kontrolü
        if (rules.isEmail && !isValidEmail(value)) {
          return res.status(400).json({
            error: true,
            message: `Geçerli bir email adresi giriniz`,
            field
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Validasyon hatası:', error);
      res.status(500).json({
        error: true,
        message: 'Validasyon işlemi sırasında bir hata oluştu'
      });
    }
  };
};

// Email validasyonu için yardımcı fonksiyon
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default validate;