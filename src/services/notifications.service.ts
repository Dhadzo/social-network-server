import pool from '../config/database';
import {
  Notification,
  CreateNotificationDTO,
  NotificationsResponse
} from '../types/notification.types';

export class NotificationsService {
  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    try {
      const {
        rows: [result]
      } = await pool.query(
        `INSERT INTO notifications (user_id, actor_id, type, message, post_id, comment_id) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          data.userId,
          data.actorId,
          data.type,
          data.message,
          data.postId || null,
          data.commentId || null
        ]
      );

      const notification = await this.getNotificationById(result.id);
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
    const { rows: notifications } = await pool.query(
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
       WHERE n.id = $1`,
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
    const {
      rows: [countResult]
    } = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
      [userId]
    );
    const total = Number(countResult.total);

    // Get paginated notifications
    const { rows: notifications } = await pool.query(
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
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
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
      await pool.query(
        'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
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
      await pool.query(
        'UPDATE notifications SET read = TRUE WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    const {
      rows: [result]
    } = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = FALSE',
      [userId]
    );
    return Number(result.count);
  }
}
