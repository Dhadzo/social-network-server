import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../config/environment';
import { AuthRequest } from '../types/auth.types';
import pool from '../config/database';
import { User } from '../types/auth.types';

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, environment.jwtSecret as string) as {
      user: User;
    };

    // Get user from database
    const { rows: users } = await pool.query<User>(
      'SELECT id, username, email, name FROM users WHERE id = $1',
      [decoded.user.id]
    );

    if (!users.length) {
      res.status(401).json({ message: 'Invalid authentication' });
      return;
    }

    // Attach user to request object
    req.user = users[0];
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};
