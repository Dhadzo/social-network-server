import pool from '../config/database';
import { Post, CreatePostDTO, PostWithUser } from '../types/post.types';
import { NotificationsService } from './notifications.service';

// Update the PostWithUser interface to include likes
interface PostWithUserAndLikes extends PostWithUser {
  likes_count: number;
  user_has_liked: boolean;
}

export class PostsService {
  private notificationsService: NotificationsService;

  constructor() {
    this.notificationsService = new NotificationsService();
  }

  async createPost(
    userId: number,
    postData: CreatePostDTO
  ): Promise<PostWithUser> {
    try {
      const {
        rows: [result]
      } = await pool.query(
        'INSERT INTO posts (content, user_id) VALUES ($1, $2) RETURNING id',
        [postData.content, userId]
      );

      // Fetch the newly created post with user information
      const { rows: posts } = await pool.query(
        `SELECT p.*, u.id as user_id, u.username, u.email, u.name 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
        [result.id]
      );

      const post = posts[0];
      return {
        id: post.id,
        content: post.content,
        user_id: post.user_id,
        created_at: post.created_at,
        user: {
          id: post.user_id,
          username: post.username,
          email: post.email,
          name: post.name
        }
      };
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getAllPosts(
    userId?: number,
    offset: number = 0,
    limit: number = 10
  ): Promise<{
    posts: PostWithUserAndLikes[];
    total: number;
    hasMore: boolean;
    page: number;
  }> {
    // First get total count
    const {
      rows: [countResult]
    } = await pool.query('SELECT COUNT(*) as total FROM posts');
    const total = Number(countResult.total);

    let posts: any = [];

    try {
      // Then get paginated posts
      const { rows } = await pool.query(
        `SELECT 
          p.id,
          p.content,
          p.user_id,
          p.created_at,
          u.username,
          u.email,
          u.name,
          COUNT(DISTINCT l.id) as likes_count,
          MAX(CASE WHEN l.user_id = $1 THEN 1 ELSE 0 END) as user_has_liked
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN likes l ON l.likeable_id = p.id AND l.likeable_type = 'post'
        GROUP BY p.id, p.content, p.user_id, p.created_at, u.username, u.email, u.name
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3`,
        [Number(userId) || 0, Number(limit), Number(offset)]
      );
      posts = rows;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Calculate if there are more posts to load
    const hasMore = offset + posts.length < total;

    // Calculate current page (1-based)
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      posts: posts.map((post: any) => ({
        id: post.id,
        content: post.content,
        user_id: post.user_id,
        created_at: post.created_at,
        likes_count: Number(post.likes_count),
        user_has_liked: Boolean(post.user_has_liked),
        user: {
          id: post.user_id,
          username: post.username,
          email: post.email,
          name: post.name
        }
      })),
      total,
      hasMore,
      page: currentPage
    };
  }

  async getPostById(
    postId: number,
    userId?: number
  ): Promise<PostWithUserAndLikes | null> {
    const { rows: posts } = await pool.query(
      `SELECT 
        p.*, 
        u.id as user_id, 
        u.username, 
        u.email, 
        u.name,
        COUNT(DISTINCT l.id) as likes_count,
        MAX(CASE WHEN l.user_id = $1 THEN 1 ELSE 0 END) as user_has_liked
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       LEFT JOIN likes l ON l.likeable_id = p.id AND l.likeable_type = 'post'
       WHERE p.id = $2
       GROUP BY p.id, u.id, u.username, u.email, u.name`,
      [userId || 0, postId]
    );

    if (!posts.length) return null;

    const post = posts[0];
    return {
      id: post.id,
      content: post.content,
      user_id: post.user_id,
      created_at: post.created_at,
      likes_count: Number(post.likes_count),
      user_has_liked: Boolean(post.user_has_liked),
      user: {
        id: post.user_id,
        username: post.username,
        email: post.email,
        name: post.name
      }
    };
  }

  async toggleLike(
    postId: number,
    userId: number
  ): Promise<PostWithUserAndLikes> {
    try {
      // First get the post to check the author
      const post = await this.getPostById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Check if the like exists
      const { rows: existingLikes } = await pool.query(
        'SELECT * FROM likes WHERE user_id = $1 AND likeable_id = $2 AND likeable_type = $3',
        [userId, postId, 'post']
      );

      if (existingLikes.length > 0) {
        // Like exists, so we'll unlike
        await pool.query(
          'DELETE FROM likes WHERE user_id = $1 AND likeable_id = $2 AND likeable_type = $3',
          [userId, postId, 'post']
        );
      } else {
        // No like exists, so we'll like
        await pool.query(
          'INSERT INTO likes (user_id, likeable_id, likeable_type) VALUES ($1, $2, $3)',
          [userId, postId, 'post']
        );

        // Create notification if the liker is not the post author
        if (post.user_id !== userId) {
          // Get the actor's (liker's) information
          const { rows: actors } = await pool.query(
            'SELECT username, name FROM users WHERE id = $1',
            [userId]
          );
          const actor = actors[0];

          await this.notificationsService.createNotification({
            userId: post.user_id, // Post author
            actorId: userId, // Liker
            type: 'like',
            message: `${actor.name} liked your post`,
            postId: postId
          });
        }
      }

      // Return the post with updated like info
      return this.getPostById(postId, userId) as Promise<PostWithUserAndLikes>;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async getUserPosts(
    userId: number,
    currentUserId: number,
    offset: number = 0,
    limit: number = 10
  ): Promise<{
    posts: PostWithUserAndLikes[];
    total: number;
    hasMore: boolean;
    page: number;
  }> {
    // First get total count
    const {
      rows: [countResult]
    } = await pool.query(
      'SELECT COUNT(*) as total FROM posts WHERE user_id = $1',
      [userId]
    );
    const total = Number(countResult.total);

    let posts: any = [];

    try {
      // Then get paginated posts
      const { rows } = await pool.query(
        `SELECT 
          p.id,
          p.content,
          p.user_id,
          p.created_at,
          u.username,
          u.email,
          u.name,
          COUNT(DISTINCT l.id) as likes_count,
          MAX(CASE WHEN l.user_id = $1 THEN 1 ELSE 0 END) as user_has_liked
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        LEFT JOIN likes l ON l.likeable_id = p.id AND l.likeable_type = 'post'
        WHERE p.user_id = $2
        GROUP BY p.id, p.content, p.user_id, p.created_at, u.username, u.email, u.name
        ORDER BY p.created_at DESC
        LIMIT $3 OFFSET $4`,
        [currentUserId, userId, Number(limit), Number(offset)]
      );
      posts = rows;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Calculate if there are more posts to load
    const hasMore = offset + posts.length < total;

    // Calculate current page (1-based)
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      posts: posts.map((post: any) => ({
        id: post.id,
        content: post.content,
        user_id: post.user_id,
        created_at: post.created_at,
        likes_count: Number(post.likes_count),
        user_has_liked: Boolean(post.user_has_liked),
        user: {
          id: post.user_id,
          username: post.username,
          email: post.email,
          name: post.name
        }
      })),
      total,
      hasMore,
      page: currentPage
    };
  }

  async getUserLikes(
    userId: number,
    currentUserId: number,
    offset: number = 0,
    limit: number = 10
  ): Promise<{
    posts: PostWithUserAndLikes[];
    total: number;
    hasMore: boolean;
    page: number;
  }> {
    // First get total count
    const {
      rows: [countResult]
    } = await pool.query(
      'SELECT COUNT(*) as total FROM likes WHERE user_id = $1 AND likeable_type = $2',
      [userId, 'post']
    );
    const total = Number(countResult.total);

    let posts: any = [];

    try {
      // Then get paginated posts
      const { rows } = await pool.query(
        `SELECT 
          p.id,
          p.content,
          p.user_id,
          p.created_at,
          u.username,
          u.email,
          u.name,
          COUNT(DISTINCT l.id) as likes_count,
          MAX(CASE WHEN l.user_id = $1 THEN 1 ELSE 0 END) as user_has_liked
        FROM posts p 
        JOIN users u ON p.user_id = u.id 
        JOIN likes l ON l.likeable_id = p.id AND l.likeable_type = 'post'
        WHERE l.user_id = $2
        GROUP BY p.id, p.content, p.user_id, p.created_at, u.username, u.email, u.name
        ORDER BY p.created_at DESC
        LIMIT $3 OFFSET $4`,
        [currentUserId, userId, Number(limit), Number(offset)]
      );
      posts = rows;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Calculate if there are more posts to load
    const hasMore = offset + posts.length < total;

    // Calculate current page (1-based)
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      posts: posts.map((post: any) => ({
        id: post.id,
        content: post.content,
        user_id: post.user_id,
        created_at: post.created_at,
        likes_count: Number(post.likes_count),
        user_has_liked: Boolean(post.user_has_liked),
        user: {
          id: post.user_id,
          username: post.username,
          email: post.email,
          name: post.name
        }
      })),
      total,
      hasMore,
      page: currentPage
    };
  }
}

export const postsService = new PostsService();
