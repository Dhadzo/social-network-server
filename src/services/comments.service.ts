import pool from '../config/database';
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
    const { rows: comments } = await pool.query(
      `SELECT c.*, u.id as user_id, u.username, u.email, u.name 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = $1 
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
      const { rows: posts } = await pool.query(
        'SELECT user_id FROM posts WHERE id = $1',
        [commentData.postId]
      );

      if (posts.length === 0) {
        throw new Error('Post not found');
      }

      const postAuthorId = posts[0].user_id;

      const {
        rows: [result]
      } = await pool.query(
        'INSERT INTO comments (content, post_id, user_id) VALUES ($1, $2, $3) RETURNING id',
        [commentData.content, commentData.postId, userId]
      );

      // Fetch the newly created comment with user information
      const { rows: comments } = await pool.query(
        `SELECT c.*, u.id as user_id, u.username, u.email, u.name 
         FROM comments c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.id = $1`,
        [result.id]
      );

      const comment = comments[0];

      // Create notification if the commenter is not the post author
      if (postAuthorId !== userId) {
        // Get the commenter's information
        const { rows: commenters } = await pool.query(
          'SELECT username, name FROM users WHERE id = $1',
          [userId]
        );
        const commenter = commenters[0];

        await this.notificationsService.createNotification({
          userId: postAuthorId, // Post author
          actorId: userId, // Commenter
          type: 'comment',
          message: `${commenter.name} commented on your post`,
          postId: commentData.postId,
          commentId: result.id
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
