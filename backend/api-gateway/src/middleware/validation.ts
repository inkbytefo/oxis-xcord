import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

interface FormattedValidationError {
  field: string;
  message: string;
  value?: any;
}

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: FormattedValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));
    throw new ValidationError(validationErrors);
  }

  next();
};

export const validateBody = (schema: Record<string, any[]>) => {
  return Object.entries(schema).flatMap(([field, rules]) => {
    return rules.map(rule => rule.withMessage(`Invalid ${field}`));
  });
};
