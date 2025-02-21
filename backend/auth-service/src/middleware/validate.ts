import { Request, Response, NextFunction } from 'express';
import { ValidationRules } from '../types';
import { logger } from '../utils/logger';

const validate = (validations: ValidationRules) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Apply validation rules
      for (const field in validations) {
        const rules = validations[field];
        const value = req.body[field];

        // Check if field exists
        if (rules.exists && !value) {
          return res.status(400).json({
            error: true,
            message: `${field} is required`,
            field
          });
        }

        // Skip further validations if value is not provided and not required
        if (!value) {
          continue;
        }

        // Length validation
        if (rules.isLength) {
          const { min, max } = rules.isLength;
          if (min && value.length < min) {
            return res.status(400).json({
              error: true,
              message: `${field} must be at least ${min} characters long`,
              field
            });
          }
          if (max && value.length > max) {
            return res.status(400).json({
              error: true,
              message: `${field} cannot exceed ${max} characters`,
              field
            });
          }
        }

        // Pattern validation
        if (rules.matches && !rules.matches.test(value)) {
          return res.status(400).json({
            error: true,
            message: `${field} format is invalid`,
            field
          });
        }

        // Email validation
        if (rules.isEmail && !isValidEmail(value)) {
          return res.status(400).json({
            error: true,
            message: `Please provide a valid email address`,
            field
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Validation error:', error);
      res.status(500).json({
        error: true,
        message: 'An error occurred during validation'
      });
    }
  };
};

// Helper function for email validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default validate;