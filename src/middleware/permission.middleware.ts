import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';
import pool from '../config/database';

export const hasPermission = (requiredPermission: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { rows: permissions } = await pool.query(
        `SELECT DISTINCT p.name 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [req.user.id]
      );

      const userPermissions = permissions.map((p) => p.name);

      if (!userPermissions.includes(requiredPermission)) {
        res.status(403).json({
          message: 'You do not have permission to perform this action'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

export const hasRole = (requiredRole: string) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { rows: roles } = await pool.query(
        `SELECT r.name 
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [req.user.id]
      );

      const userRoles = roles.map((r) => r.name);

      if (!userRoles.includes(requiredRole)) {
        res.status(403).json({
          message: 'You do not have the required role to perform this action'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};
