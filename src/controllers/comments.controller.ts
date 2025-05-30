import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { CommentsService } from '../services/comments.service';

const commentsService = new CommentsService();

export class CommentsController {
  async getCommentsByPostId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const postId = parseInt(req.params.id);
      const comments = await commentsService.getCommentsByPostId(postId);

      res.json({
        message: 'Comments retrieved successfully',
        comments
      });
    } catch (error) {
      console.error('Error getting comments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { content, post_id } = req.body;

      if (!content || !post_id) {
        res.status(400).json({ message: 'Content and postId are required' });
        return;
      }

      const comment = await commentsService.createComment(req.user.id, {
        content,
        postId: post_id
      });

      res.status(201).json({
        message: 'Comment created successfully',
        comment
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
