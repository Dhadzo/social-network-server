import pool from '../config/database';
import {
  Notification,
  CreateNotificationDTO,
  NotificationsResponse
} from '../types/notification.types';

export class NotificationsService {
  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    try {
      const [result] = await pool.execute<any>(
        `INSERT INTO notifications (user_id, actor_id, type, message, post_id, comment_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.userId,
          data.actorId,
          data.type,
          data.message,
          data.postId || null,
          data.commentId || null
        ]
      );

      const notification = await this.getNotificationById(result.insertId);
      if (!notification) {
        throw new Error('Failed to retrieve created notification');
      }
      return notification;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getNotificationById(id: number): Promise<Notification | null> {
    const [notifications] = await pool.execute<any[]>(
      `SELECT 
        n.*,
        u.id as user_id,
        u.username,
        u.email,
        u.name,
        p.id as post_id,
        p.content as post_content
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       LEFT JOIN posts p ON n.post_id = p.id
       WHERE n.id = ?`,
      [id]
    );

    if (!notifications.length) return null;

    const notification = notifications[0];
    return {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      read: Boolean(notification.read),
      created_at: notification.created_at,
      user: {
        id: notification.user_id,
        username: notification.username,
        email: notification.email,
        name: notification.name
      },
      post: notification.post_id
        ? {
            id: notification.post_id,
            content: notification.post_content
          }
        : undefined
    };
  }

  async getUserNotifications(
    userId: number,
    offset: number = 0,
    limit: number = 10
  ): Promise<NotificationsResponse> {
    // Get total count
    const [countResult] = await pool.execute<any[]>(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [userId]
    );
    const total = Number(countResult[0].total);

    // Get paginated notifications
    const [notifications] = await pool.query<any[]>(
      `SELECT 
        n.*,
        u.id as user_id,
        u.username,
        u.email,
        u.name,
        p.id as post_id,
        p.content as post_content
       FROM notifications n
       JOIN users u ON n.actor_id = u.id
       LEFT JOIN posts p ON n.post_id = p.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const hasMore = offset + notifications.length < total;
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        read: Boolean(notification.read),
        created_at: notification.created_at,
        user: {
          id: notification.user_id,
          username: notification.username,
          email: notification.email,
          name: notification.name
        },
        post: notification.post_id
          ? {
              id: notification.post_id,
              content: notification.post_content
            }
          : undefined
      })),
      total,
      hasMore,
      page: currentPage
    };
  }

  async markAsRead(
    notificationId: number,
    userId: number
  ): Promise<Notification | null> {
    try {
      await pool.execute(
        'UPDATE notifications SET read = TRUE WHERE id = ? AND user_id = ?',
        [notificationId, userId]
      );
      return this.getNotificationById(notificationId);
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: number): Promise<void> {
    try {
      await pool.execute(
        'UPDATE notifications SET read = TRUE WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    const [result] = await pool.execute<any[]>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = FALSE',
      [userId]
    );
    return Number(result[0].count);
  }
}
