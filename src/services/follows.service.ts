import pool from '../config/database';
import { ResultSetHeader } from 'mysql2';
import { NotificationsService } from './notifications.service';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

export class FollowsService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  async toggleFollow(
    followerId: number,
    followingId: number
  ): Promise<boolean> {
    try {
      // Check if already following
      const [existingFollows] = await pool.execute<any[]>(
        'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?',
        [followerId, followingId]
      );

      if (existingFollows.length > 0) {
        // Unfollow
        await pool.execute<ResultSetHeader>(
          'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
          [followerId, followingId]
        );
        return false;
      } else {
        // Follow
        await pool.execute<ResultSetHeader>(
          'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
          [followerId, followingId]
        );

        // Get the follower's information for the notification
        const [followers] = await pool.execute<any[]>(
          'SELECT username, name FROM users WHERE id = ?',
          [followerId]
        );
        const follower = followers[0];

        // Create notification for the followed user
        await this.notificationsService.createNotification({
          userId: followingId, // The user being followed
          actorId: followerId, // The user who followed
          type: 'follow',
          message: `${follower.name} started following you`
        });

        return true;
      }
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getSuggestedUsers(userId: number, limit: number = 10): Promise<User[]> {
    try {
      // Get users who are not already being followed and not the current user
      const [users] = await pool.query<any[]>(
        `SELECT u.id, u.username, u.name, u.email
         FROM users u
         WHERE u.id != ?
         AND u.id NOT IN (
           SELECT following_id 
           FROM follows 
           WHERE follower_id = ?
         )
         ORDER BY RAND()
         LIMIT ?`,
        [userId, userId, limit]
      );

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getFollowing(userId: number): Promise<User[]> {
    try {
      const [users] = await pool.execute<any[]>(
        `SELECT u.id, u.username, u.name, u.email
         FROM users u
         JOIN follows f ON u.id = f.following_id
         WHERE f.follower_id = ?`,
        [userId]
      );

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getFollowers(userId: number): Promise<User[]> {
    try {
      const [users] = await pool.execute<any[]>(
        `SELECT u.id, u.username, u.name, u.email
         FROM users u
         JOIN follows f ON u.id = f.follower_id
         WHERE f.following_id = ?`,
        [userId]
      );

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    try {
      const [users] = await pool.execute<any[]>(
        `SELECT u.id, u.username, u.name, u.email
         FROM users u
         JOIN follows f ON u.id = f.follower_id
         WHERE f.following_id = ?`,
        [userId]
      );

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    try {
      const [users] = await pool.execute<any[]>(
        `SELECT u.id, u.username, u.name, u.email
         FROM users u
         JOIN follows f ON u.id = f.following_id
         WHERE f.follower_id = ?`,
        [userId]
      );

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email
      }));
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }
}

export const followsService = new FollowsService();
