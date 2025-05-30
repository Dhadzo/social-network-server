import { Request, Response, NextFunction, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';

const validateRequest: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const validateSignup: RequestHandler[] = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),
  body('username').trim().isLength({ min: 3 }),
  body('name').trim().notEmpty(),
  validateRequest
];

export const validateSignin: RequestHandler[] = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validateRequest
];
