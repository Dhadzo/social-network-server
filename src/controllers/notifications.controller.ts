import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { NotificationsService } from '../services/notifications.service';

const notificationsService = new NotificationsService();

export class NotificationsController {
  async getNotifications(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const response = await notificationsService.getUserNotifications(
        req.user.id,
        offset,
        limit
      );

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const notificationId = parseInt(req.params.id);
      const notification = await notificationsService.markAsRead(
        notificationId,
        req.user.id
      );

      if (!notification) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }

      res.json({
        message: 'Notification marked as read',
        notification
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      await notificationsService.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const count = await notificationsService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
