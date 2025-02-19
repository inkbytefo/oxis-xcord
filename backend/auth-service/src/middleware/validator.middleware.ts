import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult, body, type ValidationError } from 'express-validator';
import { ValidationError as CustomValidationError } from '../utils/errors';

interface FormattedValidationError {
  field: string;
  message: string;
  value?: any;
}

// Express-validator ValidationError tipini genişlet
type ExtendedValidationError = ValidationError & {
  path: string;
  value: any;
};

interface ValidationRule {
  required?: boolean;
  trim?: boolean;
  minLength?: number;
  maxLength?: number;
  regex?: RegExp;
  message?: string;
  custom?: (value: any) => boolean | Promise<boolean>;
}

interface ValidationRules {
  [field: string]: ValidationRule;
}

interface CommonValidations {
  password: {
    minLength: number;
    maxLength: number;
    regex: RegExp;
    message: string;
  };
  username: {
    minLength: number;
    maxLength: number;
    regex: RegExp;
    message: string;
  };
  email: {
    regex: RegExp;
    message: string;
  };
}

const formatValidationErrors = (result: ReturnType<typeof validationResult>): FormattedValidationError[] => {
  return result.array().map(error => ({
    field: (error as ExtendedValidationError).path,
    message: error.msg,
    value: (error as ExtendedValidationError).value
  }));
};

/**
 * Express-validator middleware'i
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Tüm validasyonları çalıştır
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Hataları formatlayıp ValidationError olarak gönder
    const formattedErrors = formatValidationErrors(errors);
    next(new CustomValidationError(formattedErrors));
  };
};

/**
 * Ortak validasyon kuralları
 */
export const commonValidations: CommonValidations = {
  password: {
    minLength: 8,
    maxLength: 100,
    regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    message: 'Şifre en az 8 karakter uzunluğunda olmalı ve en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir'
  },
  username: {
    minLength: 3,
    maxLength: 30,
    regex: /^[a-zA-Z0-9_-]+$/,
    message: 'Kullanıcı adı 3-30 karakter arasında olmalı ve sadece harf, rakam, tire ve altçizgi içermelidir'
  },
  email: {
    regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Geçerli bir email adresi giriniz'
  }
};

/**
 * Özel validasyon kuralları oluşturucu
 */
export const createValidator = (rules: ValidationRules): ValidationChain[] => {
  return Object.entries(rules).map(([field, validations]) => {
    const chain = body(field);

    if (validations.required) {
      chain.notEmpty().withMessage(`${field} alanı zorunludur`);
    }

    if (validations.trim) {
      chain.trim();
    }

    if (validations.minLength) {
      chain.isLength({ min: validations.minLength })
        .withMessage(`${field} en az ${validations.minLength} karakter olmalıdır`);
    }

    if (validations.maxLength) {
      chain.isLength({ max: validations.maxLength })
        .withMessage(`${field} en fazla ${validations.maxLength} karakter olmalıdır`);
    }

    if (validations.regex) {
      chain.matches(validations.regex)
        .withMessage(validations.message || `${field} geçerli formatta değil`);
    }

    if (validations.custom) {
      chain.custom(validations.custom);
    }

    return chain;
  });
};

/**
 * MongoDB ObjectId validasyonu
 */
export const isValidObjectId = (value: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

/**
 * UUID validasyonu
 */
export const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

interface StringObject {
  [key: string]: any;
}

/**
 * Sanitizasyon yardımcıları
 */
export const sanitizers = {
  trimAll: (obj: StringObject): StringObject => {
    const sanitized: StringObject = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },

  removeEmpty: (obj: StringObject): StringObject => {
    const cleaned: StringObject = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  },

  escapeHTML: (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};