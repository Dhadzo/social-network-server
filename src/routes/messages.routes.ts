import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { MessagesController } from '../controllers/messages.controller';

const router = Router();
const messagesController = new MessagesController();

// Conversation routes
router.post(
  '/create-conversation',
  authenticateUser,
  messagesController.createConversation
);
router.get(
  '/conversations',
  authenticateUser,
  messagesController.getUserConversations
);

// Message routes
router.post(
  '/create-message',
  authenticateUser,
  messagesController.createMessage
);
router.get(
  '/conversations/:conversationId/messages',
  authenticateUser,
  messagesController.getConversationMessages
);
router.post(
  '/conversations/:conversationId/read',
  authenticateUser,
  messagesController.markMessagesAsRead
);

export default router;
