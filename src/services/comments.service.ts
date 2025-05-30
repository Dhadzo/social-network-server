import pool from '../config/database';
import { ResultSetHeader } from 'mysql2';
import { NotificationsService } from './notifications.service';

export interface Comment {
  id: number;
  content: string;
  post_id: number;
  user_id: number;
  created_at: Date;
}

export interface CommentWithUser extends Comment {
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
  };
}

export interface CreateCommentDTO {
  content: string;
  postId: number;
}

export class CommentsService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  async getCommentsByPostId(postId: number): Promise<CommentWithUser[]> {
    const [comments] = await pool.execute<any[]>(
      `SELECT c.*, u.id as user_id, u.username, u.email, u.name 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ? 
       ORDER BY c.created_at DESC`,
      [postId]
    );

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      post_id: comment.post_id,
      user_id: comment.user_id,
      created_at: comment.created_at,
      user: {
        id: comment.user_id,
        username: comment.username,
        email: comment.email,
        name: comment.name
      }
    }));
  }

  async createComment(
    userId: number,
    commentData: CreateCommentDTO
  ): Promise<CommentWithUser> {
    try {
      // First get the post to check the author
      const [posts] = await pool.execute<any[]>(
        'SELECT user_id FROM posts WHERE id = ?',
        [commentData.postId]
      );

      if (posts.length === 0) {
        throw new Error('Post not found');
      }

      const postAuthorId = posts[0].user_id;

      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO comments (content, post_id, user_id) VALUES (?, ?, ?)',
        [commentData.content, commentData.postId, userId]
      );

      // Fetch the newly created comment with user information
      const [comments] = await pool.execute<any[]>(
        `SELECT c.*, u.id as user_id, u.username, u.email, u.name 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = ?`,
        [result.insertId]
      );

      const comment = comments[0];

      // Create notification if the commenter is not the post author
      if (postAuthorId !== userId) {
        // Get the commenter's information
        const [commenters] = await pool.execute<any[]>(
          'SELECT username, name FROM users WHERE id = ?',
          [userId]
        );
        const commenter = commenters[0];

        await this.notificationsService.createNotification({
          userId: postAuthorId, // Post author
          actorId: userId, // Commenter
          type: 'comment',
          message: `${commenter.name} commented on your post`,
          postId: commentData.postId,
          commentId: result.insertId
        });
      }

      return {
        id: comment.id,
        content: comment.content,
        post_id: comment.post_id,
        user_id: comment.user_id,
        created_at: comment.created_at,
        user: {
          id: comment.user_id,
          username: comment.username,
          email: comment.email,
          name: comment.name
        }
      };
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }
}

export const commentsService = new CommentsService();
