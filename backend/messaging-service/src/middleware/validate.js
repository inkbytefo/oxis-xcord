// Input validation middleware using express-validator
import { body, param, validationResult } from 'express-validator';

export const validateMessage = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Message too long (max 2000 characters)'),
  body('sender')
    .trim()
    .notEmpty()
    .withMessage('Sender is required'),
  body('receiver')
    .trim()
    .notEmpty()
    .withMessage('Receiver is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateRoom = [
  param('room')
    .trim()
    .notEmpty()
    .withMessage('Room ID is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid room ID length'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
