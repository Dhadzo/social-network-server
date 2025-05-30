import pool from '../config/database';
import { User } from '../types/auth.types';

export class UsersService {
  async searchUsers(
    query: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<User[]> {
    try {
      const searchQuery = `%${query}%`;
      const [users] = await pool.query<User[]>(
        `SELECT id, username, name, email 
         FROM users 
         WHERE username LIKE ? OR name LIKE ?
         LIMIT ? OFFSET ?`,
        [searchQuery, searchQuery, limit, offset]
      );

      return users;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const [users] = await pool.query<User[]>(
        `SELECT id, username, name, email 
         FROM users 
         WHERE username = ?`,
        [username]
      );

      return users[0] || null;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }
}

export const usersService = new UsersService();
