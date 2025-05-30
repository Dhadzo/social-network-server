import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { NotificationsController } from '../controllers/notifications.controller';

const router = Router();
const notificationsController = new NotificationsController();

// Get user's notifications with pagination
router.get('/', authenticateUser, notificationsController.getNotifications);

// Mark a specific notification as read
router.post('/:id/read', authenticateUser, notificationsController.markAsRead);

// Mark all notifications as read
router.post(
  '/read-all',
  authenticateUser,
  notificationsController.markAllAsRead
);

// Get unread notifications count
router.get(
  '/unread-count',
  authenticateUser,
  notificationsController.getUnreadCount
);

export default router;
