import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import type { ValidationError } from 'express-validator';
import { CustomError } from '../utils/errors';

interface ErrorResponse {
  message: string;
  errors?: ValidationError[];
  stack?: string;
}

export const errorHandlerMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const response: ErrorResponse = {
    message: err.message || 'Internal Server Error',
  };

  // Include validation errors if present
  if (err instanceof CustomError && err.errors) {
    response.errors = err.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Set appropriate status code
  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  
  res.status(statusCode).json(response);
};
