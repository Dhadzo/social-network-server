import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { MessagesService } from '../services/messages.service';

const messagesService = new MessagesService();

export class MessagesController {
  async createConversation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const conversation = await messagesService.createConversation(
        req.user.id,
        req.body
      );

      res.status(201).json({
        message: 'Conversation created successfully',
        conversation
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const message = await messagesService.createMessage(
        req.user.id,
        req.body
      );

      res.status(201).json({
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getConversationMessages(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const conversationId = parseInt(req.params.conversationId);
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string;

      const messages = await messagesService.getConversationMessages(
        conversationId,
        req.user.id,
        limit,
        before
      );

      res.json({
        message: 'Messages retrieved successfully',
        messages
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUserConversations(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const conversations = await messagesService.getUserConversations(
        req.user.id,
        limit,
        offset
      );

      res.json({
        message: 'Conversations retrieved successfully',
        conversations
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async markMessagesAsRead(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const conversationId = parseInt(req.params.conversationId);

      await messagesService.markMessagesAsRead(conversationId, req.user.id);

      res.json({
        message: 'Messages marked as read successfully'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
