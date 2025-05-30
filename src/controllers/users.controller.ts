import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { usersService } from '../services/users.service';

export class UsersController {
  async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ message: 'Search query is required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const users = await usersService.searchUsers(query, limit, offset);

      res.json({
        message: 'Users retrieved successfully',
        users
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUserByUsername(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { username } = req.params;
      if (!username) {
        res.status(400).json({ message: 'Username is required' });
        return;
      }

      const user = await usersService.getUserByUsername(username);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json({
        message: 'User retrieved successfully',
        user
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export const usersController = new UsersController();
